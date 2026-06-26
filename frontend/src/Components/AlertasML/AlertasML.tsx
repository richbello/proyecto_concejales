import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import GeneradorProposicion from "./GeneradorProposicion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const C = {
  navy:   "#1a2742", navyLt:  "#1e3a5f",
  cyan:   "#5dade2", cyanLt:  "#85c1e9",
  verde:  "#27ae60", verdeLt: "#a9dfbf",
  amar:   "#f39c12", amarLt:  "#fdebd0",
  rojo:   "#e74c3c", rojoLt:  "#fadbd8",
  texto:  "#2c3e50", muted:   "#7f8c8d",
  bg:     "#f0f2f5", border:  "#e8edf2",
};

const nColor = (n:string) => n==="ROJO"?C.rojo:n==="AMARILLO"?C.amar:C.verde;
const nBg    = (n:string) => n==="ROJO"?C.rojoLt:n==="AMARILLO"?C.amarLt:C.verdeLt;
const nEmoji = (n:string) => n==="ROJO"?"🔴":n==="AMARILLO"?"🟡":"🟢";
const fmtCOP = (v:number) => v>=1e9?`$${(v/1e9).toFixed(2)}B`:v>=1e6?`$${(v/1e6).toFixed(0)}M`:`$${(v/1e3).toFixed(0)}K`;

const MESES_ORDEN = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

interface AlertaPAC { rubro: string; codigo: string; pct_ejecucion: number; pct_cierre_estimado: number; nivel: "VERDE" | "AMARILLO" | "ROJO"; confianza: number; pac_actual: number; girado: number; mensaje: string; }
interface AnomaliaContrato { id: string; proveedor: string; nit: string; monto: number; modalidad: string; score: number; nivel: "VERDE" | "AMARILLO" | "ROJO"; razones: string[]; fecha: string; }
interface ResumenPAC { mes_actual: number; mes_nombre: string; total_pac: number; total_girado: number; pct_global: number; alertas: AlertaPAC[]; tendencia: any[]; resumen: { rojos: number; amarillos: number; verdes: number }; }

function procesarPAC(data: any[][]): ResumenPAC {
  let headerRow = 0;
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i].map(c => String(c || "").toLowerCase());
    if (row.some(c => c.includes("per.presup") || c.includes("período"))) { headerRow = i; break; }
  }

  const headers = data[headerRow].map(c => String(c || "").trim());
  const rows    = data.slice(headerRow + 1);

  const col = (terms: string[]) => {
    const idx = headers.findIndex(h => terms.some(t => h.toLowerCase().includes(t.toLowerCase())));
    return idx >= 0 ? idx : -1;
  };

  const iMes      = col(["Descripción período","período presupuesto","mes"]);
  const iRubro    = col(["Descripción pos","pos.presupuestaria","rubro"]);
  const iPacAct   = col(["PAC Actual","pac actual"]);
  const iGirado   = col(["Girado y Recaudado","girado"]);

  const mapaRubros: Record<string, {pac:number; girado:number}> = {};
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

    if (!mapaRubros[rubro]) mapaRubros[rubro] = { pac: 0, girado: 0 };
    mapaRubros[rubro].pac    += pac;
    mapaRubros[rubro].girado += girado;
    totalPAC    += pac;
    totalGirado += girado;
  }

  const mesActual = Math.max(...Array.from(mesesPresentes));
  const pctGlobal = totalPAC > 0 ? +(totalGirado / totalPAC * 100).toFixed(1) : 0;

  const alertas: AlertaPAC[] = Object.entries(mapaRubros)
    .filter(([_, v]) => v.pac > 5_000_000)
    .map(([rubro, v]) => {
      const pctEjec   = +(v.girado / v.pac * 100).toFixed(1);
      const pctCierre = Math.min(+(pctEjec / mesActual * 12).toFixed(1), 100);
      const nivel     = pctEjec < 60 ? "ROJO" : pctEjec < 85 ? "AMARILLO" : "VERDE";
      const conf      = pctEjec < 30 ? 95 : pctEjec < 60 ? 88 : pctEjec < 85 ? 75 : 92;
      let mensaje = "";
      if (nivel === "ROJO") mensaje = `CRÍTICO: ${pctEjec.toFixed(1)}% a ${MESES_ORDEN[mesActual-1]}. Rezago severo. Requiere informe urgente.`;
      else if (nivel === "AMARILLO") mensaje = `ATENCIÓN: ${pctEjec.toFixed(1)}% ejecutado. Riesgo moderado.`;
      else mensaje = `Ejecución al día (${pctEjec.toFixed(1)}%). Sin riesgo.`;

      return { rubro: rubro.slice(0, 55), codigo: "PAC", pct_ejecucion: pctEjec, pct_cierre_estimado: pctCierre, nivel: nivel as any, confianza: conf, pac_actual: v.pac, girado: v.girado, mensaje };
    })
    .sort((a, b) => a.pct_ejecucion - b.pct_ejecucion);

  const tendencia = MESES_ORDEN.slice(0, 12).map((mes, idx) => {
    const m = idx + 1;
    if (!mesesPresentes.has(m)) return { mes: mes.slice(0,3), pac: null, ejec: null };
    let pacAcum = 0, giradoAcum = 0;
    for (const row of rows) {
      const mesStr = iMes >= 0 ? String(row[iMes] || "").toUpperCase().trim() : "";
      const numMes = MESES_ORDEN.indexOf(mesStr) + 1;
      if (numMes > 0 && numMes <= m) {
        pacAcum    += iPacAct >= 0 ? (Number(row[iPacAct]) || 0) : 0;
        giradoAcum += iGirado >= 0 ? (Number(row[iGirado]) || 0) : 0;
      }
    }
    return { mes: mes.slice(0, 3), pac:  totalPAC > 0 ? +(pacAcum / totalPAC * 100).toFixed(1) : 0, ejec: pacAcum  > 0 ? +(giradoAcum / pacAcum * 100).toFixed(1) : 0 };
  }).filter(t => t.pac !== null);

  return { mes_actual: mesActual, mes_nombre: MESES_ORDEN[mesActual - 1], total_pac: totalPAC, total_girado: totalGirado, pct_global: pctGlobal, alertas, tendencia, resumen: { rojos: alertas.filter(a => a.nivel === "ROJO").length, amarillos: alertas.filter(a => a.nivel === "AMARILLO").length, verdes: alertas.filter(a => a.nivel === "VERDE").length } };
}

const Badge = ({ nivel }: { nivel: string }) => <span style={{ background: nBg(nivel), color: nColor(nivel), padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap" as const, border:`1px solid ${nColor(nivel)}40` }}>{nEmoji(nivel)} {nivel}</span>;
const ScoreBar = ({ score, nivel }: { score:number; nivel:string }) => <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}><div style={{ flex:1, height:5, background:"#dce3ea", borderRadius:3, overflow:"hidden" }}><div style={{ width:`${score}%`, height:"100%", background:nColor(nivel), borderRadius:3, transition:"width .5s ease" }}/></div><span style={{ fontSize:11, fontWeight:700, color:nColor(nivel), minWidth:36 }}>{score}/100</span></div>;
const KpiCard = ({ emoji, label, valor, color, sub }: { emoji:string; label:string; valor:string|number; color:string; sub?:string }) => <div style={{ background:"white", borderRadius:10, padding:"14px 18px", borderLeft:`3px solid ${color}`, flex:1, minWidth:130, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}><div style={{ fontSize:22 }}>{emoji}</div><div style={{ fontSize:26, fontWeight:800, color, lineHeight:1, marginTop:4 }}>{valor}</div><div style={{ fontSize:12, fontWeight:600, color:C.texto, marginTop:3 }}>{label}</div>{sub && <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{sub}</div>}</div>;
const TooltipCustom = ({ active, payload, label }: any) => { if (!active || !payload?.length) return null; return <div style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", fontSize:12, boxShadow:"0 4px 12px rgba(0,0,0,.1)" }}><div style={{ fontWeight:700, color:C.navy, marginBottom:4 }}>{label}</div>{payload.map((p:any, i:number) => <div key={i} style={{ color:p.color }}>{p.name}: <strong>{typeof p.value==="number"?p.value.toFixed(1)+"%":p.value}</strong></div>)}</div>; };

export default function AlertasML() {
  const [tab, setTab]       = useState<"pac"|"contratos"|"tendencia"|"concentracion">("pac");
  const [filtro, setFiltro] = useState<"TODOS"|"ROJO"|"AMARILLO"|"VERDE">("TODOS");
  const [detPAC,   setDetPAC]   = useState<AlertaPAC | null>(null);
  const [pacData,  setPacData]  = useState<ResumenPAC | null>(null);
  const [generadorPAC, setGeneradorPAC] = useState<AlertaPAC | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const procesar = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target?.result, { type:"array" });
        const sheetName = wb.SheetNames.includes("Data") ? "Data" : wb.SheetNames[0];
        const ws   = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header:1, defval:"" });
        const res  = procesarPAC(data);
        setPacData(res);
      } catch (err) {
        alert("Error leyendo el archivo");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const alertasPAC = pacData?.alertas ?? [];
  const rojosPAC   = pacData?.resumen.rojos    ?? 0;
  const amarPAC    = pacData?.resumen.amarillos ?? 0;
  const verdPAC    = pacData?.resumen.verdes    ?? 0;
  const pacFilt   = filtro==="TODOS" ? alertasPAC : alertasPAC.filter(a=>a.nivel===filtro);

  if (!pacData) {
    return (
      <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", minHeight:400, padding:24 }}>
        <div style={{ background:`linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius:16, padding:"32px 40px", textAlign:"center" as const, color:"white", maxWidth:520, width:"100%" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📂</div>
          <h3 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800 }}>Alertas IA — PAC FDL Usme</h3>
          <p style={{ margin:"0 0 28px", fontSize:13, color:"rgba(255,255,255,.65)", lineHeight:1.6 }}>Carga el reporte PAC exportado de SAP</p>
          <div onClick={() => inputRef.current?.click()} style={{ border:"2px dashed rgba(93,173,226,.5)", borderRadius:12, padding:"28px 20px", cursor:"pointer", marginBottom:20, background:"rgba(93,173,226,.08)" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
            <div style={{ fontSize:13, color:C.cyanLt, fontWeight:600 }}>Arrastra el Excel aquí o haz clic para seleccionar</div>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e => { if (e.target.files?.[0]) procesar(e.target.files[0]); }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", color:C.texto, minHeight:"100%" }}>
      <div style={{ background:`linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius:12, padding:"20px 24px", marginBottom:18, color:"white" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap" as const, gap:12 }}>
          <div>
            <div style={{ fontSize:10, color:C.cyan, letterSpacing:2, textTransform:"uppercase" as const, fontWeight:700 }}>⚡ Machine Learning · Datos Reales SAP</div>
            <h2 style={{ margin:"6px 0 4px", fontSize:20, fontWeight:800 }}>Alertas IA — FDL Usme · {pacData.mes_nombre} 2026</h2>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.55)" }}>PAC Total: {fmtCOP(pacData.total_pac)} · Girado: {fmtCOP(pacData.total_girado)} · Ejecución: {pacData.pct_global}%</div>
          </div>
          <button onClick={() => setPacData(null)} style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:8, padding:"6px 14px", color:"white", cursor:"pointer", fontSize:12 }}>📂 Cambiar archivo</button>
        </div>
        <div style={{ display:"flex", gap:12, marginTop:18, flexWrap:"wrap" as const }}>
          <KpiCard emoji="🔴" label="Críticos PAC" valor={rojosPAC} color={C.rojo} sub="rubros en rezago severo" />
          <KpiCard emoji="🟡" label="En Riesgo PAC" valor={amarPAC} color={C.amar} sub="requieren seguimiento" />
          <KpiCard emoji="🟢" label="Normal" valor={verdPAC} color={C.verde} sub="sin alertas" />
          <KpiCard emoji="💰" label="Total PAC" valor={fmtCOP(pacData.total_pac)} color={C.cyan} />
        </div>
      </div>

      <div style={{ background:"white", borderRadius:"10px 10px 0 0", borderBottom:`2px solid ${C.border}`, display:"flex", padding:"0 16px" }}>
        <button onClick={() => { setTab("pac"); setDetPAC(null); }} style={{ padding:"12px 16px", background:"transparent", border:"none", borderBottom: tab==="pac"?`2px solid ${C.cyan}`:"2px solid transparent", color: tab==="pac"?C.cyan:C.muted, cursor:"pointer", fontSize:13, fontWeight: tab==="pac"?700:500 }}>📊 Alertas PAC</button>
      </div>

      <div style={{ background:"white", borderRadius:"0 0 10px 10px", padding:"18px 20px", boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
        <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" as const }}>
          <span style={{ fontSize:12, color:C.muted }}>Filtrar:</span>
          {(["TODOS","ROJO","AMARILLO","VERDE"] as const).map(n => (
            <button key={n} onClick={() => setFiltro(n)} style={{ padding:"4px 14px", borderRadius:20, border:`1px solid ${filtro===n?nColor(n==="TODOS"?"VERDE":n):C.border}`, background: filtro===n?nBg(n==="TODOS"?"VERDE":n):"transparent", color: filtro===n?nColor(n==="TODOS"?"VERDE":n):C.muted, cursor:"pointer", fontSize:12, fontWeight:600 }}>
              {n==="TODOS"?"⚪ Todos":`${nEmoji(n)}`}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", gap:18, flexWrap:"wrap" as const }}>
          <div style={{ flex:2, minWidth:300 }}>
            <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
              {pacFilt.map((a,i) => (
                <div key={i} onClick={() => setDetPAC(detPAC?.rubro===a.rubro?null:a)} style={{ padding:"13px 18px", borderBottom:`1px solid #f0f4f8`, cursor:"pointer", background: detPAC?.rubro===a.rubro?nBg(a.nivel):"white", borderLeft: detPAC?.rubro===a.rubro?`3px solid ${nColor(a.nivel)}`:"3px solid transparent", transition:"all .15s" }} onMouseEnter={e=>(e.currentTarget.style.background=`${nBg(a.nivel)}80`)} onMouseLeave={e=>(e.currentTarget.style.background=detPAC?.rubro===a.rubro?nBg(a.nivel):"white")}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{a.rubro}</div>
                      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>PAC: {fmtCOP(a.pac_actual)} · Girado: {fmtCOP(a.girado)}</div>
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
                    <span style={{ fontSize:10, color:C.muted, minWidth:100 }}>Cierre est.: {a.pct_cierre_estimado}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex:1, minWidth:220 }}>
            {detPAC && (
              <div style={{ border:`1px solid ${nColor(detPAC.nivel)}40`, background:`${nBg(detPAC.nivel)}60`, borderRadius:10, padding:16 }}>
                <div style={{ fontWeight:700, fontSize:13, color:nColor(detPAC.nivel), marginBottom:10 }}>📋 Detalle para el Edil</div>
                <div style={{ fontSize:12, lineHeight:1.8 }}>
                  <b>Rubro:</b> {detPAC.rubro}<br/>
                  <b>PAC:</b> {fmtCOP(detPAC.pac_actual)}<br/>
                  <b>Girado:</b> <strong style={{color:nColor(detPAC.nivel)}}>{fmtCOP(detPAC.girado)}</strong><br/>
                  <b>Ejecución:</b> <strong style={{color:nColor(detPAC.nivel)}}>{detPAC.pct_ejecucion}%</strong>
                </div>
                <div style={{ marginTop:10, padding:"10px 12px", background:"rgba(0,0,0,.05)", borderLeft:`3px solid ${nColor(detPAC.nivel)}`, borderRadius:"0 6px 6px 0", fontSize:12, lineHeight:1.6 }}>
                  {detPAC.mensaje}
                </div>
                <button 
                  onClick={() => setGeneradorPAC(detPAC)}
                  style={{ marginTop:12, width:"100%", padding:"9px", background:C.navy, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                  📝 Generar Proposición de Control
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {generadorPAC && (
        <GeneradorProposicion
          alertaPAC={generadorPAC}
          mesNombre={pacData.mes_nombre}
          totalPAC={pacData.total_pac}
          pctGlobal={pacData.pct_global}
          onCerrar={() => setGeneradorPAC(null)}
        />
      )}
    </div>
  );
}
