import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const C = { navy: "#1a2742", cyan: "#5dade2", verde: "#27ae60", amar: "#f39c12", rojo: "#e74c3c", muted: "#7f8c8d", bg: "#f0f2f5", border: "#e8edf2" };
const fmtCOP = (v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${(v / 1e3).toFixed(0)}K`;

interface Contrato {
  contrato: string;
  contratista: string;
  fechaInicial: string;
  valorInicial: number;
  valorFinal: number;
  estado: string;
  sobrecosto?: number;
  pctSobrecosto?: number;
}

interface ResumenContratos {
  totalContratos: number;
  valorInicialTotal: number;
  valorFinalTotal: number;
  variacionValor: number;
  pctVariacion: number;
  estados: Record<string, number>;
  topContratistas: Record<string, number>;
  contratosSobrecostoCount: number;
  totalSobrecosto: number;
  contratos: Contrato[];
}

function procesarContratos(data: any[][]): ResumenContratos {
  const headers = data[0].map(h => String(h || "").toUpperCase());
  const rows = data.slice(1);

  const col = (term: string) => headers.findIndex(h => h.includes(term));
  const iContrato = col("CONTRATO");
  const iContratista = col("NOMBRE");
  const iValorIni = col("VALOR INICIAL");
  const iValorFin = col("VALOR FINAL");
  const iEstado = col("ESTADO");

  const contratos: Contrato[] = [];
  const estadosMap: Record<string, number> = {};
  const contratistasMap: Record<string, number> = {};
  let totalValorIni = 0, totalValorFin = 0;

  for (const row of rows) {
    if (!row[iContrato]) continue;

    const valorIni = Number(row[iValorIni]) || 0;
    const valorFin = Number(row[iValorFin]) || 0;
    const contrato: Contrato = {
      contrato: String(row[iContrato] || "").trim(),
      contratista: String(row[iContratista] || "N/D").trim(),
      fechaInicial: String(row[col("FECHA INICIAL")] || "").trim(),
      valorInicial: valorIni,
      valorFinal: valorFin,
      estado: String(row[iEstado] || "POR DEFINIR").trim(),
      sobrecosto: valorFin - valorIni,
      pctSobrecosto: valorIni > 0 ? ((valorFin - valorIni) / valorIni * 100) : 0,
    };

    contratos.push(contrato);
    totalValorIni += valorIni;
    totalValorFin += valorFin;

    const estado = contrato.estado.toUpperCase().trim();
    estadosMap[estado] = (estadosMap[estado] || 0) + 1;

    contratistasMap[contrato.contratista] = (contratistasMap[contrato.contratista] || 0) + valorFin;
  }

  const topContratistas: Record<string, number> = {};
  Object.entries(contratistasMap).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => { topContratistas[k] = v; });

  const contratosSobrecosto = contratos.filter(c => (c.sobrecosto || 0) > 0);
  const totalSobrecosto = contratosSobrecosto.reduce((sum, c) => sum + (c.sobrecosto || 0), 0);

  return {
    totalContratos: contratos.length,
    valorInicialTotal: totalValorIni,
    valorFinalTotal: totalValorFin,
    variacionValor: totalValorFin - totalValorIni,
    pctVariacion: totalValorIni > 0 ? ((totalValorFin - totalValorIni) / totalValorIni * 100) : 0,
    estados: estadosMap,
    topContratistas,
    contratosSobrecostoCount: contratosSobrecosto.length,
    totalSobrecosto,
    contratos,
  };
}

const KpiCard = ({ emoji, label, valor, color }: any) => (
  <div style={{ background: "white", borderRadius: 10, padding: "14px 18px", borderLeft: `3px solid ${color}`, flex: 1, minWidth: 130, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
    <div style={{ fontSize: 22 }}>{emoji}</div>
    <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1, marginTop: 4 }}>{valor}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, marginTop: 3 }}>{label}</div>
  </div>
);

export default function Contratacion() {
  const [tab, setTab] = useState<"resumen" | "sobrecostos" | "contratistas">("resumen");
  const [datos, setDatos] = useState<ResumenContratos | null>(null);
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
        <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius: 16, padding: "32px 40px", textAlign: "center", color: "white", maxWidth: 520, width: "100%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Contratación — Análisis Integral</h3>
          <p style={{ margin: "0 0 28px", fontSize: 13, color: "rgba(255,255,255,.65)" }}>Carga el archivo SECOP II consolidado</p>
          <div onClick={() => inputRef.current?.click()} style={{ border: "2px dashed rgba(93,173,226,.5)", borderRadius: 12, padding: "28px 20px", cursor: "pointer", marginBottom: 20, background: "rgba(93,173,226,.08)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 13, color: "#85c1e9", fontWeight: 600 }}>Arrastra Excel aquí o haz clic</div>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) procesar(e.target.files[0]); }} />
        </div>
      </div>
    );
  }

  const estadosData = Object.entries(datos.estados).map(([k, v]) => ({ nombre: k.slice(0, 15), cantidad: v })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 8);
  const contratistasData = Object.entries(datos.topContratistas).map(([k, v]) => ({ nombre: k.slice(0, 25), valor: v }));
  const sobrecostosTop = datos.contratos.filter(c => (c.sobrecosto || 0) > 0).sort((a, b) => (b.sobrecosto || 0) - (a.sobrecosto || 0)).slice(0, 10);

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", color: C.navy }}>
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, borderRadius: 12, padding: "20px 24px", marginBottom: 18, color: "white" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.cyan, letterSpacing: 2, fontWeight: 700 }}>📋 CONTRATACIÓN PÚBLICA</div>
          <h2 style={{ margin: "6px 0", fontSize: 20, fontWeight: 800 }}>Análisis Integral SECOP II</h2>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <KpiCard emoji="📊" label="Total Contratos" valor={datos.totalContratos} color={C.cyan} />
          <KpiCard emoji="💰" label="Valor Final" valor={fmtCOP(datos.valorFinalTotal)} color={C.verde} />
          <KpiCard emoji="⚠️" label="Sobrecostos" valor={fmtCOP(datos.totalSobrecosto)} color={C.rojo} />
          <KpiCard emoji="📈" label="Variación" valor={`${datos.pctVariacion.toFixed(2)}%`} color={datos.pctVariacion > 0 ? C.rojo : C.verde} />
        </div>
      </div>

      <div style={{ background: "white", borderRadius: "10px 10px 0 0", borderBottom: `2px solid ${C.border}`, display: "flex", padding: "0 16px" }}>
        {["resumen", "sobrecostos", "contratistas"].map(t => (
          <button key={t} onClick={() => setTab(t as any)} style={{ padding: "12px 16px", background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${C.cyan}` : "transparent", color: tab === t ? C.cyan : C.muted, cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 700 : 500 }}>
            {t === "resumen" && "📊 Resumen"}{t === "sobrecostos" && "⚠️ Sobrecostos"}{t === "contratistas" && "👥 Top Contratistas"}
          </button>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: "0 0 10px 10px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
        {tab === "resumen" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Estados de Contratos</h3>
              <ResponsiveContainer width="99%" height={250}>
                <PieChart>
                  <Pie dataKey="cantidad" data={estadosData} cx="50%" cy="50%" outerRadius={70} fill={C.cyan} label />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top 10 Contratistas</h3>
              <ResponsiveContainer width="99%" height={250}>
                <BarChart data={contratistasData} layout="vertical">
                  <XAxis type="number" width={60} />
                  <YAxis dataKey="nombre" type="category" width={120} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: any) => fmtCOP(v)} />
                  <Bar dataKey="valor" fill={C.cyan} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === "sobrecostos" && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top 10 Contratos con Mayor Sobrecosto</h3>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              {sobrecostosTop.map((c, i) => (
                <div key={i} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, borderLeft: `3px solid ${C.rojo}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{c.contrato} — {c.contratista.slice(0, 35)}</div>
                    <div style={{ color: C.rojo, fontWeight: 800 }}>{fmtCOP(c.sobrecosto || 0)}</div>
                  </div>
                  <div style={{ fontSize: 10, color: C.muted }}>Inicial: {fmtCOP(c.valorInicial)} → Final: {fmtCOP(c.valorFinal)} ({(c.pctSobrecosto || 0).toFixed(1)}%)</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "contratistas" && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Top Contratistas por Valor</h3>
            <ResponsiveContainer width="99%" height={400}>
              <BarChart data={contratistasData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 9 }} />
                <YAxis />
                <Tooltip formatter={(v: any) => fmtCOP(v)} />
                <Bar dataKey="valor" fill={C.cyan} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
