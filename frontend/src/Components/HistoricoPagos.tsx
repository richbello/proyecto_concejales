import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, ComposedChart, Area,
} from "recharts";

// ─── Paleta idéntica a AlertasML ────────────────────────────────────────────
const C = {
  navy: "#1a2742", navyLt: "#1e3a5f", cyan: "#5dade2", cyanLt: "#85c1e9",
  verde: "#27ae60", verdeLt: "#a9dfbf", amar: "#f39c12", amarLt: "#fdebd0",
  rojo: "#e74c3c", rojoLt: "#fadbd8", texto: "#2c3e50", muted: "#7f8c8d",
  bg: "#f0f2f5", border: "#e8edf2", violet: "#8e44ad", violetLt: "#e8daef",
};

const COLORES_PIE = ["#5dade2","#27ae60","#f39c12","#e74c3c","#8e44ad","#1abc9c","#e67e22","#2c3e50"];

const fmtCOP = (v: number) =>
  v >= 1e12 ? `$${(v / 1e12).toFixed(2)}B` :
  v >= 1e9  ? `$${(v / 1e9).toFixed(2)}MM` :
  v >= 1e6  ? `$${(v / 1e6).toFixed(0)}M`  :
              `$${(v / 1e3).toFixed(0)}K`;

const fmtNum = (v: number) => v.toLocaleString("es-CO");

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Registro {
  nombre: string;
  nroId: string;
  proveedor: string;
  valorBruto: number;
  valorNeto: number;
  ejercicio: number;
  referencia: string;
  estatus: string;
  viaPago: string;
  fechaPago: string | null;
}

interface ResumenHistorico {
  registros: Registro[];
  totalBruto: number;
  totalNeto: number;
  totalRegistros: number;
  pagados: number;
  anulados: number;
  trasladados: number;
  enProceso: number;
  rechazados: number;
  proveedoresUnicos: number;
  ejercicios: number[];
  porEjercicio: { ejercicio: string; bruto: number; neto: number; count: number }[];
  topProveedores: { nombre: string; nroId: string; bruto: number; count: number }[];
  porEstatus: { name: string; value: number; monto: number }[];
  porReferencia: { referencia: string; bruto: number; count: number }[];
  proveedoresPorEjercicio: Record<number, number>;
}

// ─── Procesador del Excel ────────────────────────────────────────────────────
function procesarHistorico(data: any[][]): ResumenHistorico {
  const headers = data[0].map((c: any) => String(c || "").trim());
  const rows = data.slice(1);

  const col = (terms: string[]) =>
    headers.findIndex((h: string) => terms.some(t => h.toLowerCase().includes(t.toLowerCase())));

  const iNombre    = col(["Nombre"]);
  const iNroId     = col(["Nº identificación", "identificación", "nro identificacion"]);
  const iProveedor = col(["Proveedor"]);
  const iBruto     = col(["Valor Bruto"]);
  const iNeto      = col(["Valor Neto"]);
  const iEjercicio = col(["Ejercicio"]);
  const iRef       = col(["Referencia"]);
  const iEstatus   = col(["Estatus"]);
  const iVia       = col(["Vía de pago"]);
  const iFechaPago = col(["Fecha de pago"]);

  const registros: Registro[] = [];

  for (const row of rows) {
    const bruto = Number(row[iBruto]) || 0;
    if (bruto === 0) continue;
    registros.push({
      nombre:     String(row[iNombre]    ?? "").trim(),
      nroId:      String(row[iNroId]     ?? "").trim(),
      proveedor:  String(row[iProveedor] ?? "").trim(),
      valorBruto: bruto,
      valorNeto:  Number(row[iNeto])      || 0,
      ejercicio:  Number(row[iEjercicio]) || 0,
      referencia: String(row[iRef]       ?? "").trim(),
      estatus:    String(row[iEstatus]   ?? "").trim().toUpperCase(),
      viaPago:    String(row[iVia]       ?? "").trim(),
      fechaPago:  row[iFechaPago] ? String(row[iFechaPago]).slice(0, 10) : null,
    });
  }

  const totalBruto   = registros.reduce((s, r) => s + r.valorBruto, 0);
  const totalNeto    = registros.reduce((s, r) => s + r.valorNeto,  0);
  const pagados      = registros.filter(r => r.estatus === "PAGADA").length;
  const anulados     = registros.filter(r => r.estatus === "ANULADA").length;
  const trasladados  = registros.filter(r => r.estatus === "TRASLADADA").length;
  const enProceso    = registros.filter(r => r.estatus === "EN PROCESO").length;
  const rechazados   = registros.filter(r => r.estatus === "RECHAZADA").length;

  const ejerciciosSet = [...new Set(registros.map(r => r.ejercicio))].sort();

  // Por ejercicio
  const mapaEjercicio: Record<string, { bruto: number; neto: number; count: number }> = {};
  for (const r of registros) {
    const k = String(r.ejercicio);
    if (!mapaEjercicio[k]) mapaEjercicio[k] = { bruto: 0, neto: 0, count: 0 };
    mapaEjercicio[k].bruto += r.valorBruto;
    mapaEjercicio[k].neto  += r.valorNeto;
    mapaEjercicio[k].count += 1;
  }
  const porEjercicio = ejerciciosSet.map(e => ({
    ejercicio: String(e),
    ...mapaEjercicio[String(e)],
  }));

  // Top proveedores
  const mapaProv: Record<string, { nombre: string; nroId: string; bruto: number; count: number }> = {};
  for (const r of registros) {
    const k = r.nroId || r.nombre;
    if (!mapaProv[k]) mapaProv[k] = { nombre: r.nombre.slice(0, 45), nroId: r.nroId, bruto: 0, count: 0 };
    mapaProv[k].bruto += r.valorBruto;
    mapaProv[k].count += 1;
  }
  const topProveedores = Object.values(mapaProv)
    .sort((a, b) => b.bruto - a.bruto)
    .slice(0, 12);

  // Por estatus
  const mapaEst: Record<string, { count: number; monto: number }> = {};
  for (const r of registros) {
    if (!mapaEst[r.estatus]) mapaEst[r.estatus] = { count: 0, monto: 0 };
    mapaEst[r.estatus].count += 1;
    mapaEst[r.estatus].monto += r.valorBruto;
  }
  const porEstatus = Object.entries(mapaEst)
    .map(([name, v]) => ({ name, value: v.count, monto: v.monto }))
    .sort((a, b) => b.value - a.value);

  // Por referencia top 10
  const mapaRef: Record<string, { bruto: number; count: number }> = {};
  for (const r of registros) {
    const k = r.referencia || "SIN REF";
    if (!mapaRef[k]) mapaRef[k] = { bruto: 0, count: 0 };
    mapaRef[k].bruto += r.valorBruto;
    mapaRef[k].count += 1;
  }
  const porReferencia = Object.entries(mapaRef)
    .map(([referencia, v]) => ({ referencia: referencia.slice(0, 20), bruto: v.bruto, count: v.count }))
    .sort((a, b) => b.bruto - a.bruto)
    .slice(0, 10);

  const proveedoresPorEjercicio: Record<number, number> = {};
  for (const e of ejerciciosSet) {
    proveedoresPorEjercicio[e] = new Set(registros.filter(r => r.ejercicio === e).map(r => r.nroId)).size;
  }

  return {
    registros,
    totalBruto, totalNeto,
    totalRegistros: registros.length,
    pagados, anulados, trasladados, enProceso, rechazados,
    proveedoresUnicos: new Set(registros.map(r => r.nroId)).size,
    ejercicios: ejerciciosSet,
    porEjercicio, topProveedores, porEstatus, porReferencia,
    proveedoresPorEjercicio,
  };
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────
const KpiCard = ({ emoji, label, valor, color, sub }: { emoji: string; label: string; valor: string | number; color: string; sub?: string }) => (
  <div style={{ background: "white", borderRadius: 10, padding: "14px 18px", borderLeft: `3px solid ${color}`, flex: 1, minWidth: 130, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
    <div style={{ fontSize: 22 }}>{emoji}</div>
    <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1, marginTop: 4 }}>{valor}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: C.texto, marginTop: 3 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

const TooltipCOP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === "number" ? fmtCOP(p.value) : p.value}</strong></div>
      ))}
    </div>
  );
};

const TabBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={{ padding: "12px 16px", background: "transparent", border: "none", borderBottom: active ? `2px solid ${C.cyan}` : "2px solid transparent", color: active ? C.cyan : C.muted, cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, whiteSpace: "nowrap" as const }}>
    {children}
  </button>
);

const ESTATUS_COLOR: Record<string, string> = {
  PAGADA: C.verde, ANULADA: C.rojo, TRASLADADA: C.amar,
  "EN PROCESO": C.cyan, RECHAZADA: "#8e44ad", RADICADA: C.muted,
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function HistoricoPagos() {
  const [data, setData]         = useState<ResumenHistorico | null>(null);
  const [tab, setTab]           = useState<"resumen" | "proveedores" | "referencia" | "tabla">("resumen");
  const [ejercicioFiltro, setEjercicioFiltro] = useState<string>("TODOS");
  const [estatusFiltro,   setEstatusFiltro]   = useState<string>("TODOS");
  const [busqueda,        setBusqueda]         = useState("");
  const [pagina,          setPagina]           = useState(0);
  const [provDetalle,     setProvDetalle]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const FILAS_PAG = 20;

  const procesar = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const sheetName = wb.SheetNames.includes("Data") ? "Data" : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
        setData(procesarHistorico(raw));
        setTab("resumen");
        setEjercicioFiltro("TODOS");
        setEstatusFiltro("TODOS");
        setBusqueda("");
        setPagina(0);
      } catch { alert("Error leyendo el archivo. Verifica que sea un Excel válido."); }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // ── Pantalla de carga ──────────────────────────────────────────────────────
  if (!data) {
    return (
      <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", minHeight: 400, padding: 24 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius: 16, padding: "32px 40px", textAlign: "center" as const, color: "white", maxWidth: 520, width: "100%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Histórico de Pagos — FDL Usme</h3>
          <p style={{ margin: "0 0 28px", fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.6 }}>
            Carga el reporte de pagos exportado de SAP Distrital.<br />
            Columnas requeridas: Nombre, Nº identificación, Proveedor,<br />Valor Bruto, Ejercicio, Referencia.
          </p>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) procesar(f); }}
            style={{ border: "2px dashed rgba(93,173,226,.5)", borderRadius: 12, padding: "28px 20px", cursor: "pointer", marginBottom: 20, background: "rgba(93,173,226,.08)" }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 13, color: C.cyanLt, fontWeight: 600 }}>Arrastra el Excel aquí o haz clic para seleccionar</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 6 }}>.xlsx · .xls</div>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) procesar(e.target.files[0]); }} />
        </div>
      </div>
    );
  }

  // ── Filtros aplicados ──────────────────────────────────────────────────────
  const registrosFiltrados = data.registros.filter(r => {
    const okEj  = ejercicioFiltro === "TODOS" || String(r.ejercicio) === ejercicioFiltro;
    const okEst = estatusFiltro   === "TODOS" || r.estatus === estatusFiltro;
    const q     = busqueda.toLowerCase();
    const okBus = !q || r.nombre.toLowerCase().includes(q) || r.nroId.includes(q) || r.referencia.toLowerCase().includes(q);
    return okEj && okEst && okBus;
  });

  const totalFiltrado = registrosFiltrados.reduce((s, r) => s + r.valorBruto, 0);
  const paginas = Math.ceil(registrosFiltrados.length / FILAS_PAG);
  const filasPag = registrosFiltrados.slice(pagina * FILAS_PAG, (pagina + 1) * FILAS_PAG);

  // Top proveedores filtrados
  const mapaProvFilt: Record<string, { nombre: string; nroId: string; bruto: number; count: number }> = {};
  for (const r of registrosFiltrados) {
    const k = r.nroId || r.nombre;
    if (!mapaProvFilt[k]) mapaProvFilt[k] = { nombre: r.nombre.slice(0, 45), nroId: r.nroId, bruto: 0, count: 0 };
    mapaProvFilt[k].bruto += r.valorBruto;
    mapaProvFilt[k].count += 1;
  }
  const topProvFilt = Object.values(mapaProvFilt).sort((a, b) => b.bruto - a.bruto).slice(0, 12);

  // Detalle proveedor
  const detProveedor = provDetalle
    ? data.registros.filter(r => r.nroId === provDetalle)
    : [];
  const detPorEjercicio = provDetalle
    ? data.ejercicios.map(e => ({
        ejercicio: String(e),
        bruto: detProveedor.filter(r => r.ejercicio === e).reduce((s, r) => s + r.valorBruto, 0),
      }))
    : [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", color: C.texto, minHeight: "100%" }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius: 12, padding: "20px 24px", marginBottom: 18, color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: C.cyan, letterSpacing: 2, textTransform: "uppercase" as const, fontWeight: 700 }}>📊 SAP Distrital · FDL Usme</div>
            <h2 style={{ margin: "6px 0 4px", fontSize: 20, fontWeight: 800 }}>Histórico de Pagos · {data.ejercicios[0]}–{data.ejercicios[data.ejercicios.length - 1]}</h2>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
              Valor Bruto: {fmtCOP(data.totalBruto)} · Valor Neto: {fmtCOP(data.totalNeto)} · {fmtNum(data.totalRegistros)} registros
            </div>
          </div>
          <button onClick={() => setData(null)} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: "6px 14px", color: "white", cursor: "pointer", fontSize: 12 }}>📂 Cambiar archivo</button>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" as const }}>
          <KpiCard emoji="✅" label="Pagadas"          valor={fmtNum(data.pagados)}           color={C.verde} sub={`${((data.pagados/data.totalRegistros)*100).toFixed(0)}% del total`} />
          <KpiCard emoji="❌" label="Anuladas"         valor={fmtNum(data.anulados)}           color={C.rojo} />
          <KpiCard emoji="🔄" label="Trasladadas"      valor={fmtNum(data.trasladados)}        color={C.amar} />
          <KpiCard emoji="🏢" label="Proveedores"      valor={fmtNum(data.proveedoresUnicos)}  color={C.cyan} sub="NIT únicos" />
          <KpiCard emoji="📅" label="Ejercicios"       valor={data.ejercicios.length}          color={C.violet} sub={`${data.ejercicios[0]}–${data.ejercicios[data.ejercicios.length-1]}`} />
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: "white", borderRadius: 10, padding: "14px 18px", marginBottom: 12, display: "flex", gap: 12, flexWrap: "wrap" as const, alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>🔍 Filtros:</div>
        <select value={ejercicioFiltro} onChange={e => { setEjercicioFiltro(e.target.value); setPagina(0); }}
          style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, color: C.texto, background: "white" }}>
          <option value="TODOS">Todos los ejercicios</option>
          {data.ejercicios.map(e => <option key={e} value={String(e)}>{e}</option>)}
        </select>
        <select value={estatusFiltro} onChange={e => { setEstatusFiltro(e.target.value); setPagina(0); }}
          style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, color: C.texto, background: "white" }}>
          <option value="TODOS">Todos los estatus</option>
          {["PAGADA","ANULADA","TRASLADADA","EN PROCESO","RECHAZADA","RADICADA"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(0); }}
          placeholder="Buscar nombre, NIT o referencia..."
          style={{ flex: 1, minWidth: 200, fontSize: 12, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, color: C.texto }}
        />
        {(ejercicioFiltro !== "TODOS" || estatusFiltro !== "TODOS" || busqueda) && (
          <button onClick={() => { setEjercicioFiltro("TODOS"); setEstatusFiltro("TODOS"); setBusqueda(""); setPagina(0); }}
            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, cursor: "pointer", background: C.rojoLt, color: C.rojo, fontWeight: 700 }}>
            ✕ Limpiar
          </button>
        )}
        <div style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>
          {fmtNum(registrosFiltrados.length)} registros · {fmtCOP(totalFiltrado)}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "white", borderRadius: "10px 10px 0 0", borderBottom: `2px solid ${C.border}`, display: "flex", padding: "0 16px", overflowX: "auto" as const }}>
        <TabBtn active={tab === "resumen"}      onClick={() => setTab("resumen")}>      📊 Resumen</TabBtn>
        <TabBtn active={tab === "proveedores"}  onClick={() => setTab("proveedores")}>  🏢 Proveedores</TabBtn>
        <TabBtn active={tab === "referencia"}   onClick={() => setTab("referencia")}>   🔖 Referencias</TabBtn>
        <TabBtn active={tab === "tabla"}        onClick={() => setTab("tabla")}>         📋 Tabla detalle</TabBtn>
      </div>

      <div style={{ background: "white", borderRadius: "0 0 10px 10px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>

        {/* ── TAB: RESUMEN ── */}
        {tab === "resumen" && (
          <div>
            {/* Valor bruto por ejercicio */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>Valor bruto por ejercicio fiscal</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Millones de COP · Valor Bruto vs Valor Neto</div>
              <ResponsiveContainer width="99%" height={240}>
                <ComposedChart data={data.porEjercicio} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="ejercicio" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => fmtCOP(v)} tick={{ fontSize: 10 }} width={72} />
                  <Tooltip content={<TooltipCOP />} />
                  <Bar dataKey="bruto" name="Valor Bruto" fill={C.cyan} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="neto"  name="Valor Neto"  fill={C.verde} radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, flexWrap: "wrap" as const }}>
              {/* Registros por ejercicio */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>Volumen de transacciones</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>N° registros por año</div>
                <ResponsiveContainer width="99%" height={200}>
                  <BarChart data={data.porEjercicio} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="ejercicio" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNum} width={52} />
                    <Tooltip formatter={(v: any) => fmtNum(v)} />
                    <Bar dataKey="count" name="Registros" fill={C.amar} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Por estatus */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>Distribución por estatus</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Por cantidad de registros</div>
                <ResponsiveContainer width="99%" height={200}>
                  <PieChart>
                    <Pie data={data.porEstatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {data.porEstatus.map((_, i) => (
                        <Cell key={i} fill={ESTATUS_COLOR[data.porEstatus[i].name] ?? C.muted} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, name: any, props: any) => [`${fmtNum(v)} reg · ${fmtCOP(props.payload.monto)}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Proveedores únicos por año */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>Proveedores únicos por ejercicio</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>NIT distintos que recibieron pagos</div>
                <ResponsiveContainer width="99%" height={200}>
                  <LineChart data={data.porEjercicio.map(d => ({ ...d, provUnicos: data.proveedoresPorEjercicio[Number(d.ejercicio)] ?? 0 }))} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="ejercicio" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => fmtNum(v)} />
                    <Line type="monotone" dataKey="provUnicos" name="Proveedores" stroke={C.violet} strokeWidth={2} dot={{ r: 4, fill: C.violet }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Valor promedio por transacción */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>Ticket promedio por transacción</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Valor Bruto / N° registros</div>
                <ResponsiveContainer width="99%" height={200}>
                  <LineChart data={data.porEjercicio.map(d => ({ ...d, avg: d.count > 0 ? Math.round(d.bruto / d.count) : 0 }))} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="ejercicio" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={v => fmtCOP(v)} tick={{ fontSize: 10 }} width={64} />
                    <Tooltip formatter={(v: any) => fmtCOP(v)} />
                    <Line type="monotone" dataKey="avg" name="Ticket promedio" stroke={C.rojo} strokeWidth={2} dot={{ r: 4, fill: C.rojo }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: PROVEEDORES ── */}
        {tab === "proveedores" && (
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" as const }}>
            {/* Lista */}
            <div style={{ flex: 2, minWidth: 300 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 12 }}>Top 12 proveedores por valor bruto</div>
              <ResponsiveContainer width="99%" height={topProvFilt.length * 42 + 40}>
                <BarChart data={topProvFilt} layout="vertical" margin={{ top: 4, right: 60, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmtCOP(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nombre" width={180} tick={{ fontSize: 10 }} />
                  <Tooltip content={<TooltipCOP />} />
                  <Bar dataKey="bruto" name="Valor Bruto" radius={[0, 4, 4, 0]} label={{ position: "right", formatter: (v: number) => fmtCOP(v), fontSize: 10, fill: C.muted }}>
                    {topProvFilt.map((_, i) => <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Tabla rápida */}
              <div style={{ marginTop: 16, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th style={{ padding: "8px 12px", textAlign: "left" as const, fontWeight: 700, color: C.navy }}>#</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" as const, fontWeight: 700, color: C.navy }}>Proveedor / Nombre</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" as const, fontWeight: 700, color: C.navy }}>NIT</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 700, color: C.navy }}>Valor Bruto</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 700, color: C.navy }}>Registros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProvFilt.map((p, i) => (
                      <tr key={i}
                        onClick={() => { setProvDetalle(provDetalle === p.nroId ? null : p.nroId); }}
                        style={{ cursor: "pointer", background: provDetalle === p.nroId ? C.cyanLt + "40" : i % 2 === 0 ? "white" : C.bg, borderBottom: `1px solid ${C.border}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.cyanLt + "30")}
                        onMouseLeave={e => (e.currentTarget.style.background = provDetalle === p.nroId ? C.cyanLt + "40" : i % 2 === 0 ? "white" : C.bg)}
                      >
                        <td style={{ padding: "8px 12px", color: C.muted }}>{i + 1}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: C.navy }}>{p.nombre}</td>
                        <td style={{ padding: "8px 12px", color: C.muted, fontFamily: "monospace" }}>{p.nroId}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 700, color: C.cyan }}>{fmtCOP(p.bruto)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" as const, color: C.muted }}>{fmtNum(p.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detalle proveedor */}
            {provDetalle && detProveedor.length > 0 && (
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, background: C.bg }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 4 }}>📋 Detalle del proveedor</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{detProveedor[0].nombre}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    <div style={{ background: "white", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: C.muted }}>Valor bruto total</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.cyan }}>{fmtCOP(detProveedor.reduce((s, r) => s + r.valorBruto, 0))}</div>
                    </div>
                    <div style={{ background: "white", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: C.muted }}>N° registros</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{fmtNum(detProveedor.length)}</div>
                    </div>
                    <div style={{ background: "white", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: C.muted }}>Pagados</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.verde }}>{fmtNum(detProveedor.filter(r => r.estatus === "PAGADA").length)}</div>
                    </div>
                    <div style={{ background: "white", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: C.muted }}>Anulados</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.rojo }}>{fmtNum(detProveedor.filter(r => r.estatus === "ANULADA").length)}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: C.navy, marginBottom: 8 }}>Evolución por ejercicio</div>
                  <ResponsiveContainer width="99%" height={140}>
                    <BarChart data={detPorEjercicio.filter(d => d.bruto > 0)} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="ejercicio" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => fmtCOP(v)} tick={{ fontSize: 9 }} width={56} />
                      <Tooltip content={<TooltipCOP />} />
                      <Bar dataKey="bruto" name="Valor Bruto" fill={C.cyan} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <button onClick={() => setProvDetalle(null)} style={{ marginTop: 10, width: "100%", padding: "7px", background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontSize: 11 }}>✕ Cerrar detalle</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: REFERENCIAS ── */}
        {tab === "referencia" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>Top 10 referencias de pago por valor bruto</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>Millones de COP · campo "Referencia" del archivo SAP</div>
            <ResponsiveContainer width="99%" height={320}>
              <BarChart data={data.porReferencia} margin={{ top: 4, right: 60, left: 8, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="referencia" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tickFormatter={v => fmtCOP(v)} tick={{ fontSize: 10 }} width={72} />
                <Tooltip content={<TooltipCOP />} />
                <Bar dataKey="bruto" name="Valor Bruto" radius={[4, 4, 0, 0]} label={{ position: "top", formatter: (v: number) => fmtCOP(v), fontSize: 9, fill: C.muted }}>
                  {data.porReferencia.map((_, i) => <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div style={{ marginTop: 24, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={{ padding: "8px 12px", textAlign: "left" as const, fontWeight: 700, color: C.navy }}>#</th>
                    <th style={{ padding: "8px 12px", textAlign: "left" as const, fontWeight: 700, color: C.navy }}>Referencia</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 700, color: C.navy }}>Valor Bruto</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 700, color: C.navy }}>Registros</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 700, color: C.navy }}>% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porReferencia.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "white" : C.bg }}>
                      <td style={{ padding: "8px 12px", color: C.muted }}>{i + 1}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: C.navy, fontFamily: "monospace" }}>{r.referencia}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" as const, fontWeight: 700, color: C.cyan }}>{fmtCOP(r.bruto)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" as const, color: C.muted }}>{fmtNum(r.count)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" as const }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          <div style={{ width: 60, height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min((r.bruto / data.totalBruto) * 100, 100)}%`, height: "100%", background: COLORES_PIE[i % COLORES_PIE.length], borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: C.muted }}>{((r.bruto / data.totalBruto) * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: TABLA DETALLE ── */}
        {tab === "tabla" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>
                {fmtNum(registrosFiltrados.length)} registros · {fmtCOP(totalFiltrado)}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>Página {pagina + 1} de {paginas || 1}</div>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: C.navy, color: "white", position: "sticky" as const, top: 0 }}>
                    <th style={{ padding: "9px 10px", textAlign: "left" as const, whiteSpace: "nowrap" as const }}>Nombre</th>
                    <th style={{ padding: "9px 10px", textAlign: "left" as const }}>NIT</th>
                    <th style={{ padding: "9px 10px", textAlign: "left" as const }}>Proveedor</th>
                    <th style={{ padding: "9px 10px", textAlign: "right" as const, whiteSpace: "nowrap" as const }}>Valor Bruto</th>
                    <th style={{ padding: "9px 10px", textAlign: "center" as const }}>Ejercicio</th>
                    <th style={{ padding: "9px 10px", textAlign: "left" as const }}>Referencia</th>
                    <th style={{ padding: "9px 10px", textAlign: "center" as const }}>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {filasPag.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "white" : C.bg }}>
                      <td style={{ padding: "7px 10px", fontWeight: 600, color: C.navy, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }} title={r.nombre}>{r.nombre}</td>
                      <td style={{ padding: "7px 10px", color: C.muted, fontFamily: "monospace" }}>{r.nroId}</td>
                      <td style={{ padding: "7px 10px", color: C.texto, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }} title={r.proveedor}>{r.proveedor}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right" as const, fontWeight: 700, color: C.cyan, whiteSpace: "nowrap" as const }}>{fmtCOP(r.valorBruto)}</td>
                      <td style={{ padding: "7px 10px", textAlign: "center" as const, color: C.texto }}>{r.ejercicio}</td>
                      <td style={{ padding: "7px 10px", color: C.muted, fontFamily: "monospace", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.referencia}</td>
                      <td style={{ padding: "7px 10px", textAlign: "center" as const }}>
                        <span style={{ background: (ESTATUS_COLOR[r.estatus] ?? C.muted) + "22", color: ESTATUS_COLOR[r.estatus] ?? C.muted, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, border: `1px solid ${(ESTATUS_COLOR[r.estatus] ?? C.muted)}40`, whiteSpace: "nowrap" as const }}>
                          {r.estatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {paginas > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 14 }}>
                <button onClick={() => setPagina(0)}        disabled={pagina === 0}           style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, cursor: pagina === 0 ? "default" : "pointer", opacity: pagina === 0 ? 0.4 : 1, background: "white", fontSize: 12 }}>«</button>
                <button onClick={() => setPagina(p => p-1)} disabled={pagina === 0}           style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, cursor: pagina === 0 ? "default" : "pointer", opacity: pagina === 0 ? 0.4 : 1, background: "white", fontSize: 12 }}>‹</button>
                {Array.from({ length: Math.min(paginas, 7) }, (_, i) => {
                  const p = paginas <= 7 ? i : Math.max(0, Math.min(pagina - 3, paginas - 7)) + i;
                  return (
                    <button key={p} onClick={() => setPagina(p)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${p === pagina ? C.cyan : C.border}`, background: p === pagina ? C.cyan : "white", color: p === pagina ? "white" : C.texto, cursor: "pointer", fontWeight: p === pagina ? 700 : 400, fontSize: 12 }}>{p + 1}</button>
                  );
                })}
                <button onClick={() => setPagina(p => p+1)} disabled={pagina >= paginas-1} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, cursor: pagina >= paginas-1 ? "default" : "pointer", opacity: pagina >= paginas-1 ? 0.4 : 1, background: "white", fontSize: 12 }}>›</button>
                <button onClick={() => setPagina(paginas-1)} disabled={pagina >= paginas-1} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, cursor: pagina >= paginas-1 ? "default" : "pointer", opacity: pagina >= paginas-1 ? 0.4 : 1, background: "white", fontSize: 12 }}>»</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}// pegar contenido aquí
