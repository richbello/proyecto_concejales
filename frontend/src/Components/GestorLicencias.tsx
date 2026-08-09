import { useState, useEffect, useCallback } from "react";

const WORKER_URL = "https://controlia-licencias.richbello.workers.dev";
const ADMIN_SECRET = "xbog-admin-2026-controlia";

const C = { navy:"#0a0f1e", card:"#161d2e", cyan:"#FFD100", verde:"#00ff88", amar:"#ffd60a", rojo:"#D10D0D", muted:"#4a5568", border:"#1e2a40", texto:"#e2e8f0", sub:"#94a3b8" };
const PAL = [C.cyan, C.verde, C.amar, C.rojo, "#8b5cf6", "#f97316"];

const fmtCOP = (v:number) => v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${v}`;

const PLANES_INFO: Record<string, {label:string; precio:number; color:string; modulos:number}> = {
  demo:    { label:"DEMO",       precio:0,       color:C.muted, modulos:4  },
  basico:  { label:"EDIL BÁSICO",precio:390000,  color:C.cyan,  modulos:6  },
  pro:     { label:"EDIL PRO",   precio:690000,  color:C.verde, modulos:10 },
  concejal:{ label:"CONCEJAL",   precio:1200000, color:C.amar,  modulos:13 },
  premium: { label:"PREMIUM",    precio:2200000, color:C.rojo,  modulos:13 },
};

interface Licencia {
  clave:string; plan:string; cliente:string; localidad:string;
  activa:boolean; creada:string; expira:number|null; accesos:number; ultimoAcceso:string|null;
}

const Stat = ({icon,label,valor,color}:{icon:string;label:string;valor:string|number;color:string}) => (
  <div style={{background:C.card,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.border}`,flex:1,minWidth:110}}>
    <div style={{fontSize:20}}>{icon}</div>
    <div style={{fontSize:22,fontWeight:800,color,marginTop:4}}>{valor}</div>
    <div style={{fontSize:11,color:C.sub,marginTop:3}}>{label}</div>
  </div>
);

export default function GestorLicencias() {
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [cargando,  setCargando]  = useState(false);
  const [tab,       setTab]       = useState<"lista"|"crear">("lista");
  const [msg,       setMsg]       = useState("");
  const [msgColor,  setMsgColor]  = useState(C.verde);
  const [claveCopied, setClaveCopied] = useState("");

  // Form nueva licencia
  const [form, setForm] = useState({ plan:"demo", cliente:"", localidad:"", dias:"15" });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await fetch(WORKER_URL + "/listar", { headers:{ "X-Admin-Secret": ADMIN_SECRET } });
      const d = await r.json();
      if (d.ok) setLicencias(d.licencias.sort((a:Licencia,b:Licencia) => new Date(b.creada).getTime() - new Date(a.creada).getTime()));
    } catch { setMsg("Error conectando con el servidor."); setMsgColor(C.rojo); }
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async () => {
    if (!form.cliente.trim()) { setMsg("Ingresa el nombre del cliente."); setMsgColor(C.rojo); return; }
    setCargando(true);
    try {
      const body: any = { plan: form.plan, cliente: form.cliente, localidad: form.localidad };
      if (form.dias && Number(form.dias) > 0) body.dias = Number(form.dias);
      const r = await fetch(WORKER_URL + "/crear", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "X-Admin-Secret": ADMIN_SECRET },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg(`✅ Licencia creada: ${d.clave}`);
        setMsgColor(C.verde);
        setForm({ plan:"demo", cliente:"", localidad:"", dias:"15" });
        await cargar();
        setTab("lista");
      } else {
        setMsg("❌ " + d.error);
        setMsgColor(C.rojo);
      }
    } catch { setMsg("❌ Error de conexión."); setMsgColor(C.rojo); }
    setCargando(false);
  };

  const toggleActiva = async (lic: Licencia) => {
    try {
      await fetch(WORKER_URL + "/revocar", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "X-Admin-Secret": ADMIN_SECRET },
        body: JSON.stringify({ clave: lic.clave, activa: !lic.activa }),
      });
      await cargar();
    } catch { setMsg("Error actualizando licencia."); setMsgColor(C.rojo); }
  };

  const copiar = (clave: string) => {
    navigator.clipboard.writeText(clave);
    setClaveCopied(clave);
    setTimeout(() => setClaveCopied(""), 2000);
  };

  const stats = {
    total:   licencias.length,
    activas: licencias.filter(l => l.activa).length,
    demo:    licencias.filter(l => l.plan === "demo").length,
    pagas:   licencias.filter(l => l.plan !== "demo" && l.activa).length,
    ingresos:licencias.filter(l => l.activa && l.plan !== "demo").reduce((s,l) => s + (PLANES_INFO[l.plan]?.precio || 0), 0),
  };

  const TabBtn = ({id,label}:{id:string;label:string}) => (
    <button onClick={() => setTab(id as any)} style={{ padding:"10px 20px", background:"transparent", border:"none", borderBottom:tab===id?`2px solid ${C.cyan}`:"2px solid transparent", color:tab===id?C.cyan:C.sub, cursor:"pointer", fontSize:12, fontWeight:tab===id?700:500 }}>
      {label}
    </button>
  );

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", color:C.texto, minHeight:"100%" }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#0d1b2a 0%,#111827 100%)", borderRadius:12, padding:"18px 24px", marginBottom:16, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:10, color:C.cyan, letterSpacing:3, fontWeight:700, textTransform:"uppercase" as const }}>🔐 XBOG Technologies · Panel de Control</div>
        <h2 style={{ margin:"6px 0 4px", fontSize:20, fontWeight:900 }}>Gestor de Licencias XBOG CONTROL</h2>
        <div style={{ fontSize:11, color:C.sub }}>Administra claves de acceso para clientes de la plataforma</div>
        <div style={{ display:"flex", gap:10, marginTop:16, flexWrap:"wrap" as const }}>
          <Stat icon="🔑" label="Total licencias"  valor={stats.total}               color={C.cyan}/>
          <Stat icon="✅" label="Activas"           valor={stats.activas}             color={C.verde}/>
          <Stat icon="🎯" label="Demo activas"      valor={stats.demo}                color={C.amar}/>
          <Stat icon="💰" label="Clientes pagos"    valor={stats.pagas}               color={C.rojo}/>
          <Stat icon="📈" label="Ingresos/mes est." valor={fmtCOP(stats.ingresos)}    color="#8b5cf6"/>
        </div>
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{ background:msgColor+"22", border:`1px solid ${msgColor}44`, borderRadius:8, padding:"10px 16px", marginBottom:12, fontSize:12, color:msgColor, fontWeight:600, display:"flex", justifyContent:"space-between" }}>
          {msg}
          <button onClick={() => setMsg("")} style={{ background:"none", border:"none", color:msgColor, cursor:"pointer", fontSize:16 }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ background:C.card, borderRadius:"10px 10px 0 0", borderBottom:`1px solid ${C.border}`, display:"flex", padding:"0 12px" }}>
        <TabBtn id="lista"  label={`📋 Licencias (${licencias.length})`}/>
        <TabBtn id="crear"  label="➕ Nueva licencia"/>
        <button onClick={cargar} style={{ marginLeft:"auto", padding:"10px 14px", background:"transparent", border:"none", color:C.sub, cursor:"pointer", fontSize:12 }}>
          {cargando ? "⏳" : "🔄"} Actualizar
        </button>
      </div>

      <div style={{ background:C.card, borderRadius:"0 0 10px 10px", padding:"20px", border:`1px solid ${C.border}`, borderTop:"none" }}>

        {/* LISTA */}
        {tab === "lista" && (
          <div>
            {licencias.length === 0 && !cargando && (
              <div style={{ textAlign:"center" as const, padding:40, color:C.sub }}>No hay licencias creadas aún. Crea la primera.</div>
            )}
            <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
              {licencias.map((lic, i) => {
                const info = PLANES_INFO[lic.plan] || PLANES_INFO.demo;
                const expirada = lic.expira ? Date.now() > lic.expira : false;
                const diasRest = lic.expira ? Math.max(0, Math.ceil((lic.expira - Date.now()) / 86400000)) : null;
                return (
                  <div key={i} style={{ background:"#0d1520", borderRadius:10, padding:"14px 18px", border:`1px solid ${lic.activa && !expirada ? info.color+"44" : C.border}`, borderLeft:`3px solid ${lic.activa && !expirada ? info.color : C.muted}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap" as const, gap:10 }}>
                      <div style={{ flex:2, minWidth:200 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ background:info.color+"22", color:info.color, border:`1px solid ${info.color}44`, borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:700 }}>
                            {info.label}
                          </span>
                          {!lic.activa && <span style={{ background:C.rojo+"22", color:C.rojo, borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>SUSPENDIDA</span>}
                          {expirada && <span style={{ background:C.muted+"22", color:C.muted, borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>EXPIRADA</span>}
                        </div>
                        <div style={{ fontWeight:700, fontSize:14, color:C.texto }}>{lic.cliente}</div>
                        <div style={{ fontSize:11, color:C.sub }}>{lic.localidad}</div>
                      </div>

                      <div style={{ flex:1, minWidth:160 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                          <span style={{ fontFamily:"monospace", fontSize:12, color:C.cyan, letterSpacing:1 }}>{lic.clave}</span>
                          <button onClick={() => copiar(lic.clave)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, color:claveCopied===lic.clave?C.verde:C.sub }}>
                            {claveCopied === lic.clave ? "✅" : "📋"}
                          </button>
                        </div>
                        <div style={{ fontSize:10, color:C.sub }}>
                          Creada: {new Date(lic.creada).toLocaleDateString("es-CO")}<br/>
                          {lic.expira ? `Vence: ${new Date(lic.expira).toLocaleDateString("es-CO")} (${diasRest}d)` : "Sin vencimiento"}<br/>
                          Accesos: {lic.accesos || 0}
                        </div>
                      </div>

                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        {info.precio > 0 && <span style={{ fontSize:11, fontWeight:700, color:C.verde }}>{fmtCOP(info.precio)}/mes</span>}
                        <button onClick={() => toggleActiva(lic)} style={{ background:lic.activa ? C.rojo+"22" : C.verde+"22", border:`1px solid ${lic.activa ? C.rojo : C.verde}44`, borderRadius:6, padding:"5px 12px", color:lic.activa ? C.rojo : C.verde, cursor:"pointer", fontSize:11, fontWeight:700 }}>
                          {lic.activa ? "Suspender" : "Activar"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CREAR */}
        {tab === "crear" && (
          <div style={{ maxWidth:520 }}>
            <div style={{ fontWeight:700, fontSize:14, color:C.texto, marginBottom:20 }}>Nueva licencia de acceso</div>

            {/* Plan */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, color:C.sub, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, marginBottom:8 }}>Plan</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {Object.entries(PLANES_INFO).map(([key, info]) => (
                  <div key={key} onClick={() => { setForm(f => ({...f, plan:key, dias: key==="demo"?"15":""})); }}
                    style={{ padding:"10px 14px", borderRadius:8, border:`1.5px solid ${form.plan===key ? info.color : C.border}`, background:form.plan===key ? info.color+"11" : "transparent", cursor:"pointer" }}>
                    <div style={{ fontWeight:700, fontSize:12, color:form.plan===key ? info.color : C.sub }}>{info.label}</div>
                    <div style={{ fontSize:10, color:C.muted }}>{info.modulos} módulos · {info.precio > 0 ? fmtCOP(info.precio)+"/mes" : "Gratis"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cliente */}
            {[
              { label:"Nombre del cliente *", key:"cliente", placeholder:"Edil Juan García" },
              { label:"Localidad / municipio", key:"localidad", placeholder:"Usme · Bogotá D.C." },
              { label:"Días de vigencia (vacío = sin límite)", key:"dias", placeholder:"15" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, color:C.sub, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, marginBottom:6 }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({...p, [f.key]:e.target.value}))}
                  placeholder={f.placeholder}
                  style={{ width:"100%", background:"#0a0f1e", border:`1.5px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.texto, fontSize:12, outline:"none", boxSizing:"border-box" as const }}/>
              </div>
            ))}

            <div style={{ background:"#0a0f1e", borderRadius:8, padding:"12px 14px", marginBottom:16, fontSize:11, color:C.sub }}>
              <div style={{ fontWeight:700, color:C.texto, marginBottom:4 }}>La clave generada tendrá formato:</div>
              <div style={{ fontFamily:"monospace", color:C.cyan, fontSize:13 }}>CP-{form.plan.toUpperCase().slice(0,3)}-XXXX-XXXX-XXXX-XXXX</div>
              <div style={{ marginTop:4 }}>16 caracteres aleatorios · encriptada en Cloudflare KV</div>
            </div>

            <button onClick={crear} disabled={cargando} style={{ width:"100%", background:cargando?"#4a5568":"linear-gradient(135deg,#FFD100,#D10D0D)", border:"none", borderRadius:10, padding:"13px", color:"#0a0f1e", fontWeight:800, fontSize:14, cursor:cargando?"default":"pointer" }}>
              {cargando ? "⏳ Creando..." : "🔑 Generar licencia"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}