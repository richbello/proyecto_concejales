import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import GeneradorProposicion from "./GeneradorProposicion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend, Cell, LabelList
} from "recharts";

const C = {
  navy: "#1a2742", navyLt: "#1e3a5f", cyan: "#5dade2", cyanLt: "#85c1e9",
  verde: "#27ae60", verdeLt: "#a9dfbf", amar: "#f39c12", amarLt: "#fdebd0",
  rojo: "#e74c3c", rojoLt: "#fadbd8", texto: "#2c3e50", muted: "#7f8c8d",
  bg: "#f0f2f5", border: "#e8edf2", white: "#ffffff", azul: "#2980b9"
};

const fmtCOP = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B`
  : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M`
  : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K`
  : `$${v.toFixed(0)}`;

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtPctNum = (v: number) => `${v.toFixed(1)}%`;

const nivelColor = (pct: number) => pct >= 0.85 ? C.verde : pct >= 0.60 ? C.amar : C.rojo;
const nivelBg   = (pct: number) => pct >= 0.85 ? C.verdeLt : pct >= 0.60 ? C.amarLt : C.rojoLt;
const nivelLabel = (pct: number) => pct >= 0.85 ? "VERDE" : pct >= 0.60 ? "AMARILLO" : "ROJO";
const nivelEmoji = (pct: number) => pct >= 0.85 ? "🟢" : pct >= 0.60 ? "🟡" : "🔴";

const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
               "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const MESES_CORTOS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

interface FilaPAC {
  periodo: string;
  pacInicial: number;
  pacReprog: number;
  pacActual: number;
  disponibilidad: number;
  girado: number;
  ejecutado: number;
}

interface DatosPAC {
  consolidado: FilaPAC;
  meses: FilaPAC[];
  rezago: FilaPAC | null;
  pacNoEjec: FilaPAC | null;
  mesActual: string;
  mesActualIdx: number;
}

function parsearArchivo(data: any[][]): DatosPAC {
  let headerRow = 0;
  for (let i = 0; i < Math.min(8, data.length); i++) {
    const row = data[i].map((c: any) => String(c || "").toLowerCase());
    if (row.some(c => c.includes("período") || c.includes("periodo") || c.includes("pac"))) {
      headerRow = i; break;
    }
  }
  const headers = data[headerRow].map((c: any) => String(c || "").trim().toLowerCase());
  const col = (terms: string[]) => headers.findIndex(h => terms.some(t => h.includes(t.toLowerCase())));

  const iPeriodo    = col(["descripción período","descripcion periodo","período presupuesto","periodo"]);
  const iPacInicial = col(["pac inicial"]);
  const iPacReprog  = col(["pac reprogramado","reprogramado"]);
  const iPacActual  = col(["pac actual"]);
  const iComp       = col(["comprometido pac","comprometido"]);
  const iDisp       = col(["disponibilidad pac","disponibilidad"]);
  const iGirado     = col(["girado y recaudado","girado"]);
  const iEjecutado  = col(["ejecutado"]);

  const rows = data.slice(headerRow + 1);
  const parseFila = (row: any[]): FilaPAC => ({
    periodo:        String(row[iPeriodo] ?? "").trim().toUpperCase(),
    pacInicial:     Number(row[iPacInicial]  ?? 0),
    pacReprog:      Number(row[iPacReprog]   ?? 0),
    pacActual:      Number(row[iPacActual]   ?? 0),
    disponibilidad: Number(row[iDisp]        ?? 0),
    girado:         Number(row[iGirado]      ?? 0),
    ejecutado:      Number(row[iEjecutado]   ?? 0),
  });

  let consolidado: FilaPAC | null = null;
  const meses: FilaPAC[] = [];
  let rezago: FilaPAC | null = null;
  let pacNoEjec: FilaPAC | null = null;

  for (const row of rows) {
    const periodo = String(row[iPeriodo] ?? "").trim().toUpperCase();
    if (!periodo) continue;
    const fila = parseFila(row);
    if (periodo.includes("CONSOLIDADO") || periodo === "TOTAL") consolidado = fila;
    else if (MESES.includes(periodo)) meses.push(fila);
    else if (periodo.includes("REZAGO")) rezago = fila;
    else if (periodo.includes("PAC NO")) pacNoEjec = fila;
  }

  const mesActualIdx = meses.length === 0 ? 0 : [...meses].map((m, i) => ({ m, i }))
    .filter(({ m }) => m.girado > 0)
    .reduce((a, b) => b.i > a.i ? b : a, { m: meses[0], i: 0 }).i;

  const mesActual = meses[mesActualIdx]?.periodo ?? "JUNIO";

  return {
    consolidado: consolidado ?? parseFila([]),
    meses,
    rezago,
    pacNoEjec,
    mesActual,
    mesActualIdx
  };
}

/* ─── Componentes de UI ─── */

const KpiCard = ({ emoji, label, valor, color, sub, alerta }: {
  emoji: string; label: string; valor: string | number; color: string; sub?: string; alerta?: boolean;
}) => (
  <div style={{
    background: alerta ? `${color}14` : "white",
    borderRadius: 10, padding: "14px 18px",
    borderLeft: `3px solid ${color}`, flex: 1, minWidth: 140,
    boxShadow: alerta ? `0 2px 12px ${color}30` : "0 2px 8px rgba(0,0,0,.06)"
  }}>
    <div style={{ fontSize: 22 }}>{emoji}</div>
    <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1, marginTop: 4 }}>{valor}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: C.texto, marginTop: 3 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

const SeccionTitulo = ({ titulo, subtitulo, insight }: { titulo: string; subtitulo?: string; insight?: string }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{titulo}</div>
    {subtitulo && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{subtitulo}</div>}
    {insight && (
      <div style={{ marginTop: 8, padding: "8px 12px", background: "#EFF6FF", borderLeft: `3px solid ${C.cyan}`, borderRadius: "0 6px 6px 0", fontSize: 12, color: C.navy, lineHeight: 1.5 }}>
        💡 {insight}
      </div>
    )}
  </div>
);

const AlertaBox = ({ nivel, texto }: { nivel: "ROJO" | "AMARILLO" | "VERDE"; texto: string }) => {
  const color = nivel === "ROJO" ? C.rojo : nivel === "AMARILLO" ? C.amar : C.verde;
  const bg    = nivel === "ROJO" ? C.rojoLt : nivel === "AMARILLO" ? C.amarLt : C.verdeLt;
  const icon  = nivel === "ROJO" ? "🚨" : nivel === "AMARILLO" ? "⚠️" : "✅";
  return (
    <div style={{ background: bg, border: `1px solid ${color}40`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.texto, lineHeight: 1.5, borderLeft: `3px solid ${color}` }}>
      {icon} {texto}
    </div>
  );
};

const TooltipCOP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,.12)" }}>
      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color ?? C.texto, marginBottom: 2 }}>
          {p.name}: <strong>{fmtCOP(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

const TooltipPct = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,.12)" }}>
      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color ?? C.texto, marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === "number" ? fmtPctNum(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ─── COMPONENTE PRINCIPAL ─── */

interface Props { onDataLoad?: (data: DatosPAC) => void; }

export default function AlertasML({ onDataLoad }: Props) {
  const [tab, setTab] = useState<"consolidado" | "meses" | "ritmo" | "tabla">("consolidado");
  const [datos, setDatos] = useState<DatosPAC | null>(null);
  const [generador, setGenerador] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const procesar = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const sheetName = wb.SheetNames.find(s => s.includes("Data (2)") || s.includes("Data(2)")) || wb.SheetNames.find(s => s.includes("Data")) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
        const resumen = parsearArchivo(data);
        setDatos(resumen);
        onDataLoad?.(resumen);
      } catch {
        alert("Error leyendo el archivo Excel");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  /* ── PANTALLA DE CARGA ── */
  if (!datos) {
    return (
      <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", minHeight: 400, padding: 24 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius: 16, padding: "32px 40px", textAlign: "center" as const, color: "white", maxWidth: 540, width: "100%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Alertas PAC FDL — ControlIA</h3>
          <p style={{ margin: "0 0 28px", fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.6 }}>
            Carga el reporte PAC exportado de SAP.<br />
            <span style={{ color: C.cyanLt, fontSize: 11 }}>PAC Inicial · PAC Reprogramado · PAC Actual · Disponibilidad · Girado · EJECUTADO</span>
          </p>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) procesar(f); }}
            style={{ border: "2px dashed rgba(93,173,226,.5)", borderRadius: 12, padding: "28px 20px", cursor: "pointer", marginBottom: 20, background: "rgba(93,173,226,.08)" }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 13, color: C.cyanLt, fontWeight: 600 }}>Arrastra el Excel aquí o haz clic para seleccionar</div>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.[0]) procesar(e.target.files[0]); }} />
        </div>
      </div>
    );
  }

  /* ── CÁLCULOS ANALÍTICOS ── */
  const { consolidado: con, meses, mesActual, mesActualIdx, rezago } = datos;
  const pctGlobal   = con.ejecutado;
  const colorGlobal = nivelColor(pctGlobal);
  const mesesEjec   = meses.filter(m => m.girado > 0);
  const mesesPend   = meses.filter(m => m.girado === 0);

  // Ritmo ideal: a junio (mes 6) debería ir ~50% del año
  const mesNum      = mesActualIdx + 1;
  const ritmoIdeal  = mesNum / 12;
  const brecha      = pctGlobal - ritmoIdeal;

  // Variación PAC (reprogramación neta)
  const variacionPAC = con.pacReprog;
  const pctVariacion = con.pacInicial > 0 ? variacionPAC / con.pacInicial * 100 : 0;

  // Disponibilidad: cuánto queda sin girar del PAC del período ejecutado
  const disponibilidadEjec = mesesEjec.reduce((s, m) => s + m.disponibilidad, 0);

  // Rezago como % del PAC actual total
  const pctRezago = rezago && con.pacActual > 0 ? rezago.pacActual / con.pacActual * 100 : 0;

  // Proyección de cierre: si mantiene ritmo actual
  const proyeccionCierre = mesesPend.length > 0
    ? Math.min((con.girado + mesesPend.reduce((s, m) => s + m.pacActual, 0)) / con.pacActual, 1)
    : pctGlobal;

  // Mes con mayor caída: comparar PAC vs girado absoluto
  const mejorMes = [...mesesEjec].sort((a, b) => b.ejecutado - a.ejecutado)[0];
  const peorMes  = [...mesesEjec].sort((a, b) => a.ejecutado - b.ejecutado)[0];

  /* ── SERIES PARA GRÁFICAS ── */

  // Gráfica 1 — Consolidado: distribución del PAC en bloques
  const datosDistribucion = [
    { name: "Girado", valor: con.girado,         pct: +(pctGlobal * 100).toFixed(1), color: colorGlobal },
    { name: "Disponible período", valor: disponibilidadEjec, pct: +(disponibilidadEjec / con.pacActual * 100).toFixed(1), color: C.amar },
    { name: "PAC pendiente (sem. 2)", valor: mesesPend.reduce((s, m) => s + m.pacActual, 0), pct: +(mesesPend.reduce((s, m) => s + m.pacActual, 0) / con.pacActual * 100).toFixed(1), color: C.cyan },
    ...(rezago ? [{ name: "Rezago", valor: rezago.pacActual, pct: +pctRezago.toFixed(1), color: C.muted }] : []),
  ];

  // Gráfica 2 — Por mes: PAC programado vs girado con % superpuesto
  const datosMeses = meses.map((m, i) => ({
    mes:        MESES_CORTOS[MESES.indexOf(m.periodo)] ?? m.periodo.slice(0, 3),
    periodo:    m.periodo,
    "PAC Programado": +(m.pacActual / 1e6).toFixed(1),
    "Girado":         +(m.girado / 1e6).toFixed(1),
    "Disponible":     +(m.disponibilidad / 1e6).toFixed(1),
    pctEjec:    +(m.ejecutado * 100).toFixed(1),
    nivel:      m.ejecutado,
    ejecutado:  m.ejecutado,
    tieneData:  m.girado > 0,
  }));

  // Gráfica 3 — Ritmo acumulado: girado acumulado vs curva ideal
  let acumGirado = 0;
  let acumPAC    = 0;
  const datosRitmo = meses.map((m, i) => {
    acumGirado += m.girado;
    acumPAC    += m.pacActual;
    const pctAcum   = con.pacActual > 0 ? +(acumGirado / con.pacActual * 100).toFixed(1) : 0;
    const curvaIdeal = +((i + 1) / 12 * 100).toFixed(1);
    return {
      mes:         MESES_CORTOS[MESES.indexOf(m.periodo)] ?? m.periodo.slice(0, 3),
      "% Girado acumulado": m.girado > 0 ? pctAcum : null,
      "Curva ideal (1/12)": curvaIdeal,
      "PAC acumulado": +(acumPAC / 1e6).toFixed(1),
      brecha: m.girado > 0 ? +(pctAcum - curvaIdeal).toFixed(1) : null,
    };
  });

  // Gráfica 4 — Reprogramación mes a mes (variación PAC)
  const datosReprog = meses.map(m => ({
    mes:          MESES_CORTOS[MESES.indexOf(m.periodo)] ?? m.periodo.slice(0, 3),
    "PAC Inicial": +(m.pacInicial / 1e6).toFixed(1),
    "Variación":   +(m.pacReprog / 1e6).toFixed(1),
    "PAC Final":   +(m.pacActual / 1e6).toFixed(1),
    esNegativo:    m.pacReprog < 0,
  }));

  /* ── ALERTAS ANALÍTICAS ── */
  const alertas: { nivel: "ROJO" | "AMARILLO" | "VERDE"; texto: string }[] = [];

  if (brecha < -0.10)
    alertas.push({ nivel: "ROJO", texto: `Ejecución ${fmtPct(pctGlobal)} vs ritmo esperado ${fmtPct(ritmoIdeal)} al mes ${mesNum}. Brecha de ${fmtPctNum(Math.abs(brecha * 100))} — rezago crítico que puede causar pérdida de recursos al cierre.` });
  else if (brecha < 0)
    alertas.push({ nivel: "AMARILLO", texto: `Ejecución ligeramente por debajo del ritmo ideal. Brecha de ${fmtPctNum(Math.abs(brecha * 100))} — monitorear en los próximos meses.` });
  else
    alertas.push({ nivel: "VERDE", texto: `Ejecución adelantada respecto al ritmo ideal del período. Buena gestión de la caja.` });

  if (variacionPAC < -10_000_000)
    alertas.push({ nivel: "ROJO", texto: `Reducción neta de PAC por ${fmtCOP(Math.abs(variacionPAC))} (${Math.abs(pctVariacion).toFixed(1)}% del PAC inicial). Posible recorte de proyectos. Preguntar qué rubros fueron afectados.` });
  else if (variacionPAC > 10_000_000)
    alertas.push({ nivel: "AMARILLO", texto: `Adición de recursos al PAC por ${fmtCOP(variacionPAC)} (${pctVariacion.toFixed(1)}%). Verificar origen y sustento de la reprogramación.` });

  if (pctRezago > 15)
    alertas.push({ nivel: "ROJO", texto: `Rezago representa el ${pctRezago.toFixed(1)}% del PAC total (${rezago ? fmtCOP(rezago.pacActual) : ""}). Compromisos de vigencias anteriores sin girar ponen en riesgo la ejecución del año actual.` });

  if (peorMes && peorMes.ejecutado < 0.50)
    alertas.push({ nivel: "AMARILLO", texto: `${peorMes.periodo} es el mes con menor ejecución (${fmtPct(peorMes.ejecutado)}). PAC: ${fmtCOP(peorMes.pacActual)} · Girado: ${fmtCOP(peorMes.girado)}. Revisar causas del bajo desempeño.` });

  const tabs = [
    { key: "consolidado", label: "📊 Consolidado" },
    { key: "meses",       label: "📅 Por Mes" },
    { key: "ritmo",       label: "📈 Ritmo & Tendencia" },
    { key: "tabla",       label: "📋 Tabla" },
  ] as const;

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", color: C.texto, minHeight: "100%" }}>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius: 12, padding: "20px 24px", marginBottom: 18, color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: C.cyan, letterSpacing: 2, textTransform: "uppercase" as const, fontWeight: 700 }}>⚡ Control Presupuestal · Reporte SAP</div>
            <h2 style={{ margin: "6px 0 4px", fontSize: 20, fontWeight: 800 }}>Control PAC — {mesActual} 2026</h2>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
              PAC Actual: {fmtCOP(con.pacActual)} · Girado: {fmtCOP(con.girado)} · Ejecución global: {fmtPct(pctGlobal)}
            </div>
          </div>
          <button onClick={() => setDatos(null)} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: "6px 14px", color: "white", cursor: "pointer", fontSize: 12 }}>
            📂 Cambiar archivo
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          <KpiCard emoji="💰" label="PAC Actual" valor={fmtCOP(con.pacActual)} color={C.cyan} sub="vigente reprogramado" />
          <KpiCard emoji="✅" label="Girado" valor={fmtCOP(con.girado)} color={colorGlobal} sub={fmtPct(pctGlobal)} alerta={pctGlobal < 0.60} />
          <KpiCard emoji="🔒" label="Disponible" valor={fmtCOP(con.disponibilidad)} color={C.amar} sub="sin girar (período)" />
          <KpiCard emoji="📉" label="Brecha vs ideal" valor={`${brecha >= 0 ? "+" : ""}${(brecha * 100).toFixed(1)}%`} color={brecha >= 0 ? C.verde : C.rojo} sub={`Ideal: ${fmtPct(ritmoIdeal)} · Mes ${mesNum}`} alerta={brecha < -0.05} />
          <KpiCard emoji="🔮" label="Proyección cierre" valor={fmtPct(proyeccionCierre)} color={nivelColor(proyeccionCierre)} sub="si mantiene ritmo actual" />
        </div>
      </div>

      {/* ALERTAS */}
      {alertas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 16 }}>
          {alertas.map((a, i) => <AlertaBox key={i} nivel={a.nivel} texto={a.texto} />)}
        </div>
      )}

      {/* TABS */}
      <div style={{ background: "white", borderRadius: "10px 10px 0 0", borderBottom: `2px solid ${C.border}`, display: "flex", padding: "0 12px", overflowX: "auto" as const }}>
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: "11px 14px", background: "transparent", border: "none", borderBottom: tab === key ? `2px solid ${C.cyan}` : "2px solid transparent", color: tab === key ? C.cyan : C.muted, cursor: "pointer", fontSize: 12, fontWeight: tab === key ? 700 : 500, whiteSpace: "nowrap" as const }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: "0 0 10px 10px", padding: "22px 20px", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>

        {/* ═══════════════════════════════════════
            TAB 1 — CONSOLIDADO
        ═══════════════════════════════════════ */}
        {tab === "consolidado" && (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 28 }}>

            {/* Gráfica 1a: Distribución del PAC total */}
            <div>
              <SeccionTitulo
                titulo="¿En qué está el PAC? — Distribución del presupuesto total"
                subtitulo="Muestra cómo se divide el PAC Actual entre lo ya girado, lo disponible del primer semestre, lo programado para el segundo semestre y el rezago."
                insight={
                  pctRezago > 10
                    ? `El rezago representa el ${pctRezago.toFixed(1)}% del PAC. Esto es recursos de vigencias anteriores que compiten con el presupuesto actual.`
                    : `Del PAC total de ${fmtCOP(con.pacActual)}, el ${fmtPct(pctGlobal)} ya fue girado. El restante ${fmtPct(1 - pctGlobal)} está entre disponibilidad y PAC pendiente del segundo semestre.`
                }
              />
              <ResponsiveContainer width="99%" height={260}>
                <BarChart data={datosDistribucion} layout="vertical" margin={{ left: 10, right: 70, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={C.border} />
                  <XAxis type="number" tickFormatter={fmtCOP} tick={{ fontSize: 10, fill: C.muted }} />
                  <YAxis type="category" dataKey="name" width={155} tick={{ fontSize: 11, fill: C.texto }} />
                  <Tooltip content={<TooltipCOP />} />
                  <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={38}>
                    {datosDistribucion.map((d, i) => <Cell key={i} fill={d.color} />)}
                    <LabelList dataKey="pct" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: C.texto }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfica 1b: Barra de progreso desglosada */}
            <div>
              <SeccionTitulo
                titulo="Termómetro de ejecución anual"
                subtitulo={`A ${mesActual} 2026 — el PAC ideal acumulado al mes ${mesNum} sería ${fmtPct(ritmoIdeal)}`}
              />
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
                {/* Barra de progreso */}
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <div style={{ height: 26, background: "#e8edf2", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(pctGlobal * 100, 100)}%`, height: "100%", background: `linear-gradient(90deg, ${colorGlobal}99, ${colorGlobal})`, borderRadius: 8 }} />
                  </div>
                  {/* Marcador del ritmo ideal */}
                  <div style={{ position: "absolute", top: -4, left: `${Math.min(ritmoIdeal * 100, 100)}%`, transform: "translateX(-50%)" }}>
                    <div style={{ width: 2, height: 34, background: C.navy }} />
                    <div style={{ position: "absolute", top: 36, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" as const, fontSize: 10, color: C.navy, fontWeight: 700 }}>
                      Ideal {fmtPct(ritmoIdeal)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: C.muted }}>$0</span>
                  <span style={{ color: colorGlobal, fontWeight: 800, fontSize: 15 }}>
                    {nivelEmoji(pctGlobal)} {fmtPct(pctGlobal)} girado — {fmtCOP(con.girado)}
                  </span>
                  <span style={{ color: C.muted }}>PAC: {fmtCOP(con.pacActual)}</span>
                </div>
                {brecha < 0 && (
                  <div style={{ marginTop: 12, textAlign: "center" as const, fontSize: 12, color: C.rojo, fontWeight: 700 }}>
                    ⬇ {fmtPctNum(Math.abs(brecha * 100))} por debajo del ritmo ideal — equivale a {fmtCOP(Math.abs(brecha) * con.pacActual)} sin girar de lo esperado
                  </div>
                )}
              </div>
            </div>

            {/* Tarjetas resumen ejecutivo */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {mejorMes && (
                <div style={{ background: C.verdeLt, borderRadius: 10, padding: 14, borderLeft: `3px solid ${C.verde}` }}>
                  <div style={{ fontSize: 11, color: C.verde, fontWeight: 700, marginBottom: 4 }}>🏆 MEJOR MES</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>{mejorMes.periodo}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.verde }}>{fmtPct(mejorMes.ejecutado)}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>PAC: {fmtCOP(mejorMes.pacActual)} · Girado: {fmtCOP(mejorMes.girado)}</div>
                </div>
              )}
              {peorMes && (
                <div style={{ background: nivelBg(peorMes.ejecutado), borderRadius: 10, padding: 14, borderLeft: `3px solid ${nivelColor(peorMes.ejecutado)}` }}>
                  <div style={{ fontSize: 11, color: nivelColor(peorMes.ejecutado), fontWeight: 700, marginBottom: 4 }}>⚠️ MENOR EJECUCIÓN</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>{peorMes.periodo}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: nivelColor(peorMes.ejecutado) }}>{fmtPct(peorMes.ejecutado)}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>PAC: {fmtCOP(peorMes.pacActual)} · Girado: {fmtCOP(peorMes.girado)}</div>
                </div>
              )}
              <div style={{ background: pctRezago > 15 ? C.rojoLt : "#f8fafc", borderRadius: 10, padding: 14, borderLeft: `3px solid ${pctRezago > 15 ? C.rojo : C.muted}` }}>
                <div style={{ fontSize: 11, color: pctRezago > 15 ? C.rojo : C.muted, fontWeight: 700, marginBottom: 4 }}>🔁 REZAGO</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>{rezago ? fmtCOP(rezago.pacActual) : "Sin datos"}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: pctRezago > 15 ? C.rojo : C.muted }}>{pctRezago.toFixed(1)}% del PAC</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Compromisos de vigencias anteriores</div>
              </div>
              <div style={{ background: "#f0f9ff", borderRadius: 10, padding: 14, borderLeft: `3px solid ${C.azul}` }}>
                <div style={{ fontSize: 11, color: C.azul, fontWeight: 700, marginBottom: 4 }}>🔮 PROYECCIÓN CIERRE</div>
                <div style={{ fontWeight: 800, fontSize: 22, color: nivelColor(proyeccionCierre) }}>{fmtPct(proyeccionCierre)}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Si el 2do semestre gira el 100% de su PAC</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            TAB 2 — POR MES
        ═══════════════════════════════════════ */}
        {tab === "meses" && (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 28 }}>

            {/* Gráfica 2a: PAC vs Girado por mes (millones) */}
            <div>
              <SeccionTitulo
                titulo="PAC programado vs Girado — mes a mes (en millones COP)"
                subtitulo="Permite identificar visualmente qué meses tienen brecha entre lo programado y lo realmente girado."
                insight={
                  peorMes
                    ? `${peorMes.periodo} muestra la mayor brecha: PAC de ${fmtCOP(peorMes.pacActual)} pero solo giró ${fmtCOP(peorMes.girado)} (${fmtPct(peorMes.ejecutado)}). Los meses grises son programados y aún sin ejecución.`
                    : undefined
                }
              />
              <ResponsiveContainer width="99%" height={300}>
                <BarChart data={datosMeses} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.muted }} />
                  <YAxis tickFormatter={v => `$${v}M`} tick={{ fontSize: 10, fill: C.muted }} width={60} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = datosMeses.find(m => m.mes === label);
                      return (
                        <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,.12)" }}>
                          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 6 }}>{d?.periodo ?? label}</div>
                          {payload.map((p: any, i: number) => (
                            <div key={i} style={{ color: p.color, marginBottom: 2 }}>{p.name}: <strong>${p.value}M</strong></div>
                          ))}
                          {d?.tieneData && <div style={{ marginTop: 4, fontWeight: 700, color: nivelColor(d.nivel) }}>Ejecución: {fmtPctNum(d.pctEjec)}</div>}
                          {!d?.tieneData && <div style={{ marginTop: 4, color: C.muted, fontStyle: "italic" }}>Mes pendiente de ejecución</div>}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="PAC Programado" fill={`${C.cyan}55`} radius={[4, 4, 0, 0]} maxBarSize={30} name="PAC Programado ($M)" />
                  <Bar dataKey="Girado" radius={[4, 4, 0, 0]} maxBarSize={30} name="Girado ($M)">
                    {datosMeses.map((d, i) => (
                      <Cell key={i} fill={d.tieneData ? nivelColor(d.nivel) : `${C.muted}40`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfica 2b: % Ejecución mensual con semáforo */}
            <div>
              <SeccionTitulo
                titulo="% de ejecución mensual — semáforo de control"
                subtitulo="Solo meses con ejecución registrada. Líneas de referencia en 85% (meta) y 60% (alerta)."
                insight="Un mes por debajo del 60% en ejecución debe generar pregunta formal de control político: ¿qué causas técnicas o administrativas impidieron el giro?"
              />
              <ResponsiveContainer width="99%" height={240}>
                <BarChart data={datosMeses.filter(d => d.tieneData)} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.muted }} />
                  <YAxis domain={[0, 115]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: C.muted }} width={45} />
                  <Tooltip content={<TooltipPct />} />
                  <ReferenceLine y={85} stroke={C.verde} strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: "Meta 85%", position: "insideTopRight", fill: C.verde, fontSize: 10, fontWeight: 700 }} />
                  <ReferenceLine y={60} stroke={C.rojo} strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: "Alerta 60%", position: "insideBottomRight", fill: C.rojo, fontSize: 10, fontWeight: 700 }} />
                  <Bar dataKey="pctEjec" maxBarSize={36} radius={[4, 4, 0, 0]} name="% Ejecución">
                    {datosMeses.filter(d => d.tieneData).map((d, i) => (
                      <Cell key={i} fill={nivelColor(d.nivel)} />
                    ))}
                    <LabelList dataKey="pctEjec" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: C.texto }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            TAB 3 — RITMO & TENDENCIA
        ═══════════════════════════════════════ */}
        {tab === "ritmo" && (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 28 }}>

            {/* Gráfica 3a: Curva acumulada real vs ideal */}
            <div>
              <SeccionTitulo
                titulo="Curva de ejecución acumulada — real vs ideal (1/12 por mes)"
                subtitulo="Si la línea azul está por debajo de la gris, la entidad está rezagada respecto al ritmo mínimo requerido para ejecutar el 100% al cierre del año."
                insight={
                  brecha < -0.05
                    ? `A ${mesActual}, la ejecución acumulada (${fmtPct(pctGlobal)}) está ${fmtPctNum(Math.abs(brecha * 100))} por debajo de la curva ideal. Para cerrar el año al 100%, los meses restantes deberían girar en promedio ${fmtCOP((con.pacActual - con.girado) / Math.max(mesesPend.length, 1))} por mes.`
                    : `La ejecución va en línea con el ritmo ideal. La entidad está al día en el giro de recursos.`
                }
              />
              <ResponsiveContainer width="99%" height={300}>
                <LineChart data={datosRitmo} margin={{ left: 0, right: 16, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.muted }} />
                  <YAxis domain={[0, 110]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10, fill: C.muted }} width={45} />
                  <Tooltip content={<TooltipPct />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={100} stroke={C.verde} strokeDasharray="4 2"
                    label={{ value: "Meta 100%", position: "insideTopRight", fill: C.verde, fontSize: 10, fontWeight: 700 }} />
                  <Line
                    type="monotone"
                    dataKey="Curva ideal (1/12)"
                    stroke={C.muted}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                    name="Curva ideal (1/12)"
                  />
                  <Line
                    type="monotone"
                    dataKey="% Girado acumulado"
                    stroke={C.navy}
                    strokeWidth={2.5}
                    connectNulls={false}
                    name="% Girado acumulado"
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      const val = payload["% Girado acumulado"];
                      if (val == null) return <g key={`dot-${index}`} />;
                      const ideal = payload["Curva ideal (1/12)"] ?? 0;
                      return <circle key={`dot-${index}`} cx={cx} cy={cy} r={5} fill={val >= ideal ? C.verde : C.rojo} stroke="white" strokeWidth={2} />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 10, display: "flex", gap: 16, fontSize: 11, color: C.muted, flexWrap: "wrap" as const }}>
                <span>🟢 Punto verde = por encima del ideal</span>
                <span>🔴 Punto rojo = por debajo del ideal</span>
                <span>— — Área gris = curva ideal acumulada (8.33%/mes)</span>
              </div>
            </div>

            {/* Gráfica 3b: Variación del PAC por reprogramaciones */}
            <div>
              <SeccionTitulo
                titulo="Reprogramación del PAC — mes a mes"
                subtitulo="Muestra la variación entre el PAC inicial y el PAC final de cada mes. Valores negativos indican recortes; positivos, adiciones."
                insight={
                  variacionPAC < 0
                    ? `El PAC fue reducido en ${fmtCOP(Math.abs(variacionPAC))} netos (${Math.abs(pctVariacion).toFixed(1)}% del inicial). Los meses con mayor recorte merecen pregunta: ¿se cancelaron proyectos o se trasladaron recursos?`
                    : `El PAC fue incrementado en ${fmtCOP(variacionPAC)} netos. Verificar el origen de las adiciones.`
                }
              />
              <ResponsiveContainer width="99%" height={260}>
                <BarChart data={datosReprog} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.muted }} />
                  <YAxis tickFormatter={v => `$${v}M`} tick={{ fontSize: 10, fill: C.muted }} width={60} />
                  <Tooltip content={<TooltipCOP />} formatter={(v: any) => [`$${v}M`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke={C.border} strokeWidth={2} />
                  <Bar dataKey="Variación" name="Variación PAC ($M)" maxBarSize={28} radius={[4, 4, 0, 0]}>
                    {datosReprog.map((d, i) => (
                      <Cell key={i} fill={d.esNegativo ? C.rojo : C.verde} opacity={0.85} />
                    ))}
                    <LabelList dataKey="Variación" position="top" formatter={(v: any) => v ? `${v}M` : ""} style={{ fontSize: 9, fill: C.texto }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 11, flexWrap: "wrap" as const }}>
                <span style={{ color: C.rojo, fontWeight: 700 }}>🔴 Barras rojas = recorte al PAC del mes</span>
                <span style={{ color: C.verde, fontWeight: 700 }}>🟢 Barras verdes = adición al PAC del mes</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            TAB 4 — TABLA
        ═══════════════════════════════════════ */}
        {tab === "tabla" && (
          <div>
            <SeccionTitulo
              titulo="Tabla detallada — todos los períodos"
              subtitulo="Incluye CONSOLIDADO AÑO, 12 meses, REZAGO y PAC NO EJECUTADO. Filas opacas = meses sin ejecución."
            />
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 11 }}>
                <thead>
                  <tr style={{ background: C.navy, color: "white" }}>
                    {["Período","PAC Inicial","PAC Reprog.","PAC Actual","Disponibilidad","Girado","% Ejec.","Nivel"].map((h, i) => (
                      <th key={i} style={{ padding: "10px 12px", textAlign: i === 0 ? "left" as const : "right" as const, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" as const }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Consolidado */}
                  {[datos.consolidado].map((f, i) => (
                    <tr key={`con-${i}`} style={{ background: "#EFF6FF", borderBottom: `2px solid ${C.cyan}` }}>
                      <td style={{ padding: "10px 12px", color: C.navy, fontWeight: 800, fontSize: 12 }}>{f.periodo}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" as const }}>{fmtCOP(f.pacInicial)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" as const, color: f.pacReprog >= 0 ? C.verde : C.rojo, fontWeight: 700 }}>{fmtCOP(f.pacReprog)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" as const, fontWeight: 800, color: C.navy }}>{fmtCOP(f.pacActual)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" as const, color: C.amar }}>{fmtCOP(f.disponibilidad)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" as const, color: nivelColor(f.ejecutado), fontWeight: 800 }}>{fmtCOP(f.girado)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                        <span style={{ background: nivelBg(f.ejecutado), color: nivelColor(f.ejecutado), padding: "2px 8px", borderRadius: 10, fontWeight: 800 }}>{fmtPct(f.ejecutado)}</span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                        <span style={{ background: nivelBg(f.ejecutado), color: nivelColor(f.ejecutado), padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{nivelEmoji(f.ejecutado)} {nivelLabel(f.ejecutado)}</span>
                      </td>
                    </tr>
                  ))}
                  {/* Meses */}
                  {datos.meses.map((f, i) => {
                    const conData = f.girado > 0;
                    return (
                      <tr key={`m-${i}`} style={{ background: i % 2 === 0 ? "white" : "#f8fafc", borderBottom: `1px solid ${C.border}`, opacity: conData ? 1 : 0.55 }}>
                        <td style={{ padding: "9px 12px", fontWeight: 600, color: conData ? C.texto : C.muted }}>{f.periodo}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right" as const, color: C.muted }}>{fmtCOP(f.pacInicial)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right" as const, color: f.pacReprog < 0 ? C.rojo : f.pacReprog > 0 ? C.verde : C.muted }}>{fmtCOP(f.pacReprog)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right" as const }}>{fmtCOP(f.pacActual)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right" as const, color: C.amar }}>{fmtCOP(f.disponibilidad)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right" as const, color: conData ? nivelColor(f.ejecutado) : C.muted, fontWeight: conData ? 700 : 400 }}>{fmtCOP(f.girado)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right" as const }}>
                          {conData
                            ? <span style={{ background: nivelBg(f.ejecutado), color: nivelColor(f.ejecutado), padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{fmtPct(f.ejecutado)}</span>
                            : <span style={{ color: C.muted }}>—</span>}
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right" as const }}>
                          {conData
                            ? <span style={{ background: nivelBg(f.ejecutado), color: nivelColor(f.ejecutado), padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{nivelEmoji(f.ejecutado)} {nivelLabel(f.ejecutado)}</span>
                            : <span style={{ color: C.muted, fontSize: 10 }}>Pendiente</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Rezago y PAC No Ejecutado */}
                  {[datos.rezago, datos.pacNoEjec].filter(Boolean).map((f, i) => f && (
                    <tr key={`extra-${i}`} style={{ background: "#FFF8E1", borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: C.amar, fontStyle: "italic" }}>{f.periodo}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right" as const, color: C.muted }}>{fmtCOP(f.pacInicial)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right" as const, color: f.pacReprog < 0 ? C.rojo : C.verde }}>{fmtCOP(f.pacReprog)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right" as const, fontWeight: 700 }}>{fmtCOP(f.pacActual)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right" as const }}>{fmtCOP(f.disponibilidad)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right" as const }}>{fmtCOP(f.girado)}</td>
                      <td colSpan={2} style={{ padding: "9px 12px", textAlign: "center" as const, color: C.muted, fontSize: 10, fontStyle: "italic" }}>Fila especial — no aplica semáforo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: C.muted, display: "flex", gap: 20, flexWrap: "wrap" as const }}>
              <span>🟢 VERDE ≥ 85% &nbsp;·&nbsp; 🟡 AMARILLO 60–84% &nbsp;·&nbsp; 🔴 ROJO &lt; 60%</span>
              <span style={{ marginLeft: "auto" }}>PAC Reprog. en rojo = recorte · verde = adición</span>
            </div>
          </div>
        )}
      </div>

      {generador && (
        <GeneradorProposicion
          alertaPAC={generador}
          mesNombre={mesActual}
          totalPAC={datos.consolidado.pacActual}
          pctGlobal={datos.consolidado.ejecutado}
          onCerrar={() => setGenerador(null)}
        />
      )}
    </div>
  );
}
