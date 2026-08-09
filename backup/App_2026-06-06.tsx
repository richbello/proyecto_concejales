import { useState, useEffect, useRef } from "react";

const proyectos = [
  { id:1, nombre:"Parque Ecologico El Uval", localidad:"El Uval", tipo:"Infraestructura", estado:"En Ejecucion", avance:65, coords:[4.478,-74.108], presupuesto:320000000 },
  { id:2, nombre:"Colegio Nuevo Usme IED", localidad:"Usme Centro", tipo:"Educacion", estado:"En Retraso", avance:30, coords:[4.489,-74.126], presupuesto:980000000 },
  { id:3, nombre:"Centro de Salud La Flora", localidad:"La Flora", tipo:"Salud", estado:"Finalizado", avance:100, coords:[4.501,-74.115], presupuesto:540000000 },
  { id:4, nombre:"Via Vereda Los Soches", localidad:"Los Soches", tipo:"Vias", estado:"En Ejecucion", avance:48, coords:[4.462,-74.098], presupuesto:210000000 },
  { id:5, nombre:"Acueducto Veredal Olarte", localidad:"Olarte", tipo:"Servicios", estado:"Planeado", avance:0, coords:[4.445,-74.120], presupuesto:175000000 },
  { id:6, nombre:"Salon Comunal Alfonso Lopez", localidad:"Alfonso Lopez", tipo:"Infraestructura", estado:"En Retraso", avance:20, coords:[4.510,-74.133], presupuesto:95000000 },
];
const sesiones = [
  { fecha:"2026-06-10", tipo:"Sesion Ordinaria", tema:"Control politico al IDRD por obras en Usme", acta:"SRT-PN18", sala:"Sala Principal", estado:"Proxima" },
  { fecha:"2026-06-15", tipo:"Audiencia Publica", tema:"Rendicion de cuentas presupuesto 2025", acta:"SRT-PN19", sala:"Sala Comunal", estado:"Proxima" },
  { fecha:"2026-06-22", tipo:"Debate de Control", tema:"Avance obras viales localidad Usme", acta:"SRT-PN20", sala:"Sala Principal", estado:"Proxima" },
];
const leyes = [
  { nombre:"Acuerdo de Movilidad Local", estado:"En Debate", prioridad:"alta" },
  { nombre:"Plan de Salud Territorial 2026", estado:"Aprobado", prioridad:"alta" },
  { nombre:"Reglamento Espacio Publico", estado:"Pendiente", prioridad:"media" },
  { nombre:"Fondo de Seguridad Local", estado:"En Debate", prioridad:"media" },
];
const alertasLegislativas = [
  { texto:"Informe de Gestion — vence en 2 dias", color:"#e74c3c" },
  { texto:"Contrato obra vial vencido sin liquidar", color:"#e67e22" },
  { texto:"Respuesta derecho peticion pendiente", color:"#f39c12" },
];
const denuncias = [
  { id:1, ciudadano:"Jorge Martinez", asunto:"Corrupcion en contrato de vias vereda Olarte", fecha:"2026-05-20", estado:"Investigado", avatar:"JM" },
  { id:2, ciudadano:"Luisa Fernandez", asunto:"Falta de alumbrado publico sector La Flora", fecha:"2026-05-28", estado:"En Revision", avatar:"LF" },
  { id:3, ciudadano:"Pedro Acosta", asunto:"Basura acumulada parque central Usme", fecha:"2026-06-01", estado:"En Revision", avatar:"PA" },
  { id:4, ciudadano:"Carmen Rios", asunto:"Obra incompleta salon comunal Alfonso Lopez", fecha:"2026-06-03", estado:"Recibida", avatar:"CR" },
  { id:5, ciudadano:"Hector Vargas", asunto:"Contratista no ejecuta obras pactadas", fecha:"2026-06-05", estado:"Recibida", avatar:"HV" },
];
const presupuestoSectores = [
  { sector:"Infraestructura", asignado:1200000000, ejecutado:960000000 },
  { sector:"Educacion", asignado:980000000, ejecutado:294000000 },
  { sector:"Salud", asignado:540000000, ejecutado:540000000 },
  { sector:"Vias", asignado:380000000, ejecutado:182400000 },
  { sector:"Servicios", asignado:175000000, ejecutado:0 },
];
const presupuestoAnual = [
  { ano:"2023", asignado:2800000000, ejecutado:2520000000 },
  { ano:"2024", asignado:3100000000, ejecutado:2945000000 },
  { ano:"2025", asignado:3400000000, ejecutado:2890000000 },
  { ano:"2026", asignado:3275000000, ejecutado:1976400000 },
];
const alertasSobrecosto = [
  { proyecto:"Colegio Nuevo Usme IED", tipo:"Retraso y Sobrecosto", color:"#e74c3c" },
  { proyecto:"Salon Comunal Alfonso Lopez", tipo:"Obra Paralizada", color:"#e67e22" },
  { proyecto:"Via Vereda Los Soches", tipo:"Retraso 15 dias", color:"#f39c12" },
];

const fmt = (v: number) => "$" + (v >= 1e9 ? (v/1e9).toFixed(1)+"B" : (v/1e6).toFixed(0)+"M");
const pct = (a: number, b: number) => b > 0 ? Math.round((a/b)*100) : 0;
const estadoColor: Record<string,string> = {
  "En Ejecucion":"#1abc9c","En Retraso":"#e74c3c","Finalizado":"#3498db","Planeado":"#95a5a6",
  "Investigado":"#8e44ad","En Revision":"#e67e22","Recibida":"#3498db",
  "En Debate":"#e67e22","Aprobado":"#1abc9c","Pendiente":"#95a5a6",
};
const tipoIcon: Record<string,string> = {
  "Infraestructura":"I","Educacion":"E","Salud":"S","Vias":"V","Servicios":"S2"
};

export default function App() {
  const [tab, setTab] = useState("mapa");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const mapInitialized = useRef(false);
  const chartInstances = useRef<any>({});

  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const ljs = document.createElement("script");
    ljs.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    document.head.appendChild(ljs);
    const cjs = document.createElement("script");
    cjs.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
    document.head.appendChild(cjs);
  }, []);

  useEffect(() => {
    if (tab === "mapa") {
      setTimeout(() => {
        const L = (window as any).L;
        if (!L || !document.getElementById("map")) return;
        if (mapInitialized.current) return;
        const map = L.map("map").setView([4.478, -74.113], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
        const colMap: Record<string,string> = { "En Ejecucion":"#1abc9c","En Retraso":"#e74c3c","Finalizado":"#3498db","Planeado":"#95a5a6" };
        proyectos.forEach(p => {
          const icon = L.divIcon({
            html: `<div style="background:${colMap[p.estado]};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
            className:"", iconAnchor:[7,7]
          });
          L.marker(p.coords, { icon }).addTo(map).bindPopup(
            "<div style='font-family:Segoe UI,sans-serif;min-width:180px'>" +
            "<div style='font-weight:700;font-size:13px;margin-bottom:6px'>" + p.nombre + "</div>" +
            "<div style='font-size:12px;color:#555;margin-bottom:2px'>Localidad: " + p.localidad + "</div>" +
            "<div style='font-size:12px;margin-bottom:2px'>Estado: <b style='color:" + colMap[p.estado] + "'>" + p.estado + "</b></div>" +
            "<div style='font-size:12px;margin-bottom:6px'>Avance: <b>" + p.avance + "%</b></div>" +
            "<div style='background:#eee;border-radius:4px;height:6px;margin-bottom:6px'>" +
            "<div style='background:" + colMap[p.estado] + ";width:" + p.avance + "%;height:6px;border-radius:4px'></div></div>" +
            "<div style='font-size:11px;color:#888'>Presupuesto: " + fmt(p.presupuesto) + "</div></div>"
          );
        });
        mapInitialized.current = true;
      }, 900);
    }
    if (tab === "presupuesto") {
      setTimeout(() => {
        const Chart = (window as any).Chart;
        if (!Chart) return;
        const donaEl = document.getElementById("chartDona") as HTMLCanvasElement;
        if (donaEl) {
          if (chartInstances.current.dona) chartInstances.current.dona.destroy();
          chartInstances.current.dona = new Chart(donaEl, {
            type:"doughnut",
            data:{ labels:presupuestoSectores.map(p=>p.sector),
              datasets:[{ data:presupuestoSectores.map(p=>p.asignado),
                backgroundColor:["#3498db","#1abc9c","#e74c3c","#e67e22","#9b59b6"], borderWidth:2 }] },
            options:{ plugins:{ legend:{ position:"right", labels:{ font:{ size:11 } } } }, cutout:"65%" }
          });
        }
        const barEl = document.getElementById("chartBar") as HTMLCanvasElement;
        if (barEl) {
          if (chartInstances.current.bar) chartInstances.current.bar.destroy();
          chartInstances.current.bar = new Chart(barEl, {
            type:"bar",
            data:{ labels:presupuestoAnual.map(p=>p.ano),
              datasets:[
                { label:"Asignado", data:presupuestoAnual.map(p=>p.asignado), backgroundColor:"rgba(52,152,219,.7)", borderRadius:4 },
                { label:"Ejecutado", data:presupuestoAnual.map(p=>p.ejecutado), backgroundColor:"rgba(26,188,156,.7)", borderRadius:4 }
              ] },
            options:{ plugins:{ legend:{ labels:{ font:{ size:11 } } } },
              scales:{ y:{ ticks:{ callback:(v: number)=>fmt(v) }, grid:{ color:"#f0f0f0" } } } }
          });
        }
      }, 400);
    }
  }, [tab]);

  const proyectosFiltrados = proyectos.filter(p =>
    (filtroTipo === "Todos" || p.tipo === filtroTipo) &&
    (filtroEstado === "Todos" || p.estado === filtroEstado)
  );
  const totalAsignado = presupuestoSectores.reduce((a,p)=>a+p.asignado,0);
  const totalEjecutado = presupuestoSectores.reduce((a,p)=>a+p.ejecutado,0);
  const pctEjec = pct(totalEjecutado, totalAsignado);

  const navItems = [
    { key:"mapa", label:"Mapa de Proyectos", icon:"M" },
    { key:"sesiones", label:"Panel Legislativo", icon:"L" },
    { key:"denuncias", label:"Denuncias Ciudadanas", icon:"D" },
    { key:"presupuesto", label:"Analisis Presupuestal", icon:"P" },
  ];

  const card: any = { background:"white", borderRadius:10, padding:"16px 20px", boxShadow:"0 1px 6px rgba(0,0,0,.07)" };
  const badge = (c:string): any => ({ fontSize:11, padding:"2px 8px", borderRadius:12, fontWeight:600, background:c+"22", color:c, display:"inline-block" });
  const statCard = (c:string): any => ({ background:c, color:"white", borderRadius:10, padding:"14px 18px", textAlign:"center" });

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'Segoe UI',sans-serif",background:"#f0f2f5",color:"#2c3e50"}}>
      <aside style={{width:230,background:"#1a2742",color:"white",display:"flex",flexDirection:"column",boxShadow:"3px 0 10px rgba(0,0,0,.2)"}}>
        <div style={{padding:"20px 16px",borderBottom:"1px solid rgba(255,255,255,.1)"}}>
          <div style={{fontSize:28}}>M</div>
          <div style={{fontSize:11,fontWeight:700,color:"#5dade2",textTransform:"uppercase",letterSpacing:2,marginTop:8}}>Control Politico</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>Codespage 2026</div>
        </div>
        <ul style={{listStyle:"none",padding:0,margin:0,flex:1,paddingTop:8}}>
          {navItems.map(n => (
            <li key={n.key} onClick={()=>setTab(n.key)} style={{padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:13.5,
              background:tab===n.key?"rgba(93,173,226,.2)":"transparent",
              borderLeft:tab===n.key?"3px solid #5dade2":"3px solid transparent",
              color:tab===n.key?"#5dade2":"rgba(255,255,255,.75)",transition:"all 0.2s"}}>
              {n.label}
            </li>
          ))}
        </ul>
        <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,.1)",fontSize:11,color:"rgba(255,255,255,.4)"}}>Alcaldia Local de Usme</div>
      </aside>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:"#1a2742",color:"white",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 8px rgba(0,0,0,.15)"}}>
          <div>
            <div style={{fontWeight:700,fontSize:18}}>{navItems.find(n=>n.key===tab)?.label}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Localidad de Usme · Bogota D.C.</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:11,background:"rgba(255,255,255,.1)",padding:"4px 10px",borderRadius:6}}>
              {new Date().toLocaleDateString("es-CO")}
            </span>
            <div style={{width:34,height:34,borderRadius:"50%",background:"#5dade2",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>RB</div>
          </div>
        </div>

        <div style={{flex:1,padding:20,overflowY:"auto"}}>

          {tab==="mapa" && (
            <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16,height:"calc(100vh - 120px)"}}>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={card}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Estado de Proyectos</div>
                  {[["En Ejecucion","#1abc9c"],["En Retraso","#e74c3c"],["Finalizado","#3498db"],["Planeado","#95a5a6"]].map(([est,col])=>(
                    <div key={est} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <div style={{width:12,height:12,borderRadius:"50%",background:col}}/>
                      <span style={{fontSize:12}}>{est} ({proyectos.filter(p=>p.estado===est).length})</span>
                    </div>
                  ))}
                </div>
                <div style={card}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Filtros</div>
                  <div style={{fontSize:12,color:"#888",marginBottom:4}}>Tipo</div>
                  <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
                    style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #ddd",fontSize:12,marginBottom:10}}>
                    {["Todos","Infraestructura","Educacion","Salud","Vias","Servicios"].map(t=><option key={t}>{t}</option>)}
                  </select>
                  <div style={{fontSize:12,color:"#888",marginBottom:4}}>Estado</div>
                  <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}
                    style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #ddd",fontSize:12}}>
                    {["Todos","En Ejecucion","En Retraso","Finalizado","Planeado"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{...card,flex:1,overflowY:"auto"}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Proyectos ({proyectosFiltrados.length})</div>
                  {proyectosFiltrados.map(p=>(
                    <div key={p.id} style={{borderBottom:"1px solid #f0f0f0",paddingBottom:8,marginBottom:8}}>
                      <div style={{fontSize:12,fontWeight:600}}>{p.nombre}</div>
                      <div style={{fontSize:11,color:"#888",margin:"2px 0"}}>{p.localidad}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1,background:"#eee",borderRadius:3,height:5}}>
                          <div style={{background:estadoColor[p.estado],width:p.avance+"%",height:5,borderRadius:3}}/>
                        </div>
                        <span style={{fontSize:11,fontWeight:600}}>{p.avance}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div id="map" style={{borderRadius:10,boxShadow:"0 2px 10px rgba(0,0,0,.1)"}}/>
            </div>
          )}

          {tab==="sesiones" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={card}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:14,borderBottom:"2px solid #5dade2",paddingBottom:8}}>Proximas Sesiones</div>
                {sesiones.map((ses,i)=>(
                  <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid #f5f5f5"}}>
                    <div style={{background:"#1a2742",color:"white",borderRadius:8,padding:"8px 10px",textAlign:"center",minWidth:48}}>
                      <div style={{fontSize:16,fontWeight:700}}>{ses.fecha.split("-")[2]}</div>
                      <div style={{fontSize:10}}>{["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][parseInt(ses.fecha.split("-")[1])]}</div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:"#5dade2",fontWeight:600}}>{ses.tipo} · {ses.acta}</div>
                      <div style={{fontSize:13,fontWeight:500,margin:"2px 0"}}>{ses.tema}</div>
                      <div style={{fontSize:11,color:"#888"}}>{ses.sala}</div>
                    </div>
                    <span style={badge("#1abc9c")}>{ses.estado}</span>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:14,borderBottom:"2px solid #5dade2",paddingBottom:8}}>Proyectos de Acuerdo</div>
                {leyes.map((l,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f5f5f5"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:estadoColor[l.estado]}}/>
                      <span style={{fontSize:13}}>{l.nombre}</span>
                    </div>
                    <span style={badge(estadoColor[l.estado])}>{l.estado}</span>
                  </div>
                ))}
              </div>
              <div style={{...card,gridColumn:"1/-1"}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:12,borderBottom:"2px solid #e74c3c",paddingBottom:8}}>Alertas Legislativas</div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  {alertasLegislativas.map((a,i)=>(
                    <div key={i} style={{flex:1,minWidth:200,background:a.color+"11",border:"1px solid "+a.color+"44",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{color:a.color,fontSize:16}}>!</span>
                      <span style={{fontSize:12,color:a.color,fontWeight:600}}>{a.texto}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab==="denuncias" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {([["Recibidas",denuncias.length,"#3498db"],["En Proceso",denuncias.filter(d=>d.estado==="En Revision").length,"#e67e22"],["Resueltas",denuncias.filter(d=>d.estado==="Investigado").length,"#1abc9c"]] as [string,number,string][]).map(([label,val,col])=>(
                  <div key={label} style={statCard(col)}>
                    <div style={{fontSize:32,fontWeight:700}}>{val}</div>
                    <div style={{fontSize:12,opacity:.85}}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:14,borderBottom:"2px solid #5dade2",paddingBottom:8}}>Querellas Ciudadanas</div>
                {denuncias.map(d=>(
                  <div key={d.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #f5f5f5"}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:"#1a2742",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{d.avatar}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{d.asunto}</div>
                      <div style={{fontSize:11,color:"#888",marginTop:2}}>{d.ciudadano} · {d.fecha}</div>
                    </div>
                    <span style={badge(estadoColor[d.estado])}>{d.estado}</span>
                    <button style={{background:"#5dade2",color:"white",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:600}}>VER</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==="presupuesto" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={card}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:12,borderBottom:"2px solid #5dade2",paddingBottom:8}}>Ejecucion por Sector</div>
                <canvas id="chartDona" style={{maxHeight:220}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={card}>
                  <div style={{fontSize:12,color:"#888"}}>Presupuesto Total Asignado</div>
                  <div style={{fontSize:24,fontWeight:700,color:"#1a2742",margin:"4px 0"}}>{fmt(totalAsignado)}</div>
                  <div style={{fontSize:12,color:"#888"}}>Ejecutado</div>
                  <div style={{fontSize:22,fontWeight:700,color:"#1abc9c"}}>{fmt(totalEjecutado)}</div>
                  <div style={{background:"#eee",borderRadius:4,height:8,margin:"8px 0"}}>
                    <div style={{background:"#1abc9c",width:pctEjec+"%",height:8,borderRadius:4}}/>
                  </div>
                  <div style={{fontSize:12,color:pctEjec<50?"#e74c3c":"#1abc9c",fontWeight:600}}>
                    Ejecucion: {pctEjec}% {pctEjec<50?"— Baja ejecucion":"— En meta"}
                  </div>
                </div>
                <div style={card}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Por Sector</div>
                  {presupuestoSectores.map(p=>(
                    <div key={p.sector} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                        <span>{p.sector}</span><span style={{fontWeight:600}}>{pct(p.ejecutado,p.asignado)}%</span>
                      </div>
                      <div style={{background:"#eee",borderRadius:3,height:6}}>
                        <div style={{background:pct(p.ejecutado,p.asignado)<40?"#e74c3c":"#1abc9c",width:pct(p.ejecutado,p.asignado)+"%",height:6,borderRadius:3}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={card}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:12,borderBottom:"2px solid #5dade2",paddingBottom:8}}>Comparativo Anual</div>
                <canvas id="chartBar" style={{maxHeight:200}}/>
              </div>
              <div style={card}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:12,borderBottom:"2px solid #e74c3c",paddingBottom:8}}>Alertas de Sobrecosto</div>
                {alertasSobrecosto.map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f5f5"}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:a.color,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:600}}>{a.proyecto}</div>
                      <div style={{fontSize:11,color:a.color}}>{a.tipo}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
