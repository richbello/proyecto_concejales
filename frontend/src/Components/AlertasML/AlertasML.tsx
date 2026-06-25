/**
 * AlertasML.tsx
 * Módulo de Alertas de Inteligencia Artificial
 * Dashboard Control Político — FDL Usme 2026
 *
 * Paleta sincronizada con App.tsx:
 *   navy     #1a2742
 *   cyan     #5dade2
 *   body bg  #f0f2f5
 */

import { useState, useEffect } from "react";
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
  mensaje: string;
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

// ─── PALETA — idéntica a App.tsx ──────────────────────────────
const C = {
  navy:    "#1a2742",
  navyLt:  "#1e3a5f",
  navyMid: "#243656",
  cyan:    "#5dade2",
  cyanLt:  "#85c1e9",
  verde:   "#27ae60",
  verdeLt: "#a9dfbf",
  amar:    "#f39c12",
  amarLt:  "#fdebd0",
  rojo:    "#e74c3c",
  rojoLt:  "#fadbd8",
  texto:   "#2c3e50",
  muted:   "#7f8c8d",
  border:  "rgba(255,255,255,.1)",
  bg:      "#f0f2f5",
};

// ─── DATOS DEMO (reemplazar con fetch al backend) ──────────────
const ALERTAS_PAC: AlertaPAC[] = [
  { rubro:"Adquisición de Servicios",        codigo:"2-2-3", pct_ejecucion:42.5, pct_cierre_estimado:56.7, nivel:"ROJO",     confianza:94, mensaje:"Ejecución del 42.5% vs PAC a mes 8. Rezago severo proyectado. Requiere informe urgente al Edil y plan de contingencia." },
  { rubro:"Construcción de Infraestructura", codigo:"2-4-5", pct_ejecucion:58.1, pct_cierre_estimado:70.2, nivel:"ROJO",     confianza:89, mensaje:"Solo 58.1% ejecutado. Riesgo alto de rezago en infraestructura al cierre de vigencia." },
  { rubro:"Transferencias Corrientes",       codigo:"2-2-4", pct_ejecucion:61.3, pct_cierre_estimado:74.5, nivel:"ROJO",     confianza:85, mensaje:"Transferencias al 61.3%. Plan de contingencia requerido antes de mes 10." },
  { rubro:"Compra de Equipos",               codigo:"2-4-6", pct_ejecucion:72.4, pct_cierre_estimado:82.1, nivel:"AMARILLO", confianza:78, mensaje:"Riesgo moderado. Revisar procesos SECOP II en curso para equipos pendientes." },
  { rubro:"Adquisición de Bienes",           codigo:"2-2-2", pct_ejecucion:79.8, pct_cierre_estimado:88.3, nivel:"AMARILLO", confianza:71, mensaje:"Leve rezago. Acelerar compromisos antes del cierre del tercer trimestre." },
  { rubro:"Gastos de Personal",              codigo:"2-2-1", pct_ejecucion:94.2, pct_cierre_estimado:97.8, nivel:"VERDE",    confianza:96, mensaje:"Ejecución al día. Sin riesgo detectado a 4 meses del cierre." },
  { rubro:"Gastos Generales",                codigo:"2-2-5", pct_ejecucion:91.5, pct_cierre_estimado:96.1, nivel:"VERDE",    confianza:93, mensaje:"Ejecución normal. Sin alertas detectadas por el modelo." },
];

const ANOMALIAS: AnomaliaContrato[] = [
  { id:"FDL-USME-2089-2026", proveedor:"CONSTRUCTORA ANDINA SAS",        nit:"900111222-1", monto:1_450_000_000, modalidad:"Contratación Directa",  score:91, nivel:"ROJO",     razones:["Monto $1.450M con directa — debería ser licitación","Tramitado en 2 días hábiles","Pago en cierre de trimestre"],     fecha:"28/06/2026" },
  { id:"FDL-USME-1934-2026", proveedor:"SUMINISTROS DISTRITALES SA",     nit:"800555666-8", monto:32_800_000,   modalidad:"Mínima Cuantía",         score:84, nivel:"ROJO",     razones:["Fraccionamiento: $32.8M = 95% mínima cuantía","Mismo proveedor 4 contratos en 30 días"],                               fecha:"15/06/2026" },
  { id:"FDL-USME-1876-2026", proveedor:"OBRAS Y PROYECTOS COLOMBIA SAS", nit:"900334455-0", monto:890_000_000,  modalidad:"Selección Abreviada",    score:79, nivel:"ROJO",     razones:["5 adendas post-firma inusuales","Concentra 28% del gasto total contratado en 2026"],                                     fecha:"02/06/2026" },
  { id:"FDL-USME-1754-2026", proveedor:"CONSULTORÍA BOGOTÁ SAS",         nit:"800777888-2", monto:210_000_000,  modalidad:"Contratación Directa",   score:62, nivel:"AMARILLO", razones:["Monto sobre promedio histórico del proveedor","Pago registrado en fin de semana"],                                        fecha:"21/05/2026" },
  { id:"FDL-USME-1698-2026", proveedor:"MANTENIMIENTO URBANO SAS",       nit:"900112233-7", monto:156_000_000,  modalidad:"Mínima Cuantía",         score:55, nivel:"AMARILLO", razones:["6 contratos en 45 días con el mismo proveedor"],                                                                           fecha:"10/05/2026" },
  { id:"FDL-USME-1621-2026", proveedor:"TECNOLOGÍA DISTRITAL LTDA",      nit:"800556677-3", monto:98_000_000,   modalidad:"Menor Cuantía",          score:22, nivel:"VERDE",    razones:[],                                                                                                                           fecha:"03/05/2026" },
];

const TENDENCIA = [
  { mes:"Ene", pac:8.3,  ejec:5.1  }, { mes:"Feb", pac:16.7, ejec:10.4 },
  { mes:"Mar", pac:26.2, ejec:17.2 }, { mes:"Abr", pac:36.8, ejec:24.8 },
  { mes:"May", pac:47.5, ejec:33.1 }, { mes:"Jun", pac:58.9, ejec:42.3 },
  { mes:"Jul", pac:70.4, ejec:50.8 }, { mes:"Ago", pac:81.6, ejec:59.7 },
  { mes:"Sep", pac:90.8, ejec:null  }, { mes:"Oct", pac:95.2, ejec:null  },
  { mes:"Nov", pac:98.1, ejec:null  }, { mes:"Dic", pac:100,  ejec:null  },
];

const CONCENTRACION = [
  { proveedor:"Obras y Proyectos",   pct:28.1, alertas:3 },
  { proveedor:"Constructora Andina", pct:19.4, alertas:2 },
  { proveedor:"Suministros Dist.",   pct:14.2, alertas:4 },
  { proveedor:"Consultoría Bogotá",  pct:11.8, alertas:1 },
  { proveedor:"Otros proveedores",   pct:26.5, alertas:1 },
];

// ─── HELPERS ──────────────────────────────────────────────────
const nColor  = (n: string) => n === "ROJO" ? C.rojo : n === "AMARILLO" ? C.amar : C.verde;
const nBg     = (n: string) => n === "ROJO" ? C.rojoLt : n === "AMARILLO" ? C.amarLt : C.verdeLt;
const nEmoji  = (n: string) => n === "ROJO" ? "🔴" : n === "AMARILLO" ? "🟡" : "🟢";
const fmtCOP  = (v: number) =>
  v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(0)}M` : `$${(v/1e3).toFixed(0)}K`;

// ─── SUB-COMPONENTES ──────────────────────────────────────────
const Badge = ({ nivel }: { nivel: string }) => (
  <span style={{
    background: nBg(nivel), color: nColor(nivel),
    padding: "2px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const,
    border: `1px solid ${nColor(nivel)}40`,
  }}>
    {nEmoji(nivel)} {nivel}
  </span>
);

const ScoreBar = ({ score, nivel }: { score: number; nivel: string }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
    <div style={{ flex:1, height:5, background:"#dce3ea", borderRadius:3, overflow:"hidden" }}>
      <div style={{
        width:`${score}%`, height:"100%",
        background: nColor(nivel), borderRadius:3,
        transition:"width .5s ease",
      }}/>
    </div>
    <span style={{ fontSize:11, fontWeight:700, color:nColor(nivel), minWidth:36 }}>
      {score}/100
    </span>
  </div>
);

const KpiCard = ({ emoji, label, valor, color, sub }: {
  emoji:string; label:string; valor:string|number; color:string; sub?:string;
}) => (
  <div style={{
    background:"white", borderRadius:10, padding:"14px 18px",
    borderLeft:`3px solid ${color}`, flex:1, minWidth:130,
    boxShadow:"0 2px 8px rgba(0,0,0,.06)",
  }}>
    <div style={{ fontSize:22 }}>{emoji}</div>
    <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1, marginTop:4 }}>{valor}</div>
    <div style={{ fontSize:12, fontWeight:600, color:C.texto, marginTop:3 }}>{label}</div>
    {sub && <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{sub}</div>}
  </div>
);

const TooltipCustom = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:"white", border:`1px solid #dce3ea`,
      borderRadius:8, padding:"10px 14px", fontSize:12, boxShadow:"0 4px 12px rgba(0,0,0,.1)",
    }}>
      <div style={{ fontWeight:700, color:C.navy, marginBottom:4 }}>{label}</div>
      {payload.map((p:any, i:number) => (
        <div key={i} style={{ color:p.color }}>
          {p.name}: <strong>{typeof p.value==="number" ? p.value.toFixed(1)+"%" : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function AlertasML() {
  const [tab, setTab]     = useState<"pac"|"contratos"|"tendencia"|"concentracion">("pac");
  const [filtro, setFiltro] = useState<"TODOS"|"ROJO"|"AMARILLO"|"VERDE">("TODOS");
  const [detPAC, setDetPAC]       = useState<AlertaPAC | null>(null);
  const [detContr, setDetContr]   = useState<AnomaliaContrato | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated]       = useState(new Date());

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setUpdated(new Date()); }, 1000);
  };

  const rojosPAC   = ALERTAS_PAC.filter(a=>a.nivel==="ROJO").length;
  const amarPAC    = ALERTAS_PAC.filter(a=>a.nivel==="AMARILLO").length;
  const verdPAC    = ALERTAS_PAC.filter(a=>a.nivel==="VERDE").length;
  const rojosContr = ANOMALIAS.filter(a=>a.nivel==="ROJO").length;
  const montoCrit  = ANOMALIAS.filter(a=>a.nivel==="ROJO").reduce((s,a)=>s+a.monto,0);

  const pacFilt   = filtro==="TODOS" ? ALERTAS_PAC : ALERTAS_PAC.filter(a=>a.nivel===filtro);
  const contrFilt = filtro==="TODOS" ? ANOMALIAS   : ANOMALIAS.filter(a=>a.nivel===filtro);

  const TABS = [
    { id:"pac",            label:"📊 Alertas PAC",       badge: rojosPAC+amarPAC },
    { id:"contratos",      label:"🔍 Contratos SECOP",   badge: rojosContr       },
    { id:"tendencia",      label:"📈 Tendencia",          badge: 0                },
    { id:"concentracion",  label:"🏢 Concentración",      badge: 0                },
  ] as const;

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", color:C.texto, minHeight:"100%" }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{
        background:`linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`,
        borderRadius:12, padding:"20px 24px", marginBottom:18, color:"white",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap" as const, gap:12 }}>
          <div>
            <div style={{ fontSize:10, color:C.cyan, letterSpacing:2, textTransform:"uppercase" as const, fontWeight:700 }}>
              ⚡ Inteligencia Artificial · Machine Learning
            </div>
            <h2 style={{ margin:"6px 0 4px", fontSize:20, fontWeight:800 }}>
              Alertas IA — FDL Usme 2026
            </h2>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.55)" }}>
              Detección automática de riesgos presupuestales y anomalías en contratación ·{" "}
              Actualizado {updated.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"})}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {(rojosPAC+rojosContr)>0 && (
              <div style={{
                background:"rgba(231,76,60,.2)", border:"1px solid rgba(231,76,60,.4)",
                borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, color:"#ff8a80",
              }}>
                🔔 {rojosPAC+rojosContr} alertas críticas
              </div>
            )}
            <button onClick={refresh} style={{
              background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)",
              borderRadius:8, padding:"6px 14px", color:"white", cursor:"pointer", fontSize:12,
            }}>
              {refreshing ? "⟳ Actualizando..." : "⟳ Refrescar"}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:"flex", gap:12, marginTop:18, flexWrap:"wrap" as const }}>
          <KpiCard emoji="🔴" label="Críticos PAC"      valor={rojosPAC}       color={C.rojo}  sub="rubros en rezago severo" />
          <KpiCard emoji="🟡" label="En Riesgo PAC"     valor={amarPAC}        color={C.amar}  sub="requieren seguimiento" />
          <KpiCard emoji="🟢" label="Normal"            valor={verdPAC}        color={C.verde} sub="sin alertas" />
          <KpiCard emoji="🔍" label="Contratos Alerta"  valor={rojosContr}     color={C.rojo}  sub="anomalías SECOP" />
          <KpiCard emoji="💰" label="Monto en Riesgo"   valor={fmtCOP(montoCrit)} color={C.cyan} sub="contratos críticos" />
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────── */}
      <div style={{
        background:"white", borderRadius:"10px 10px 0 0",
        borderBottom:`2px solid #e8edf2`,
        display:"flex", padding:"0 16px", gap:2,
        boxShadow:"0 2px 8px rgba(0,0,0,.06)",
      }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{ setTab(t.id); setDetPAC(null); setDetContr(null); }}
            style={{
              padding:"12px 16px", background:"transparent", border:"none",
              borderBottom: tab===t.id ? `2px solid ${C.cyan}` : "2px solid transparent",
              color: tab===t.id ? C.cyan : C.muted,
              cursor:"pointer", fontSize:13,
              fontWeight: tab===t.id ? 700 : 500,
              display:"flex", alignItems:"center", gap:6,
              whiteSpace:"nowrap" as const,
              transition:"all .2s",
            }}>
            {t.label}
            {t.badge>0 && (
              <span style={{
                background:C.rojo, color:"white",
                borderRadius:10, padding:"1px 6px",
                fontSize:10, fontWeight:700,
              }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ background:"white", borderRadius:"0 0 10px 10px", padding:"18px 20px", boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>

        {/* FILTROS */}
        {(tab==="pac"||tab==="contratos") && (
          <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" as const }}>
            <span style={{ fontSize:12, color:C.muted }}>Filtrar:</span>
            {(["TODOS","ROJO","AMARILLO","VERDE"] as const).map(n=>(
              <button key={n} onClick={()=>setFiltro(n)} style={{
                padding:"4px 14px", borderRadius:20,
                border:`1px solid ${filtro===n ? nColor(n==="TODOS"?"VERDE":n) : "#dce3ea"}`,
                background: filtro===n ? nBg(n==="TODOS"?"VERDE":n) : "transparent",
                color: filtro===n ? nColor(n==="TODOS"?"VERDE":n) : C.muted,
                cursor:"pointer", fontSize:12, fontWeight:600,
              }}>
                {n==="TODOS" ? "⚪ Todos" : `${nEmoji(n)} ${n==="ROJO"?"Crítico":n==="AMARILLO"?"Riesgo":"Normal"}`}
              </button>
            ))}
          </div>
        )}

        {/* ════════════════════════════════
            TAB 1 — ALERTAS PAC
        ════════════════════════════════ */}
        {tab==="pac" && (
          <div style={{ display:"flex", gap:18, flexWrap:"wrap" as const }}>

            {/* Lista */}
            <div style={{ flex:2, minWidth:300 }}>
              <div style={{ border:"1px solid #e8edf2", borderRadius:10, overflow:"hidden" }}>
                <div style={{
                  padding:"12px 18px", background:"#f8fafc",
                  borderBottom:"1px solid #e8edf2",
                  display:"flex", justifyContent:"space-between",
                }}>
                  <span style={{ fontWeight:700, fontSize:13, color:C.navy }}>
                    Ejecución vs PAC · Usme 2026 · Mes 8
                  </span>
                  <span style={{ fontSize:11, color:C.muted }}>{pacFilt.length} rubros</span>
                </div>

                {pacFilt.map((a,i)=>(
                  <div key={i}
                    onClick={()=>setDetPAC(detPAC?.codigo===a.codigo ? null : a)}
                    style={{
                      padding:"13px 18px",
                      borderBottom:"1px solid #f0f4f8",
                      cursor:"pointer",
                      background: detPAC?.codigo===a.codigo ? `${nBg(a.nivel)}` : "white",
                      borderLeft: detPAC?.codigo===a.codigo ? `3px solid ${nColor(a.nivel)}` : "3px solid transparent",
                      transition:"all .15s",
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.background=`${nBg(a.nivel)}80`)}
                    onMouseLeave={e=>(e.currentTarget.style.background=detPAC?.codigo===a.codigo?nBg(a.nivel):"white")}
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{a.rubro}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                          Código {a.codigo} · IA: {a.confianza}% confianza
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontWeight:800, fontSize:14, color:nColor(a.nivel) }}>
                          {a.pct_ejecucion}%
                        </span>
                        <Badge nivel={a.nivel} />
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <div style={{ flex:1, height:5, background:"#e8edf2", borderRadius:3, overflow:"hidden" }}>
                        <div style={{
                          width:`${Math.min(a.pct_ejecucion,100)}%`,
                          height:"100%", background:nColor(a.nivel), borderRadius:3,
                        }}/>
                      </div>
                      <span style={{ fontSize:10, color:C.muted, minWidth:100 }}>
                        Cierre estimado: {a.pct_cierre_estimado}%
                      </span>
                      <span style={{ fontSize:12, color:C.muted }}>›</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel derecho */}
            <div style={{ flex:1, minWidth:220, display:"flex", flexDirection:"column" as const, gap:14 }}>
              {/* Donut */}
              <div style={{ border:"1px solid #e8edf2", borderRadius:10, padding:18 }}>
                <div style={{ fontWeight:700, fontSize:13, color:C.navy, marginBottom:10 }}>
                  Distribución de alertas
                </div>
                <PieChart width={200} height={165}>
                  <Pie data={[
                    {name:"🟢 Normal",  value:verdPAC, color:C.verde},
                    {name:"🟡 Riesgo",  value:amarPAC, color:C.amar},
                    {name:"🔴 Crítico", value:rojosPAC,color:C.rojo},
                  ]} cx={100} cy={78} innerRadius={42} outerRadius={72}
                    dataKey="value" paddingAngle={3}>
                    {[C.verde,C.amar,C.rojo].map((c,i)=><Cell key={i} fill={c}/>)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }}/>
                  <Legend iconType="circle" iconSize={9}
                    formatter={v=><span style={{fontSize:11,color:C.texto}}>{v}</span>}/>
                </PieChart>
              </div>

              {/* Detalle */}
              {detPAC && (
                <div style={{
                  border:`1px solid ${nColor(detPAC.nivel)}40`,
                  background:`${nBg(detPAC.nivel)}60`,
                  borderRadius:10, padding:16,
                }}>
                  <div style={{ fontWeight:700, fontSize:13, color:nColor(detPAC.nivel), marginBottom:10 }}>
                    📋 Detalle para el Edil
                  </div>
                  <div style={{ fontSize:12, lineHeight:1.8 }}>
                    <b>Rubro:</b> {detPAC.rubro}<br/>
                    <b>Código:</b> {detPAC.codigo}<br/>
                    <b>Ejecución:</b>{" "}
                    <strong style={{color:nColor(detPAC.nivel)}}>{detPAC.pct_ejecucion}%</strong> vs PAC<br/>
                    <b>Cierre est.:</b> {detPAC.pct_cierre_estimado}%<br/>
                    <b>Confianza IA:</b> {detPAC.confianza}%
                  </div>
                  <div style={{
                    marginTop:10, padding:"10px 12px",
                    background:"rgba(0,0,0,.05)",
                    borderLeft:`3px solid ${nColor(detPAC.nivel)}`,
                    borderRadius:"0 6px 6px 0",
                    fontSize:12, lineHeight:1.6,
                  }}>
                    {detPAC.mensaje}
                  </div>
                  <button style={{
                    marginTop:12, width:"100%", padding:"9px",
                    background:C.navy, color:"white",
                    border:"none", borderRadius:8,
                    cursor:"pointer", fontSize:12, fontWeight:700,
                  }}>
                    📝 Generar Proposición de Control
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            TAB 2 — CONTRATOS SECOP
        ════════════════════════════════ */}
        {tab==="contratos" && (
          <div style={{ display:"flex", gap:18, flexWrap:"wrap" as const }}>
            <div style={{ flex:2, minWidth:300 }}>
              <div style={{ border:"1px solid #e8edf2", borderRadius:10, overflow:"hidden" }}>
                <div style={{
                  padding:"12px 18px", background:"#f8fafc",
                  borderBottom:"1px solid #e8edf2",
                  display:"flex", justifyContent:"space-between",
                }}>
                  <span style={{ fontWeight:700, fontSize:13, color:C.navy }}>
                    Contratos SECOP II — Isolation Forest
                  </span>
                  <span style={{ fontSize:11, color:C.muted }}>{contrFilt.length} contratos</span>
                </div>

                {contrFilt.map((c,i)=>(
                  <div key={i}
                    onClick={()=>setDetContr(detContr?.id===c.id ? null : c)}
                    style={{
                      padding:"13px 18px",
                      borderBottom:"1px solid #f0f4f8",
                      cursor:"pointer",
                      background: detContr?.id===c.id ? nBg(c.nivel) : "white",
                      borderLeft: detContr?.id===c.id ? `3px solid ${nColor(c.nivel)}` : "3px solid transparent",
                      transition:"all .15s",
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.background=`${nBg(c.nivel)}80`)}
                    onMouseLeave={e=>(e.currentTarget.style.background=detContr?.id===c.id?nBg(c.nivel):"white")}
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{c.proveedor}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                          {c.nit} · {c.id} · {c.fecha}
                        </div>
                      </div>
                      <div style={{ textAlign:"right" as const }}>
                        <Badge nivel={c.nivel}/>
                        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginTop:4 }}>
                          {fmtCOP(c.monto)}
                        </div>
                      </div>
                    </div>
                    <ScoreBar score={c.score} nivel={c.nivel}/>
                    {c.razones.length>0 && (
                      <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>
                        ⚠ {c.razones[0]}{c.razones.length>1?` (+${c.razones.length-1} más)`:""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex:1, minWidth:220 }}>
              {detContr ? (
                <div style={{
                  border:`1px solid ${nColor(detContr.nivel)}40`,
                  background:`${nBg(detContr.nivel)}60`,
                  borderRadius:10, padding:18,
                }}>
                  <div style={{ fontWeight:700, fontSize:13, color:nColor(detContr.nivel), marginBottom:12 }}>
                    🔍 Detalle del contrato
                  </div>
                  <div style={{ fontSize:12, lineHeight:1.8 }}>
                    <b>Referencia:</b> {detContr.id}<br/>
                    <b>Proveedor:</b> {detContr.proveedor}<br/>
                    <b>NIT:</b> {detContr.nit}<br/>
                    <b>Monto:</b> <strong style={{color:C.navy}}>{fmtCOP(detContr.monto)}</strong><br/>
                    <b>Modalidad:</b> {detContr.modalidad}<br/>
                    <b>Fecha:</b> {detContr.fecha}
                  </div>
                  <ScoreBar score={detContr.score} nivel={detContr.nivel}/>
                  {detContr.razones.length>0 && (
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:6 }}>
                        RAZONES DETECTADAS POR IA:
                      </div>
                      {detContr.razones.map((r,i)=>(
                        <div key={i} style={{
                          fontSize:11, padding:"5px 8px", marginBottom:4,
                          background:"rgba(0,0,0,.04)",
                          borderLeft:`2px solid ${nColor(detContr.nivel)}`,
                          borderRadius:"0 6px 6px 0",
                        }}>{r}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:8, marginTop:14 }}>
                    <button style={{
                      flex:1, padding:"8px",
                      background:C.rojo, color:"white",
                      border:"none", borderRadius:8,
                      cursor:"pointer", fontSize:11, fontWeight:700,
                    }}>🚨 Notificar</button>
                    <button style={{
                      flex:1, padding:"8px",
                      background:C.navy, color:"white",
                      border:"none", borderRadius:8,
                      cursor:"pointer", fontSize:11, fontWeight:700,
                    }}>📝 Proposición</button>
                  </div>
                </div>
              ) : (
                <div style={{
                  border:"1px solid #e8edf2", borderRadius:10,
                  padding:28, textAlign:"center" as const, color:C.muted,
                }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                  <div style={{ fontSize:12 }}>Selecciona un contrato para ver el detalle</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            TAB 3 — TENDENCIA
        ════════════════════════════════ */}
        {tab==="tendencia" && (
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:C.navy, marginBottom:4 }}>
              PAC vs Ejecución Real · Usme 2026
            </div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>
              La brecha entre meta PAC (azul) y ejecución real (rojo) se amplía desde enero — señal de rezago proyectado al cierre.
            </div>
            <ResponsiveContainer width="99%" height={300}>
              <LineChart data={TENDENCIA} margin={{top:10,right:20,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2"/>
                <XAxis dataKey="mes" tick={{fontSize:12,fill:C.muted}}/>
                <YAxis tickFormatter={v=>v+"%"} tick={{fontSize:11,fill:C.muted}}/>
                <Tooltip content={<TooltipCustom/>}/>
                <Legend formatter={v=><span style={{color:C.texto,fontSize:12}}>{v}</span>}/>
                <ReferenceLine y={85} stroke={C.amar} strokeDasharray="4 4"
                  label={{value:"Mínimo 85%",fill:C.amar,fontSize:10,position:"insideTopLeft"}}/>
                <Line type="monotone" dataKey="pac"  name="Meta PAC (%)"
                  stroke={C.cyan} strokeWidth={2.5} dot={{r:3,fill:C.cyan}}/>
                <Line type="monotone" dataKey="ejec" name="Ejecución Real (%)"
                  stroke={C.rojo} strokeWidth={2.5} strokeDasharray="5 3"
                  dot={{r:3,fill:C.rojo}} connectNulls={false}/>
              </LineChart>
            </ResponsiveContainer>
            <div style={{
              marginTop:14, padding:"12px 16px",
              background:C.rojoLt, borderLeft:`3px solid ${C.rojo}`,
              borderRadius:"0 8px 8px 0", fontSize:12, color:C.rojo,
            }}>
              🔴 <strong>Alerta IA:</strong> Brecha acumulada de 22.3% proyectada al cierre.
              Se recomienda debate de control político al Secretario de Hacienda Distrital antes de septiembre 2026.
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            TAB 4 — CONCENTRACIÓN
        ════════════════════════════════ */}
        {tab==="concentracion" && (
          <div style={{ display:"flex", gap:18, flexWrap:"wrap" as const }}>
            <div style={{ flex:2 }}>
              <div style={{ fontWeight:700, fontSize:14, color:C.navy, marginBottom:4 }}>
                Concentración del gasto por proveedor — Usme 2026
              </div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:18 }}>
                Proveedores con más del 20% del gasto total generan alerta automática (línea roja).
              </div>
              <ResponsiveContainer width="99%" height={240}>
                <BarChart data={CONCENTRACION} layout="vertical"
                  margin={{top:0,right:50,left:10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf2"/>
                  <XAxis type="number" tickFormatter={v=>v+"%"} tick={{fontSize:11,fill:C.muted}}/>
                  <YAxis type="category" dataKey="proveedor" width={138} tick={{fontSize:11,fill:C.texto}}/>
                  <Tooltip content={<TooltipCustom/>}/>
                  <ReferenceLine x={20} stroke={C.rojo} strokeDasharray="4 4" strokeWidth={1.5}/>
                  <Bar dataKey="pct" name="% del gasto" radius={[0,4,4,0]}>
                    {CONCENTRACION.map((e,i)=>(
                      <Cell key={i} fill={e.pct>20?C.rojo:e.pct>12?C.amar:C.cyan}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ border:"1px solid #e8edf2", borderRadius:10, padding:18 }}>
                <div style={{ fontWeight:700, fontSize:13, color:C.navy, marginBottom:12 }}>
                  🏢 Proveedores en alerta
                </div>
                {CONCENTRACION.filter(p=>p.pct>10).map((p,i)=>(
                  <div key={i} style={{ padding:"10px 0", borderBottom:"1px solid #f0f4f8" }}>
                    <div style={{ fontWeight:600, fontSize:12 }}>{p.proveedor}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:12 }}>
                      <span style={{ color:p.pct>20?C.rojo:C.amar, fontWeight:700 }}>
                        {p.pct}% del total
                      </span>
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

