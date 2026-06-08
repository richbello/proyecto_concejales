import React from "react";

const sesiones = [
  { fecha:"2026-06-10", tipo:"Sesión Ordinaria",  tema:"Control político al IDRD por obras en Usme",     acta:"SRT-PN18", sala:"Sala Principal", estado:"Próxima" },
  { fecha:"2026-06-15", tipo:"Audiencia Pública",  tema:"Rendición de cuentas presupuesto 2025",           acta:"SRT-PN19", sala:"Sala Comunal",   estado:"Próxima" },
  { fecha:"2026-06-22", tipo:"Debate de Control",  tema:"Avance obras viales localidad Usme",              acta:"SRT-PN20", sala:"Sala Principal", estado:"Próxima" },
];

const leyes = [
  { nombre:"Acuerdo de Movilidad Local",        estado:"En Debate" },
  { nombre:"Plan de Salud Territorial 2026",    estado:"Aprobado"  },
  { nombre:"Reglamento Espacio Público",         estado:"Pendiente" },
  { nombre:"Fondo de Seguridad Local",           estado:"En Debate" },
];

const alertas = [
  { texto:"Informe de Gestión — vence en 2 días",       color:"#e74c3c" },
  { texto:"Contrato obra vial vencido sin liquidar",     color:"#e67e22" },
  { texto:"Respuesta derecho de petición pendiente",     color:"#f39c12" },
];

const estadoColor: Record<string,string> = { "En Debate":"#e67e22","Aprobado":"#1abc9c","Pendiente":"#95a5a6" };
const meses = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const badge = (color: string): React.CSSProperties => ({
  fontSize:11, padding:"2px 8px", borderRadius:12, fontWeight:600,
  background:color+"22", color, display:"inline-block"
});

const card: React.CSSProperties = { background:"white", borderRadius:10, padding:"16px 20px", boxShadow:"0 1px 6px rgba(0,0,0,.07)" };

export default function PanelLegislativo() {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      {/* Sesiones */}
      <div style={card}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:14, borderBottom:"2px solid #5dade2", paddingBottom:8 }}>📅 Próximas Sesiones</div>
        {sesiones.map((s,i) => (
          <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:"1px solid #f5f5f5" }}>
            <div style={{ background:"#1a2742", color:"white", borderRadius:8, padding:"8px 10px", textAlign:"center", minWidth:48 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>{s.fecha.split("-")[2]}</div>
              <div style={{ fontSize:10 }}>{meses[parseInt(s.fecha.split("-")[1])]}</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:"#5dade2", fontWeight:600 }}>{s.tipo} · {s.acta}</div>
              <div style={{ fontSize:13, fontWeight:500, margin:"2px 0" }}>{s.tema}</div>
              <div style={{ fontSize:11, color:"#888" }}>📍 {s.sala}</div>
            </div>
            <span style={badge("#1abc9c")}>{s.estado}</span>
          </div>
        ))}
      </div>

      {/* Proyectos de Acuerdo */}
      <div style={card}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:14, borderBottom:"2px solid #5dade2", paddingBottom:8 }}>📜 Proyectos de Acuerdo</div>
        {leyes.map((l,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #f5f5f5" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:estadoColor[l.estado] }}/>
              <span style={{ fontSize:13 }}>{l.nombre}</span>
            </div>
            <span style={badge(estadoColor[l.estado])}>{l.estado}</span>
          </div>
        ))}
      </div>

      {/* Alertas */}
      <div style={{ ...card, gridColumn:"1/-1" }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:12, borderBottom:"2px solid #e74c3c", paddingBottom:8 }}>🔔 Alertas Legislativas</div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {alertas.map((a,i) => (
            <div key={i} style={{ flex:1, minWidth:200, background:a.color+"11", border:`1px solid ${a.color}44`, borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:a.color, fontSize:18 }}>⚠️</span>
              <span style={{ fontSize:12, color:a.color, fontWeight:600 }}>{a.texto}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
