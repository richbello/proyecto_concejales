import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const C = { navy: "#1a2742", cyan: "#5dade2", verde: "#27ae60", amar: "#f39c12", rojo: "#e74c3c", muted: "#7f8c8d", bg: "#f0f2f5", border: "#e8edf2" };
const fmtCOP = (v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`;
const fmtDays = (d: number) => d > 365 ? `${(d/365).toFixed(1)}y` : d > 30 ? `${Math.floor(d/30)}m` : `${d}d`;

interface Contrato {
  contrato: string;
  contratista: string;
  nit: string;
  fechaInicial: string;
  fechaTerminacionInicial: string;
  valorInicial: number;
  valorFinal: number;
  fechaTerminacionFinal: string;
  estado: string;
  variacion: number;
  pctVariacion: number;
  duracionDias: number;
  velocidadSobrecosto: number;
}

interface Resumen {
  totalContratos: number;
  valorInicialTotal: number;
  valorFinalTotal: number;
  variacionTotal: number;
  pctVariacionGlobal: number;
  contratosSobrecosto: number;
  pctSobrecosto: number;
  duracionPromedio: number;
  contratos: Contrato[];
}

function procesarContratos(data: any[][]): Resumen {
  const headers = data[0].map(h => String(h || "").trim().toUpperCase());
  const rows = data.slice(1);

  const col = (term: string) => headers.findIndex(h => h.includes(term));
  const iContrato = col("CONTRATO");
  const iContratista = col("NOMBRE DEL");
  const iNIT = col("NUMERO DE IDENTIFICACION");
  const iFechaIni = col("FECHA INICIAL");
  const iFechaTerm = col("FECHA DE TERMINACION INICIAL");
  const iValorIni = col("VALOR INICIAL");
  const iValorFin = col("VALOR FINAL");
  const iFechaTermFin = col("FECHA DE TERMINACION FINAL");
  const iEstado = col("ESTADO");

  const contratos: Contrato[] = [];
  let totalValorIni = 0, totalValorFin = 0, totalVariacion = 0;

  for (const row of rows) {
    if (!row[iContrato]) continue;

    const valorIni = Number(row[iValorIni]) || 0;
    const valorFin = Number(row[iValorFin]) || 0;
    const variacion = valorFin - valorIni;
    const pctVar = valorIni > 0 ? (variacion / valorIni * 100) : 0;

    const fecIni = new Date(String(row[iFechaIni] || ""));
    const fecFin = new Date(String(row[iFechaTermFin] || ""));
    const duracionDias = fecFin.getTime() > 0 && fecIni.getTime() > 0 ? Math.floor((fecFin.getTime() - fecIni.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const velocidadSobrecosto = duracionDias > 0 ? (variacion / duracionDias) : 0;

    contratos.push({
      contrato: String(row[iContrato] || "").trim(),
      contratista: String(row[iContratista] || "N/D").trim(),
      nit: String(row[iNIT] || "").trim(),
      fechaInicial: String(row[iFechaIni] || "").trim(),
      fechaTerminacionInicial: String(row[iFechaTerm] || "").trim(),
      valorInicial: valorIni,
      valorFinal: valorFin,
      fechaTerminacionFinal: String(row[iFechaTermFin] || "").trim(),
      estado: String(row[iEstado] || "POR DEFINIR").trim(),
      variacion,
      pctVariacion: pctVar,
      duracionDias,
      velocidadSobrecosto,
    });

    totalValorIni += valorIni;
    totalValorFin += valorFin;
    totalVariacion += variacion;
  }

  const contratosSobrecosto = contratos.filter(c => c.variacion > 0);
  const duracionPromedio = contratos.filter(c => c.duracionDias > 0).reduce((sum, c) => sum + c.duracionDias, 0) / Math.max(contratos.length, 1);

  return {
    totalContratos: contratos.length,
    valorInicialTotal: totalValorIni,
    valorFinalTotal: totalValorFin,
    variacionTotal: totalVariacion,
    pctVariacionGlobal: totalValorIni > 0 ? (totalVariacion / totalValorIni * 100) : 0,
    contratosSobrecosto: contratosSobrecosto.length,
    pctSobrecosto: (contratosSobrecosto.length / contratos.length * 100),
    duracionPromedio,
    contratos: contratos.sort((a, b) => b.variacion - a.variacion),
  };
}

const KpiCard = ({ emoji, label, valor, color, sub }: any) => (
  <div style={{ background: "white", borderRadius: 10, padding: "14px 18px", borderLeft: `3px solid ${color}`, flex: 1, minWidth: 120, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
    <div style={{ fontSize: 22 }}>{emoji}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1, marginTop: 4 }}>{valor}</div>
    <div style={{ fontSize: 11, fontWeight: 600, color: C.navy, marginTop: 3 }}>{label}</div>
    {sub && <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

export default function Contratacion() {
  const [tab, setTab] = useState<"resumen" | "sobrecostos" | "contratistas" | "riesgo" | "tabla">("resumen");
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const inputRef = useRef<HTMLInputElement>(null);

  const procesar = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
        const res = procesarContratos(data);
        setDatos(res);
      } catch (err) { alert("Error leyendo archivo"); }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  if (!datos) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, padding: 24 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius: 16, padding: "32px 40px", textAlign: "center", color: "white", maxWidth: 540, width: "100%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Contratación — Análisis Integral</h3>
          <p style={{ margin: "0 0 28px", fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.6 }}>Carga el archivo SECOP II consolidado para análisis completo de contratos, sobrecostos, duración y riesgos</p>
          <div onClick={() => inputRef.current?.click()} style={{ border: "2px dashed rgba(93,173,226,.5)", borderRadius: 12, padding: "28px 20px", cursor: "pointer", marginBottom: 20, background: "rgba(93,173,226,.08)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 13, color: "#85c1e9", fontWeight: 600 }}>Arrastra el Excel aquí o haz clic</div>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) procesar(e.target.files[0]); }} />
        </div>
      </div>
    );
  }

  const estadosUnicos = [...new Set(datos.contratos.map(c => c.estado.trim().toUpperCase()))].sort();
  const contratosFiltrados = datos.contratos.filter(c => 
    (filtroEstado === "TODOS" || c.estado.trim().toUpperCase() === filtroEstado) &&
    (searchTerm === "" || c.contrato.includes(searchTerm) || c.contratista.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Análisis por contratista
  const contratistasMap: Record<string, { valor: number; count: number; variacion: number }> = {};
  datos.contratos.forEach(c => {
    if (!contratistasMap[c.contratista]) contratistasMap[c.contratista] = { valor: 0, count: 0, variacion: 0 };
    contratistasMap[c.contratista].valor += c.valorFinal;
    contratistasMap[c.contratista].count += 1;
    contratistasMap[c.contratista].variacion += c.variacion;
  });

  const topContratistas = Object.entries(contratistasMap)
    .map(([nombre, stats]) => ({ nombre: nombre.slice(0, 35), ...stats, riesgo: stats.variacion / stats.valor * 100 }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 15);

  // Análisis de riesgo: duración vs sobrecosto
  const riesgoData = datos.contratos
    .filter(c => c.variacion > 0 && c.duracionDias > 0)
    .map(c => ({ nombre: c.contrato, duracion: c.duracionDias, sobrecosto: c.variacion, velocidad: c.velocidadSobrecosto }))
    .sort((a, b) => b.velocidad - a.velocidad)
    .slice(0, 12);

  // Distribución de sobrecostos
  const sobrecostosRangos = [
    { rango: "0-10%", count: datos.contratos.filter(c => c.pctVariacion >= 0 && c.pctVariacion <= 10).length },
    { rango: "10-20%", count: datos.contratos.filter(c => c.pctVariacion > 10 && c.pctVariacion <= 20).length },
    { rango: "20-50%", count: datos.contratos.filter(c => c.pctVariacion > 20 && c.pctVariacion <= 50).length },
    { rango: ">50%", count: datos.contratos.filter(c => c.pctVariacion > 50).length },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", color: C.navy }}>
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius: 12, padding: "20px 24px", marginBottom: 18, color: "white" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.cyan, letterSpacing: 2, fontWeight: 700 }}>📋 CONTRATACIÓN PÚBLICA — SECOP II</div>
          <h2 style={{ margin: "6px 0", fontSize: 20, fontWeight: 800 }}>Análisis Integral de Contratos</h2>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <KpiCard emoji="📊" label="Total Contratos" valor={datos.totalContratos} color={C.cyan} />
          <KpiCard emoji="💰" label="Valor Final" valor={fmtCOP(datos.valorFinalTotal)} color={C.verde} />
          <KpiCard emoji="⚠️" label="Variación Total" valor={fmtCOP(datos.variacionTotal)} color={datos.variacionTotal > 0 ? C.rojo : C.verde} sub={`${datos.pctVariacionGlobal.toFixed(2)}%`} />
          <KpiCard emoji="🚨" label="Sobrecostos" valor={datos.contratosSobrecosto} color={C.rojo} sub={`${datos.pctSobrecosto.toFixed(1)}%`} />
          <KpiCard emoji="⏱️" label="Duración Promedio" valor={fmtDays(Math.round(datos.duracionPromedio))} color={C.amar} />
        </div>
      </div>

      <div style={{ background: "white", borderRadius: "10px 10px 0 0", borderBottom: `2px solid ${C.border}`, display: "flex", padding: "0 12px", overflowX: "auto" }}>
        {["resumen", "sobrecostos", "contratistas", "riesgo", "tabla"].map(t => (
          <button key={t} onClick={() => setTab(t as any)} style={{ padding: "10px 14px", background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${C.cyan}` : "transparent", color: tab === t ? C.cyan : C.muted, cursor: "pointer", fontSize: 12, fontWeight: tab === t ? 700 : 500, whiteSpace: "nowrap" }}>
            {t === "resumen" && "📊 Resumen"}{t === "sobrecostos" && "⚠️ Sobrecostos"}{t === "contratistas" && "👥 Contratistas"}{t === "riesgo" && "🚨 Riesgo"}{t === "tabla" && "📋 Tabla"}
          </button>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: "0 0 10px 10px", padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
        {tab === "resumen" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📊 Distribución Sobrecostos (%)</h3>
              <ResponsiveContainer width="99%" height={250}>
                <PieChart>
                  <Pie dataKey="count" data={sobrecostosRangos} cx="50%" cy="50%" outerRadius={80} fill={C.cyan} label={({rango, count}) => `${rango}: ${count}`} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>💰 Top 10 Contratistas por Valor</h3>
              <ResponsiveContainer width="99%" height={250}>
                <BarChart data={topContratistas.slice(0, 10)} layout="vertical">
                  <XAxis type="number" width={80} />
                  <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: any) => fmtCOP(v)} />
                  <Bar dataKey="valor" fill={C.cyan} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === "sobrecostos" && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>⚠️ Top 20 Contratos con Mayor Sobrecosto</h3>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, maxHeight: 500, overflow: "auto" }}>
              {datos.contratos.filter(c => c.variacion > 0).slice(0, 20).map((c, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, borderLeft: `3px solid ${C.rojo}`, background: i % 2 === 0 ? "white" : "#fafafa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{c.contrato} — {c.contratista.slice(0, 30)}</div>
                    <div style={{ color: C.rojo, fontWeight: 800 }}>{fmtCOP(c.variacion)}</div>
                  </div>
                  <div style={{ fontSize: 10, color: C.muted }}>Inicial: {fmtCOP(c.valorInicial)} → Final: {fmtCOP(c.valorFinal)} | {c.pctVariacion.toFixed(1)}% | {fmtDays(c.duracionDias)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "contratistas" && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>👥 Análisis de Contratistas (Top 15)</h3>
            <ResponsiveContainer width="99%" height={400}>
              <BarChart data={topContratistas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 9 }} />
                <YAxis />
                <Tooltip formatter={(v: any) => fmtCOP(v)} />
                <Bar dataKey="valor" fill={C.cyan} name="Valor Total" />
                <Bar dataKey="variacion" fill={C.rojo} name="Variación Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === "riesgo" && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🚨 Análisis Riesgo: Duración vs Sobrecosto por Día</h3>
            <ResponsiveContainer width="99%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="duracion" name="Duración (días)" />
                <YAxis dataKey="velocidad" name="Sobrecosto/día" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v: any) => typeof v === "number" ? v.toFixed(0) : v} />
                <Scatter data={riesgoData} fill={C.rojo} name="Riesgo" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === "tabla" && (
          <div>
            <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
              <input type="text" placeholder="Buscar contrato o contratista..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, background: "white" }}>
                <option>TODOS</option>
                {estadosUnicos.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, maxHeight: 600, overflow: "auto", fontSize: 11 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                  <tr>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>Contrato</th>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>Contratista</th>
                    <th style={{ padding: "10px", textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>Valor Inicial</th>
                    <th style={{ padding: "10px", textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>Valor Final</th>
                    <th style={{ padding: "10px", textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>Variación</th>
                    <th style={{ padding: "10px", textAlign: "center", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>Duración</th>
                    <th style={{ padding: "10px", textAlign: "left", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {contratosFiltrados.slice(0, 100).map((c, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>{c.contrato}</td>
                      <td style={{ padding: "8px 10px" }}>{c.contratista.slice(0, 25)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtCOP(c.valorInicial)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtCOP(c.valorFinal)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: c.variacion > 0 ? C.rojo : C.verde, fontWeight: 700 }}>{fmtCOP(c.variacion)} ({c.pctVariacion.toFixed(1)}%)</td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>{fmtDays(c.duracionDias)}</td>
                      <td style={{ padding: "8px 10px", fontSize: 10, color: C.muted }}>{c.estado.slice(0, 15)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
