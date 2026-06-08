import React, { useState } from "react";
import AnalisisPresupuestal from "./Components/AnalisisPresupuestal";
import MapaProyectos from "./Components/MapaProyectos";
import PanelLegislativo from "./Components/PanelLegislativo";
import Denuncias from "./Components/Denuncias";

export default function App() {
  const [tab, setTab] = useState("mapa");

  const navItems = [
    { key: "mapa", label: "🗺️ Mapa de Proyectos" },
    { key: "sesiones", label: "📋 Panel Legislativo" },
    { key: "denuncias", label: "📣 Denuncias Ciudadanas" },
    { key: "presupuesto", label: "💰 Análisis Presupuestal" }
  ];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#ecf0f1", color: "#2c3e50" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: "#2c3e50", color: "white", padding: "24px 16px" }}>
        <h2 style={{ textAlign: "center", marginBottom: 20 }}>🏛️ Control Político</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {navItems.map(n => (
            <li key={n.key} onClick={() => setTab(n.key)}
              style={{
                padding: "10px", margin: "6px 0", cursor: "pointer",
                background: tab === n.key ? "#1abc9c" : "transparent",
                borderRadius: 6
              }}>
              {n.label}
            </li>
          ))}
        </ul>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        {tab === "mapa" && <MapaProyectos />}
        {tab === "sesiones" && <PanelLegislativo />}
        {tab === "denuncias" && <Denuncias />}
        {tab === "presupuesto" && <AnalisisPresupuestal />}
      </main>
    </div>
  );
}
