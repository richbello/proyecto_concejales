import React from "react";

const denuncias = [
  { ciudadano: "María López", descripcion: "Demora en la construcción del colegio en la comuna 3" },
  { ciudadano: "Carlos Pérez", descripcion: "Falta de iluminación en el parque central" },
  { ciudadano: "Ana Rodríguez", descripcion: "Contratos de mantenimiento sin ejecución visible" }
];

const Denuncias: React.FC = () => {
  return (
    <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 6px 14px rgba(0,0,0,.1)" }}>
      <h3 style={{ color:"#E74C3C", marginBottom:20 }}>📢 Denuncias Ciudadanas</h3>
      {denuncias.map((d,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", background:"#f9f9fb", borderRadius:8, padding:"12px 16px", marginBottom:12 }}>
          <div style={{ fontSize:"22px", marginRight:12 }}>⚠️</div>
          <div>
            <div style={{ fontWeight:"bold", color:"#2c3e50" }}>{d.ciudadano}</div>
            <div style={{ fontSize:"14px", color:"#555" }}>{d.descripcion}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Denuncias;


