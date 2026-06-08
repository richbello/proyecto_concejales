import React from "react";

const sesiones = [
  { fecha: "2026-06-01", tema: "Debate sobre presupuesto de salud" },
  { fecha: "2026-06-03", tema: "Control político a la Secretaría de Educación" },
  { fecha: "2026-06-05", tema: "Discusión sobre movilidad urbana" }
];

const PanelLegislativo: React.FC = () => {
  return (
    <div style={{ background:"linear-gradient(135deg,#3A6EA5,#1abc9c)", borderRadius:12, padding:20, color:"white", boxShadow:"0 6px 14px rgba(0,0,0,.15)" }}>
      <h3 style={{ marginBottom:20 }}>📅 Agenda Legislativa</h3>
      {sesiones.map((s,i) => (
        <div key={i} style={{ background:"rgba(255,255,255,0.15)", borderRadius:8, padding:"12px 16px", marginBottom:12 }}>
          <div style={{ fontWeight:"bold", fontSize:"14px" }}>📌 {s.fecha}</div>
          <div style={{ fontSize:"15px" }}>{s.tema}</div>
        </div>
      ))}
    </div>
  );
};

export default PanelLegislativo;




