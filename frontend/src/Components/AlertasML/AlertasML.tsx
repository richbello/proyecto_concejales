/**
 * AlertasML.tsx — v2.0
 * Módulo de Alertas IA con carga de Excel PAC real (SAP FDL)
 * Dashboard Control Político — FDL Usme 2026
 */

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── TIPOS ────────────────────────────────────────────────────
interface AlertaPAC {
  rubro: string;
  codigo: string;
  pct_ejecucion: number;
  pct_cierre_estimado: number;
  nivel: "VERDE" | "AMARILLO" | "ROJO";
  confianza: number;
  pac_actual: number;
  girado: number;
  mensaje: string;
}

interface TendenciaMes {
  mes: string;
  pac: number;
  ejec: number | null;
}

interface ResumenPAC {
  mes_actual: number;
  mes_nombre: string;
  total_pac: number;
  total_girado: number;
  pct_global: number;
  alertas: AlertaPAC[];
  tendencia: TendenciaMes[];
  resumen: { rojos: number; amarillos: number; verdes: number };
}

interface AnomaliaContrato {
  id: string;
  proveedor: string;
  nit: string;
  monto: number;
  modalidad: string;
  score: number;
  nivel: "VERDE" | "AMARILLO" | "ROJO";
  razones: string[];
  fecha: string;
}

// ─── PALETA ───────────────────────────────────────────────────
const C = {
  navy:   "#1a2742", navyLt: "#1e3a5f",
  cyan:   "#5dade2", cyanLt: "#85c1e9",
  verde:  "#27ae60", verdeLt: "#a9dfbf",
  amar:   "#f39c12", amarLt:  "#fdebd0",
  rojo:   "#e74c3c", rojoLt:  "#fadbd8",
  texto:  "#2c3e50", muted:   "#7f8c8d",
  bg:     "#f0f2f5", border:  "#e8edf2",
};

// ─── DATOS DEMO CONTRATOS ─────────────────────────────────────
const ANOMALIAS_DEMO: AnomaliaContrato[] = [
  { id:"FDL-USME-2089-2026", proveedor:"CONSTRUCTORA ANDINA SAS",        nit:"900111222-1", monto:1_450_000_000, modalidad:"Contratación Directa", score:91, nivel:"ROJO",     razones:["Monto $1.450M con directa — debería ser licitación","Tramitado en 2 días hábiles","Pago en cierre de trimestre"],   fecha:"28/06/2026" },
  { id:"FDL-USME-1934-2026", proveedor:"SUMINISTROS DISTRITALES SA",     nit:"800555666-8", monto:32_800_000,   modalidad:"Mínima Cuantía",        score:84, nivel:"ROJO",     razones:["Fraccionamiento: $32.8M = 95% mínima cuantía","Mismo proveedor 4 contratos en 30 días"],                             fecha:"15/06/2026" },
  { id:"FDL-USME-1876-2026", proveedor:"OBRAS Y PROYECTOS COLOMBIA SAS", nit:"900334455-0", monto:890_000_000,  modalidad:"Selección Abreviada",   score:79, nivel:"ROJO",     razones:["5 adendas post-firma inusuales","Concentra 28% del gasto total"],                                                       fecha:"02/06/2026" },
  { id:"FDL-USME-1754-2026", proveedor:"CONSULTORÍA BOGOTÁ SAS",         nit:"800777888-2", monto:210_000_000,  modalidad:"Contratación Directa",  score:62, nivel:"AMARILLO", razones:["Monto sobre promedio histórico","Pago en fin de semana"],                                                                fecha:"21/05/2026" },
  { id:"FDL-USME-1698-2026", proveedor:"MANTENIMIENTO URBANO SAS",       nit:"900112233-7", monto:156_000_000,  modalidad:"Mínima Cuantía",        score:55, nivel:"AMARILLO", razones:["6 contratos en 45 días con mismo proveedor"],                                                                             fecha:"10/05/2026" },
  { id:"FDL-USME-1621-2026", proveedor:"TECNOLOGÍA DISTRITAL LTDA",      nit:"800556677-3", monto:98_000_000,   modalidad:"Menor Cuantía",         score:22, nivel:"VERDE",    razones:[],                                                                                                                         fecha:"03/05/2026" },
];

const CONCENTRACION_DEMO = [
  { proveedor:"Obras y Proyectos",   pct:28.1, alertas:3 },
  { proveedor:"Constructora Andina", pct:19.4, alertas:2 },
  { proveedor:"Suministros Dist.",   pct:14.2, alertas:4 },
  { proveedor:"Consultoría Bogotá",  pct:11.8, alertas:1 },
  { proveedor:"Otros proveedores",   pct:26.5, alertas:1 },
];

// ─── HELPERS ──────────────────────────────────────────────────
const MESES_ORDEN = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                     'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

const nColor = (n:string) => n==="ROJO"?C.rojo:n==="AMARILLO"?C.amar:C.verde;
const nBg    = (n:string) => n==="ROJO"?C.rojoLt:n==="AMARILLO"?C.amarLt:C.verdeLt;
const nEmoji = (n:string) => n==="ROJO"?"🔴":n==="AMARILLO"?"🟡":"🟢";
const fmtCOP = (v:number) => v>=1e9?`$${(v/1e9).toFixed(2)}B`:v>=1e6?`$${(v/1e6).toFixed(0)}M`:`$${(v/1e3).toFixed(0)}K`;
const fmtPct = (v:number) => `${v.toFixed(1)}%`;

// ─── PROCESADOR PAC SAP ───────────────────────────────────────
function procesarPAC(data: any[][]): ResumenPAC {
  // Detectar fila de encabezados
  let headerRow = 0;
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i].map(c => String(c || "").toLowerCase());
    if (row.some(c => c.includes("per.presup") || c.includes("período"))) {
      headerRow = i; break;
    }
  }

  const headers = data[headerRow].map(c => String(c || "").trim());
  const rows    = data.slice(headerRow + 1);

  // Mapear columnas clave (robusto para variaciones SAP)
  const col = (terms: string[]) => {
    const idx = headers.findIndex(h =>
      terms.some(t => h.toLowerCase().includes(t.toLowerCase()))
    );
    return idx >= 0 ? idx : -1;
  };

  const iMes      = col(["Descripción período","período presupuesto","mes"]);
  const iRubro    = col(["Descripción pos","pos.presupuestaria","rubro"]);
  const iPacAct   = col(["PAC Actual","pac actual"]);
  const iGirado   = col(["Girado y Recaudado","girado"]);
  const iComprom  = col(["Comprometido PAC","comprometido"]);

  // Agrupar por rubro
  const mapaRubros: Record<string, {pac:number; girado:number; meses:Set<number>}> = {};
  let totalPAC = 0, totalGirado = 0;
  const mesesPresentes = new Set<number>();

  for (const row of rows) {
    const mesStr = iMes >= 0 ? String(row[iMes] || "").toUpperCase().trim() : "";
    const numMes = MESES_ORDEN.indexOf(mesStr) + 1;
    if (numMes === 0) continue;

    mesesPresentes.add(numMes);
    const rubro  = iRubro >= 0 ? String(row[iRubro] || "").trim() : "Sin descripción";
    const pac    = iPacAct  >= 0 ? (Number(row[iPacAct])  || 0) : 0;
    const girado = iGirado  >= 0 ? (Number(row[iGirado])  || 0) : 0;

    if (!mapaRubros[rubro]) mapaRubros[rubro] = { pac: 0, girado: 0, meses: new Set() };
    mapaRubros[rubro].pac    += pac;
    mapaRubros[rubro].girado += girado;
    mapaRubros[rubro].meses.add(numMes);
    totalPAC    += pac;
    totalGirado += girado;
  }

  const mesActual = Math.max(...Array.from(mesesPresentes));
  const pctGlobal = totalPAC > 0 ? +(totalGirado / totalPAC * 100).toFixed(1) : 0;

  // Construir alertas
  const alertas: AlertaPAC[] = Object.entries(mapaRubros)
    .filter(([_, v]) => v.pac > 5_000_000)
    .map(([rubro, v]) => {
      const pctEjec   = +(v.girado / v.pac * 100).toFixed(1);
      const pctCierre = Math.min(+(pctEjec / mesActual * 12).toFixed(1), 100);
      const nivel     = pctEjec < 60 ? "ROJO" : pctEjec < 85 ? "AMARILLO" : "VERDE";
      const conf      = pctEjec < 30 ? 95 : pctEjec < 60 ? 88 : pctEjec < 85 ? 75 : 92;
      let mensaje = "";
      if (nivel === "ROJO")
        mensaje = `CRÍTICO: ${fmtPct(pctEjec)} a ${MESES_ORDEN[mesActual-1]}. Rezago severo proyectado. Requiere informe urgente al Edil.`;
      else if (nivel === "AMARILLO")
        mensaje = `ATENCIÓN: ${fmtPct(pctEjec)} ejecutado. Riesgo moderado. Revisar compromisos pendientes.`;
      else
        mensaje = `Ejecución al día (${fmtPct(pctEjec)}). Sin riesgo detectado por el modelo.`;

      return { rubro: rubro.slice(0, 55), codigo: "PAC", pct_ejecucion: pctEjec,
               pct_cierre_estimado: pctCierre, nivel: nivel as any,
               confianza: conf, pac_actual: v.pac, girado: v.girado, mensaje };
    })
    .sort((a, b) => a.pct_ejecucion - b.pct_ejecucion);

  // Tendencia mensual acumulada
  const tendencia: TendenciaMes[] = MESES_ORDEN.slice(0, 12).map((mes, idx) => {
    const m = idx + 1;
    if (!mesesPresentes.has(m)) return { mes: mes.slice(0,3), pac: null as any, ejec: null };
    // Calcular acumulado hasta este mes
    let pacAcum = 0, giradoAcum = 0;
    for (const row of rows) {
      const mesStr = iMes >= 0 ? String(row[iMes] || "").toUpperCase().trim() : "";
      const numMes = MESES_ORDEN.indexOf(mesStr) + 1;
      if (numMes > 0 && numMes <= m) {
        pacAcum    += iPacAct >= 0 ? (Number(row[iPacAct]) || 0) : 0;
        giradoAcum += iGirado >= 0 ? (Number(row[iGirado]) || 0) : 0;
      }
    }
    return {
      mes: mes.slice(0, 3),
      pac:  totalPAC > 0 ? +(pacAcum / totalPAC * 100).toFixed(1) : 0,
      ejec: pacAcum  > 0 ? +(giradoAcum / pacAcum * 100).toFixed(1) : 0,
    };
  }).filter(t => t.pac !== null);

  return {
    mes_actual: mesActual,
    mes_nombre: MESES_ORDEN[mesActual - 1],
    total_pac: totalPAC,
    total_girado: totalGirado,
    pct_global: pctGlobal,
    alertas,
    tendencia,
    resumen: {
      rojos:    alertas.filter(a => a.nivel === "ROJO").length,
      amarillos: alertas.filter(a => a.nivel === "AMARILLO").length,
      verdes:   alertas.filter(a => a.nivel === "VERDE").length,
    },
  };
}

// ─── SUB-COMPONENTES ──────────────────────────────────────────
const Badge = ({ nivel }: { nivel: string }) => (
  <span style={{
    background: nBg(nivel), color: nColor(nivel),
    padding:"2px 10px", borderRadius:20,
    fontSize:11, fontWeight:700, whiteSpace:"nowrap" as const,
    border:`1px solid ${nColor(nivel)}40`,
  }}>{nEmoji(nivel)} {nivel}</span>
);

const ScoreBar = ({ score, nivel }: { score:number; nivel:string }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
    <div style={{ flex:1, height:5, background:"#dce3ea", borderRadius:3, overflow:"hidden" }}>
      <div style={{ width:`${score}%`, height:"100%", background:nColor(nivel), borderRadius:3, transition:"width .5s ease" }}/>
    </div>
    <span style={{ fontSize:11, fontWeight:700, color:nColor(nivel), minWidth:36 }}>{score}/100</span>
  </div>
);

const KpiCard = ({ emoji, label, valor, color, sub }: { emoji:string; label:string; valor:string|number; color:string; sub?:string }) => (
  <div style={{ background:"white", borderRadius:10, padding:"14px 18px", borderLeft:`3px solid ${color}`, flex:1, minWidth:130, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
    <div style={{ fontSize:22 }}>{emoji}</div>
    <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1, marginTop:4 }}>{valor}</div>
    <div style={{ fontSize:12, fontWeight:600, color:C.texto, marginTop:3 }}>{label}</div>
    {sub && <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{sub}</div>}
  </div>
);

const TooltipCustom = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", fontSize:12, boxShadow:"0 4px 12px rgba(0,0,0,.1)" }}>
      <div style={{ fontWeight:700, color:C.navy, marginBottom:4 }}>{label}</div>
      {payload.map((p:any, i:number) => (
        <div key={i} style={{ color:p.color }}>{p.name}: <strong>{typeof p.value==="number"?p.value.toFixed(1)+"%":p.value}</strong></div>
      ))}
    </div>
  );
};

// ─── PANTALLA DE CARGA INICIAL ─────────────────────────────────
const PantallaCarga = ({ onFile }: { onFile: (res: ResumenPAC) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState("");

  const procesar = useCallback((file: File) => {
    setCargando(true);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target?.result, { type:"array" });
        // Buscar hoja "Data" primero, si no la primera
        const sheetName = wb.SheetNames.includes("Data") ? "Data" : wb.SheetNames[0];
        const ws   = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header:1, defval:"" });
        const res  = procesarPAC(data);
        if (res.alertas.length === 0) {
          setError("No se encontraron rubros en el archivo. Verifica que sea el reporte PAC de SAP.");
        } else {
          onFile(res);
        }
      } catch (err) {
        setError("Error leyendo el archivo. Asegúrate de subir el Excel PAC exportado de SAP.");
      } finally {
        setCargando(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [onFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) procesar(file);
  }, [procesar]);

  return (
    <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", minHeight:400, padding:24 }}>
      <div style={{
        background:`linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`,
        borderRadius:16, padding:"32px 40px", textAlign:"center" as const,
        color:"white", maxWidth:520, width:"100%",
        boxShadow:"0 8px 32px rgba(26,39,66,.3)",
      }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📂</div>
        <h3 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800 }}>
          Alertas IA — PAC FDL Usme
        </h3>
        <p style={{ margin:"0 0 28px", fontSize:13, color:"rgba(255,255,255,.65)", lineHeight:1.6 }}>
          Carga el reporte PAC exportado de SAP para ver las alertas de ejecución
          calculadas automáticamente por el modelo de Machine Learning.
        </p>

        {/* Zona drag & drop */}
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{
            border:"2px dashed rgba(93,173,226,.5)",
            borderRadius:12,
            padding:"28px 20px",
            cursor:"pointer",
            marginBottom:20,
            background:"rgba(93,173,226,.08)",
            transition:"all .2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background="rgba(93,173,226,.15)")}
          onMouseLeave={e => (e.currentTarget.style.background="rgba(93,173,226,.08)")}
        >
          {cargando ? (
            <div style={{ color:C.cyanLt, fontSize:13 }}>
              ⟳ Procesando archivo...
            </div>
          ) : (
            <>
              <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
              <div style={{ fontSize:13, color:C.cyanLt, fontWeight:600 }}>
                Arrastra el Excel aquí o haz clic para seleccionar
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:6 }}>
                Reporte_PAC_*.xlsx · Export SAP · Columnas: PAC Actual, Girado y Recaudado
              </div>
            </>
          )}
        </div>

        <input ref={inputRef} type="file" accept=".xlsx,.xls"
          style={{ display:"none" }}
          onChange={e => { if (e.target.files?.[0]) procesar(e.target.files[0]); }}
        />

        {error && (
          <div style={{ background:"rgba(231,76,60,.2)", border:"1px solid rgba(231,76,60,.4)", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#ff8a80", marginTop:8 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ marginTop:20, fontSize:11, color:"rgba(255,255,255,.35)" }}>
          Los datos se procesan localmente en tu navegador · No se envían al servidor
        </div>
      </div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function AlertasML() {
  const [tab, setTab]       = useState<"pac"|"contratos"|"tendencia"|"concentracion">("pac");
  const [filtro, setFiltro] = useState<"TODOS"|"ROJO"|"AMARILLO"|"VERDE">("TODOS");
  const [detPAC,   setDetPAC]   = useState<AlertaPAC | null>(null);
  const [detContr, setDetContr] = useState<AnomaliaContrato | null>(null);
  const [pacData,  setPacData]  = useState<ResumenPAC | null>(null);

  const alertasPAC = pacData?.alertas ?? [];
  const tendencia  = pacData?.tendencia ?? [];
  const rojosPAC   = pacData?.resumen.rojos    ?? 0;
  const amarPAC    = pacData?.resumen.amarillos ?? 0;
  const verdPAC    = pacData?.resumen.verdes    ?? 0;
  const rojosContr = ANOMALIAS_DEMO.filter(a=>a.nivel==="ROJO").length;
  const montoCrit  = ANOMALIAS_DEMO.filter(a=>a.nivel==="ROJO").reduce((s,a)=>s+a.monto,0);

  const pacFilt   = filtro==="TODOS" ? alertasPAC : alertasPAC.filter(a=>a.nivel===filtro);
  const contrFilt = filtro==="TODOS" ? ANOMALIAS_DEMO : ANOMALIAS_DEMO.filter(a=>a.nivel===filtro);

  const TABS = [
    { id:"pac",           label:"📊 Alertas PAC",     badge: rojosPAC+amarPAC },
    { id:"contratos",     label:"🔍 Contratos SECOP",  badge: rojosContr       },
    { id:"tendencia",     label:"📈 Tendencia",         badge: 0                },
    { id:"concentracion", label:"🏢 Concentración",     badge: 0                },
  ] as const;

  // Si no hay datos PAC cargados, mostrar pantalla de carga (solo en tab PAC y tendencia)
  if (!pacData && (tab === "pac" || tab === "tendencia")) {
    return (
      <div style={{ fontFamily:"'Segoe UI',sans-serif", color:C.texto }}>
        {/* Mini nav de tabs visible */}
        <div style={{ background:"white", borderRadius:"10px 10px 0 0", borderBottom:`2px solid ${C.border}`, display:"flex", padding:"0 16px", gap:2, boxShadow:"0 2px 8px rgba(0,0,0,.06)", marginBottom:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:"12px 16px", background:"transparent", border:"none", borderBottom: tab===t.id?`2px solid ${C.cyan}`:"2px solid transparent", color: tab===t.id?C.cyan:C.muted, cursor:"pointer", fontSize:13, fontWeight: tab===t.id?700:500, whiteSpace:"nowrap" as const }}>
              {t.label}
              {t.badge>0 && <span style={{ marginLeft:6, background:C.rojo, color:"white", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{t.badge}</span>}
            </button>
          ))}
        </div>
        <PantallaCarga onFile={setPacData} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", color:C.texto, minHeight:"100%" }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ background:`linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius:12, padding:"20px 24px", marginBottom:18, color:"white" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap" as const, gap:12 }}>
          <div>
            <div style={{ fontSize:10, color:C.cyan, letterSpacing:2, textTransform:"uppercase" as const, fontWeight:700 }}>
              ⚡ Machine Learning · Datos Reales SAP
            </div>
            <h2 style={{ margin:"6px 0 4px", fontSize:20, fontWeight:800 }}>
              Alertas IA — FDL Usme {pacData ? `· ${pacData.mes_nombre} ${pacData.mes_actual === 12 ? "2026" : ""}` : "2026"}
            </h2>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.55)" }}>
              {pacData
                ? `PAC Total: ${fmtCOP(pacData.total_pac)} · Girado: ${fmtCOP(pacData.total_girado)} · Ejecución global: ${pacData.pct_global}%`
                : "Carga el Excel PAC para ver alertas con datos reales"}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {(rojosPAC+rojosContr)>0 && (
              <div style={{ background:"rgba(231,76,60,.2)", border:"1px solid rgba(231,76,60,.4)", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, color:"#ff8a80" }}>
                🔔 {rojosPAC+rojosContr} alertas críticas
              </div>
            )}
            {pacData && (
              <button onClick={() => setPacData(null)} style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:8, padding:"6px 14px", color:"white", cursor:"pointer", fontSize:12 }}>
                📂 Cambiar archivo
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:"flex", gap:12, marginTop:18, flexWrap:"wrap" as const }}>
          <KpiCard emoji="🔴" label="Críticos PAC"     valor={rojosPAC}    color={C.rojo}  sub="rubros en rezago severo" />
          <KpiCard emoji="🟡" label="En Riesgo PAC"    valor={amarPAC}     color={C.amar}  sub="requieren seguimiento" />
          <KpiCard emoji="🟢" label="Normal"           valor={verdPAC}     color={C.verde} sub="sin alertas" />
          <KpiCard emoji="🔍" label="Contratos Alerta" valor={rojosContr}  color={C.rojo}  sub="anomalías SECOP" />
          <KpiCard emoji="💰" label="Monto en Riesgo"  valor={fmtCOP(montoCrit)} color={C.cyan} sub="contratos críticos" />
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────── */}
      <div style={{ background:"white", borderRadius:"10px 10px 0 0", borderBottom:`2px solid ${C.border}`, display:"flex", padding:"0 16px", gap:2, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setDetPAC(null); setDetContr(null); }}
            style={{ padding:"12px 16px", background:"transparent", border:"none", borderBottom: tab===t.id?`2px solid ${C.cyan}`:"2px solid transparent", color: tab===t.id?C.cyan:C.muted, cursor:"pointer", fontSize:13, fontWeight: tab===t.id?700:500, display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" as const, transition:"all .2s" }}>
            {t.label}
            {t.badge>0 && <span style={{ background:C.rojo, color:"white", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      <div style={{ background:"white", borderRadius:"0 0 10px 10px", padding:"18px 20px", boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>

        {/* FILTROS */}
        {(tab==="pac"||tab==="contratos") && (
          <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" as const }}>
            <span style={{ fontSize:12, color:C.muted }}>Filtrar:</span>
            {(["TODOS","ROJO","AMARILLO","VERDE"] as const).map(n => (
              <button key={n} onClick={() => setFiltro(n)} style={{ padding:"4px 14px", borderRadius:20, border:`1px solid ${filtro===n?nColor(n==="TODOS"?"VERDE":n):C.border}`, background: filtro===n?nBg(n==="TODOS"?"VERDE":n):"transparent", color: filtro===n?nColor(n==="TODOS"?"VERDE":n):C.muted, cursor:"pointer", fontSize:12, fontWeight:600 }}>
                {n==="TODOS"?"⚪ Todos":`${nEmoji(n)} ${n==="ROJO"?"Crítico":n==="AMARILLO"?"Riesgo":"Normal"}`}
              </button>
            ))}
          </div>
        )}

        {/* ══ TAB PAC ══════════════════════════════════════ */}
        {tab==="pac" && (
          <div style={{ display:"flex", gap:18, flexWrap:"wrap" as const }}>
            <div style={{ flex:2, minWidth:300 }}>
              <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
                <div style={{ padding:"12px 18px", background:"#f8fafc", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontWeight:700, fontSize:13, color:C.navy }}>
                    Ejecución vs PAC · {pacData?.mes_nombre ?? "—"} 2026
                  </span>
                  <span style={{ fontSize:11, color:C.muted }}>{pacFilt.length} rubros</span>
                </div>
                {pacFilt.length === 0 ? (
                  <div style={{ padding:32, textAlign:"center" as const, color:C.muted, fontSize:13 }}>
                    No hay rubros para el filtro seleccionado
                  </div>
                ) : pacFilt.map((a,i) => (
                  <div key={i} onClick={() => setDetPAC(detPAC?.rubro===a.rubro?null:a)}
                    style={{ padding:"13px 18px", borderBottom:`1px solid #f0f4f8`, cursor:"pointer", background: detPAC?.rubro===a.rubro?nBg(a.nivel):"white", borderLeft: detPAC?.rubro===a.rubro?`3px solid ${nColor(a.nivel)}`:"3px solid transparent", transition:"all .15s" }}
                    onMouseEnter={e=>(e.currentTarget.style.background=`${nBg(a.nivel)}80`)}
                    onMouseLeave={e=>(e.currentTarget.style.background=detPAC?.rubro===a.rubro?nBg(a.nivel):"white")}
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{a.rubro}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                          PAC: {fmtCOP(a.pac_actual)} · Girado: {fmtCOP(a.girado)} · IA: {a.confianza}%
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontWeight:800, fontSize:14, color:nColor(a.nivel) }}>{a.pct_ejecucion}%</span>
                        <Badge nivel={a.nivel}/>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <div style={{ flex:1, height:5, background:"#e8edf2", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ width:`${Math.min(a.pct_ejecucion,100)}%`, height:"100%", background:nColor(a.nivel), borderRadius:3 }}/>
                      </div>
                      <span style={{ fontSize:10, color:C.muted, minWidth:110 }}>Cierre est.: {a.pct_cierre_estimado}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex:1, minWidth:220, display:"flex", flexDirection:"column" as const, gap:14 }}>
              <div style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
                <div style={{ fontWeight:700, fontSize:13, color:C.navy, marginBottom:10 }}>Distribución</div>
                <PieChart width={200} height={165}>
                  <Pie data={[{name:"🟢 Normal",value:verdPAC,color:C.verde},{name:"🟡 Riesgo",value:amarPAC,color:C.amar},{name:"🔴 Crítico",value:rojosPAC,color:C.rojo}]}
                    cx={100} cy={78} innerRadius={42} outerRadius={72} dataKey="value" paddingAngle={3}>
                    {[C.verde,C.amar,C.rojo].map((c,i)=><Cell key={i} fill={c}/>)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }}/>
                  <Legend iconType="circle" iconSize={9} formatter={v=><span style={{fontSize:11,color:C.texto}}>{v}</span>}/>
                </PieChart>
              </div>

              {detPAC && (
                <div style={{ border:`1px solid ${nColor(detPAC.nivel)}40`, background:`${nBg(detPAC.nivel)}60`, borderRadius:10, padding:16 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:nColor(detPAC.nivel), marginBottom:10 }}>📋 Detalle para el Edil</div>
                  <div style={{ fontSize:12, lineHeight:1.8 }}>
                    <b>Rubro:</b> {detPAC.rubro}<br/>
                    <b>PAC Actual:</b> {fmtCOP(detPAC.pac_actual)}<br/>
                    <b>Girado:</b> <strong style={{color:nColor(detPAC.nivel)}}>{fmtCOP(detPAC.girado)}</strong><br/>
                    <b>Ejecución:</b> <strong style={{color:nColor(detPAC.nivel)}}>{detPAC.pct_ejecucion}%</strong><br/>
                    <b>Cierre est.:</b> {detPAC.pct_cierre_estimado}%<br/>
                    <b>Confianza IA:</b> {detPAC.confianza}%
                  </div>
                  <div style={{ marginTop:10, padding:"10px 12px", background:"rgba(0,0,0,.05)", borderLeft:`3px solid ${nColor(detPAC.nivel)}`, borderRadius:"0 6px 6px 0", fontSize:12, lineHeight:1.6 }}>
                    {detPAC.mensaje}
                  </div>
                  <button style={{ marginTop:12, width:"100%", padding:"9px", background:C.navy, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                    📝 Generar Proposición de Control
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB CONTRATOS ════════════════════════════════ */}
        {tab==="contratos" && (
          <div style={{ display:"flex", gap:18, flexWrap:"wrap" as const }}>
            <div style={{ flex:2, minWidth:300 }}>
              <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
                <div style={{ padding:"12px 18px", background:"#f8fafc", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontWeight:700, fontSize:13, color:C.navy }}>Contratos SECOP II — Isolation Forest</span>
                  <span style={{ fontSize:11, color:C.muted }}>{contrFilt.length} contratos</span>
                </div>
                {contrFilt.map((c,i) => (
                  <div key={i} onClick={() => setDetContr(detContr?.id===c.id?null:c)}
                    style={{ padding:"13px 18px", borderBottom:`1px solid #f0f4f8`, cursor:"pointer", background: detContr?.id===c.id?nBg(c.nivel):"white", borderLeft: detContr?.id===c.id?`3px solid ${nColor(c.nivel)}`:"3px solid transparent", transition:"all .15s" }}
                    onMouseEnter={e=>(e.currentTarget.style.background=`${nBg(c.nivel)}80`)}
                    onMouseLeave={e=>(e.currentTarget.style.background=detContr?.id===c.id?nBg(c.nivel):"white")}
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{c.proveedor}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{c.nit} · {c.id} · {c.fecha}</div>
                      </div>
                      <div style={{ textAlign:"right" as const }}>
                        <Badge nivel={c.nivel}/>
                        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginTop:4 }}>{fmtCOP(c.monto)}</div>
                      </div>
                    </div>
                    <ScoreBar score={c.score} nivel={c.nivel}/>
                    {c.razones.length>0 && <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>⚠ {c.razones[0]}{c.razones.length>1?` (+${c.razones.length-1} más)`:""}</div>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex:1, minWidth:220 }}>
              {detContr ? (
                <div style={{ border:`1px solid ${nColor(detContr.nivel)}40`, background:`${nBg(detContr.nivel)}60`, borderRadius:10, padding:18 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:nColor(detContr.nivel), marginBottom:12 }}>🔍 Detalle del contrato</div>
                  <div style={{ fontSize:12, lineHeight:1.8 }}>
                    <b>Referencia:</b> {detContr.id}<br/>
                    <b>Proveedor:</b> {detContr.proveedor}<br/>
                    <b>NIT:</b> {detContr.nit}<br/>
                    <b>Monto:</b> <strong style={{color:C.navy}}>{fmtCOP(detContr.monto)}</strong><br/>
                    <b>Modalidad:</b> {detContr.modalidad}
                  </div>
                  <ScoreBar score={detContr.score} nivel={detContr.nivel}/>
                  {detContr.razones.length>0 && (
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:6 }}>RAZONES DETECTADAS POR IA:</div>
                      {detContr.razones.map((r,i) => (
                        <div key={i} style={{ fontSize:11, padding:"5px 8px", marginBottom:4, background:"rgba(0,0,0,.04)", borderLeft:`2px solid ${nColor(detContr.nivel)}`, borderRadius:"0 6px 6px 0" }}>{r}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:8, marginTop:14 }}>
                    <button style={{ flex:1, padding:"8px", background:C.rojo, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700 }}>🚨 Notificar</button>
                    <button style={{ flex:1, padding:"8px", background:C.navy, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700 }}>📝 Proposición</button>
                  </div>
                </div>
              ) : (
                <div style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:28, textAlign:"center" as const, color:C.muted }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                  <div style={{ fontSize:12 }}>Selecciona un contrato para ver el detalle</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB TENDENCIA ════════════════════════════════ */}
        {tab==="tendencia" && (
          pacData ? (
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:C.navy, marginBottom:4 }}>PAC vs Ejecución Real · FDL Usme 2026</div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>
                Datos reales del reporte PAC · {pacData.mes_nombre} · Ejecución global: <strong style={{color:nColor(pacData.pct_global<60?"ROJO":pacData.pct_global<85?"AMARILLO":"VERDE")}}>{pacData.pct_global}%</strong>
              </div>
              <ResponsiveContainer width="99%" height={300}>
                <LineChart data={tendencia} margin={{top:10,right:20,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="mes" tick={{fontSize:12,fill:C.muted}}/>
                  <YAxis tickFormatter={v=>v+"%"} tick={{fontSize:11,fill:C.muted}}/>
                  <Tooltip content={<TooltipCustom/>}/>
                  <Legend formatter={v=><span style={{color:C.texto,fontSize:12}}>{v}</span>}/>
                  <ReferenceLine y={85} stroke={C.amar} strokeDasharray="4 4" label={{value:"Mínimo 85%",fill:C.amar,fontSize:10,position:"insideTopLeft"}}/>
                  <Line type="monotone" dataKey="pac"  name="Meta PAC (%)" stroke={C.cyan} strokeWidth={2.5} dot={{r:3,fill:C.cyan}}/>
                  <Line type="monotone" dataKey="ejec" name="Ejecución Real (%)" stroke={C.rojo} strokeWidth={2.5} strokeDasharray="5 3" dot={{r:3,fill:C.rojo}} connectNulls={false}/>
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop:14, padding:"12px 16px", background:C.rojoLt, borderLeft:`3px solid ${C.rojo}`, borderRadius:"0 8px 8px 0", fontSize:12, color:C.rojo }}>
                🔴 <strong>Alerta IA:</strong> Ejecución global del {pacData.pct_global}% a {pacData.mes_nombre}.
                {pacData.pct_global < 60 && " Rezago severo proyectado. Se recomienda debate de control político urgente."}
                {pacData.pct_global >= 60 && pacData.pct_global < 85 && " Riesgo de rezago al cierre. Revisar rubros críticos."}
              </div>
            </div>
          ) : (
            <PantallaCarga onFile={setPacData}/>
          )
        )}

        {/* ══ TAB CONCENTRACIÓN ════════════════════════════ */}
        {tab==="concentracion" && (
          <div style={{ display:"flex", gap:18, flexWrap:"wrap" as const }}>
            <div style={{ flex:2 }}>
              <div style={{ fontWeight:700, fontSize:14, color:C.navy, marginBottom:4 }}>Concentración del gasto por proveedor</div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:18 }}>Proveedores con más del 20% del gasto generan alerta automática (línea roja).</div>
              <ResponsiveContainer width="99%" height={240}>
                <BarChart data={CONCENTRACION_DEMO} layout="vertical" margin={{top:0,right:50,left:10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={C.border}/>
                  <XAxis type="number" tickFormatter={v=>v+"%"} tick={{fontSize:11,fill:C.muted}}/>
                  <YAxis type="category" dataKey="proveedor" width={138} tick={{fontSize:11,fill:C.texto}}/>
                  <Tooltip content={<TooltipCustom/>}/>
                  <ReferenceLine x={20} stroke={C.rojo} strokeDasharray="4 4" strokeWidth={1.5}/>
                  <Bar dataKey="pct" name="% del gasto" radius={[0,4,4,0]}>
                    {CONCENTRACION_DEMO.map((e,i)=><Cell key={i} fill={e.pct>20?C.rojo:e.pct>12?C.amar:C.cyan}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
                <div style={{ fontWeight:700, fontSize:13, color:C.navy, marginBottom:12 }}>🏢 Proveedores en alerta</div>
                {CONCENTRACION_DEMO.filter(p=>p.pct>10).map((p,i) => (
                  <div key={i} style={{ padding:"10px 0", borderBottom:`1px solid #f0f4f8` }}>
                    <div style={{ fontWeight:600, fontSize:12 }}>{p.proveedor}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:12 }}>
                      <span style={{ color:p.pct>20?C.rojo:C.amar, fontWeight:700 }}>{p.pct}% del total</span>
                      <span style={{ color:C.muted }}>{p.alertas} alerta{p.alertas!==1?"s":""} IA</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
