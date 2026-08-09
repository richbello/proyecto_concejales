import React, { useState } from "react";
import MapaProyectos from "./MapaProyectos";
import PanelLegislativo from "./PanelLegislativo";
import Denuncias from "./Denuncias";
import AnalisisPresupuestal from "./AnalisisPresupuestal";

const Dashboard: React.FC = () => {
  const [section, setSection] = useState("mapa");

  const renderSection = () => {
    switch(section) {
      case "mapa": return <MapaProyectos />;
      case "sesiones": return <PanelLegislativo />;
      case "denuncias": return <Denuncias />;
      case "presupuesto": return <AnalisisPresupuestal />;
      default: return <MapaProyectos />;
    }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f9f9fb" }}>
      {/* Sidebar */}
      <div style={{ width:"220px", background:"#2c3e50", color:"#ecf0f1", padding:"20px" }}>
        <h2 style={{ fontSize:"18px", marginBottom:"15px" }}>📊 XBOG CONTROL</h2>
        <ul style={{ padding:0, listStyle:"none" }}>
          <li 
            style={{ padding:"8px", borderRadius:"6px", cursor:"pointer", marginBottom:"8px", background: section==="mapa" ? "#3A6EA5" : "transparent" }}
            onClick={() => setSection("mapa")}
          >🗺️ Mapa de Proyectos</li>
          <li 
            style={{ padding:"8px", borderRadius:"6px", cursor:"pointer", marginBottom:"8px", background: section==="sesiones" ? "#3A6EA5" : "transparent" }}
            onClick={() => setSection("sesiones")}
          >📅 Panel Legislativo</li>
          <li 
            style={{ padding:"8px", borderRadius:"6px", cursor:"pointer", marginBottom:"8px", background: section==="denuncias" ? "#3A6EA5" : "transparent" }}
            onClick={() => setSection("denuncias")}
          >📢 Denuncias Ciudadanas</li>
          <li 
            style={{ padding:"8px", borderRadius:"6px", cursor:"pointer", marginBottom:"8px", background: section==="presupuesto" ? "#3A6EA5" : "transparent" }}
            onClick={() => setSection("presupuesto")}
          >💰 Análisis Presupuestal</li>
        </ul>
      </div>

      {/* Contenido dinámico */}
      <div style={{ flex:1, padding:"20px" }}>
        {renderSection()}
      </div>
    </div>
  );
};

export default Dashboard;
