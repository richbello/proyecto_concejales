import React, { useState } from "react";

const denunciasData = [
  { id:1, ciudadano:"Jorge Martínez",  asunto:"Corrupción en contrato de vías vereda Olarte",       fecha:"2026-05-20", estado:"Investigado", avatar:"JM" },
  { id:2, ciudadano:"Luisa Fernández", asunto:"Falta de alumbrado público sector La Flora",          fecha:"2026-05-28", estado:"En Revisión",  avatar:"LF" },
  { id:3, ciudadano:"Pedro Acosta",    asunto:"Basura acumulada parque central Usme",                fecha:"2026-06-01", estado:"En Revisión",  avatar:"PA" },
  { id:4, ciudadano:"Carmen Ríos",     asunto:"Obra incompleta salón comunal Alfonso López",         fecha:"2026-06-03", estado:"Recibida",     avatar:"CR" },
  { id:5, ciudadano:"Héctor Vargas",   asunto:"Contratista no ejecuta obras pactadas",              fecha:"2026-06-05", estado:"Recibida",     avatar:"HV" },
];

const estadoColor: Record<string,string> = { "Investigado":"#8e44ad","En Revisión":"#e67e22","Recibida":"#3498db" };
const badge = (c:string): React.CSSProperties => ({ fontSize:11,padding:"2px 8px",borderRadius:12,fontWeight:600,background:c+"22",color:c,display:"inline-block" });
const card: React.CSSProperties = { background:"white",borderRadius:10,padding:"16px 20px",boxShadow:"0 1px 6px rgba(0,0,0,.07)" };

export default function Denuncias() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const filtradas = denunciasData.filter(d =>
    (filtroEstado==="Todos" || d.estado===filtroEstado) &&
    (d.asunto.toLowerCase().includes(busqueda.toLowerCase()) || d.ciudadano.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {([
          ["Recibidas",   denunciasData.length,                                    "#3498db"],
          ["En Proceso",  denunciasData.filter(d=>d.estado==="En Revisión").length, "#e67e22"],
          ["Resueltas",   denunciasData.filter(d=>d.estado==="Investigado").length, "#1abc9c"],
        ] as [string,number,string][]).map(([label,val,col]) => (
          <div key={label} style={{ background:col,color:"white",borderRadius:10,padding:"14px 18px",textAlign:"center" }}>
            <div style={{ fontSize:32,fontWeight:700 }}>{val}</div>
            <div style={{ fontSize:12,opacity:.85 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ ...card, display:"flex", gap:12, alignItems:"center" }}>
        <input value={busqueda} onChange={e=>setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por ciudadano o asunto..."
          style={{ flex:1, padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }}/>
        <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}
          style={{ padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }}>
          {["Todos","Investigado","En Revisión","Recibida"].map(e=><option key={e}>{e}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div style={card}>
        <div style={{ fontWeight:700,fontSize:14,marginBottom:14,borderBottom:"2px solid #5dade2",paddingBottom:8 }}>
          📋 Querellas Ciudadanas ({filtradas.length})
        </div>
        {filtradas.map(d => (
          <div key={d.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #f5f5f5" }}>
            <div style={{ width:38,height:38,borderRadius:"50%",background:"#1a2742",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0 }}>
              {d.avatar}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600,fontSize:13 }}>{d.asunto}</div>
              <div style={{ fontSize:11,color:"#888",marginTop:2 }}>{d.ciudadano} · {d.fecha}</div>
            </div>
            <span style={badge(estadoColor[d.estado])}>{d.estado}</span>
            <button style={{ background:"#5dade2",color:"white",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:600 }}>VER</button>
          </div>
        ))}
        {filtradas.length === 0 && (
          <div style={{ textAlign:"center",color:"#aaa",padding:"24px 0" }}>No se encontraron denuncias</div>
        )}
      </div>
    </div>
  );
}
