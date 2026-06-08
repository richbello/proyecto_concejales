import React, { useEffect, useRef, useState } from "react";

const proyectos = [
  { id:1, nombre:"Parque Ecológico El Uval",     localidad:"El Uval",      tipo:"Infraestructura", estado:"En Ejecución", avance:65, coords:[4.478,-74.108] as [number,number], presupuesto:320000000 },
  { id:2, nombre:"Colegio Nuevo Usme IED",        localidad:"Usme Centro",  tipo:"Educación",       estado:"En Retraso",  avance:30, coords:[4.489,-74.126] as [number,number], presupuesto:980000000 },
  { id:3, nombre:"Centro de Salud La Flora",      localidad:"La Flora",     tipo:"Salud",           estado:"Finalizado",  avance:100,coords:[4.501,-74.115] as [number,number], presupuesto:540000000 },
  { id:4, nombre:"Vía Vereda Los Soches",         localidad:"Los Soches",   tipo:"Vías",            estado:"En Ejecución",avance:48, coords:[4.462,-74.098] as [number,number], presupuesto:210000000 },
  { id:5, nombre:"Acueducto Veredal Olarte",      localidad:"Olarte",       tipo:"Servicios",       estado:"Planeado",    avance:0,  coords:[4.445,-74.120] as [number,number], presupuesto:175000000 },
  { id:6, nombre:"Salón Comunal Alfonso López",   localidad:"Alfonso López",tipo:"Infraestructura", estado:"En Retraso",  avance:20, coords:[4.510,-74.133] as [number,number], presupuesto:95000000  },
];

const colMap: Record<string,string> = { "En Ejecución":"#1abc9c","En Retraso":"#e74c3c","Finalizado":"#3498db","Planeado":"#95a5a6" };
const tipoIcon: Record<string,string> = { "Infraestructura":"🏗️","Educación":"🏫","Salud":"🏥","Vías":"🛣️","Servicios":"💧" };
const fmt = (v:number) => "$"+(v>=1e9?(v/1e9).toFixed(1)+"B":(v/1e6).toFixed(0)+"M");

export default function MapaProyectos() {
  const mapRef = useRef<any>(null);
  const initialized = useRef(false);
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    document.head.appendChild(js);
    js.onload = () => initMap();
  }, []);

  const initMap = () => {
    if (initialized.current) return;
    const L = (window as any).L;
    if (!L || !document.getElementById("mapa-leaflet")) return;
    const map = L.map("mapa-leaflet").setView([4.478,-74.113], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    proyectos.forEach(p => {
      const icon = L.divIcon({
        html: `<div style="background:${colMap[p.estado]};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
        className:"", iconAnchor:[7,7]
      });
      L.marker(p.coords, { icon }).addTo(map).bindPopup(
        `<div style="font-family:Segoe UI,sans-serif;min-width:190px">
          <div style="font-weight:700;font-size:13px;margin-bottom:6px">${tipoIcon[p.tipo]} ${p.nombre}</div>
          <div style="font-size:12px;color:#555;margin-bottom:2px">📍 ${p.localidad}</div>
          <div style="font-size:12px;margin-bottom:2px">Estado: <b style="color:${colMap[p.estado]}">${p.estado}</b></div>
          <div style="font-size:12px;margin-bottom:6px">Avance: <b>${p.avance}%</b></div>
          <div style="background:#eee;border-radius:4px;height:6px;margin-bottom:6px">
            <div style="background:${colMap[p.estado]};width:${p.avance}%;height:6px;border-radius:4px"></div>
          </div>
          <div style="font-size:11px;color:#888">Presupuesto: ${fmt(p.presupuesto)}</div>
        </div>`
      );
    });
    mapRef.current = map;
    initialized.current = true;
  };

  const filtrados = proyectos.filter(p =>
    (filtroTipo==="Todos" || p.tipo===filtroTipo) &&
    (filtroEstado==="Todos" || p.estado===filtroEstado)
  );

  const card: React.CSSProperties = { background:"white", borderRadius:10, padding:"16px 20px", boxShadow:"0 1px 6px rgba(0,0,0,.07)" };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:16, height:"calc(100vh - 120px)" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {/* Leyenda */}
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Estado de Proyectos</div>
          {Object.entries(colMap).map(([est,col]) => (
            <div key={est} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:col }}/>
              <span style={{ fontSize:12 }}>{est} ({proyectos.filter(p=>p.estado===est).length})</span>
            </div>
          ))}
        </div>
        {/* Filtros */}
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Filtros</div>
          <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Tipo</div>
          <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
            style={{ width:"100%", padding:"6px 8px", borderRadius:6, border:"1px solid #ddd", fontSize:12, marginBottom:10 }}>
            {["Todos","Infraestructura","Educación","Salud","Vías","Servicios"].map(t=><option key={t}>{t}</option>)}
          </select>
          <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Estado</div>
          <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}
            style={{ width:"100%", padding:"6px 8px", borderRadius:6, border:"1px solid #ddd", fontSize:12 }}>
            {["Todos","En Ejecución","En Retraso","Finalizado","Planeado"].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        {/* Lista */}
        <div style={{ ...card, flex:1, overflowY:"auto" }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Proyectos ({filtrados.length})</div>
          {filtrados.map(p => (
            <div key={p.id} style={{ borderBottom:"1px solid #f0f0f0", paddingBottom:8, marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:600 }}>{tipoIcon[p.tipo]} {p.nombre}</div>
              <div style={{ fontSize:11, color:"#888", margin:"2px 0" }}>{p.localidad}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ flex:1, background:"#eee", borderRadius:3, height:5 }}>
                  <div style={{ background:colMap[p.estado], width:p.avance+"%", height:5, borderRadius:3 }}/>
                </div>
                <span style={{ fontSize:11, fontWeight:600 }}>{p.avance}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div id="mapa-leaflet" style={{ borderRadius:10, boxShadow:"0 2px 10px rgba(0,0,0,.1)" }}/>
    </div>
  );
}
