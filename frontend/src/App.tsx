import React, { useState } from "react";
import AnalisisPresupuestal from "./Components/AnalisisPresupuestal";
import MapaProyectos from "./Components/MapaProyectos";
import PanelLegislativo from "./Components/PanelLegislativo";
import Denuncias from "./Components/Denuncias";
import Politiko from "./Components/Politiko";

export default function App() {
  const [tab, setTab] = useState("mapa");

  const navItems = [
    { key: "mapa",        label: "Mapa de Proyectos",    icon: "🗺️" },
    { key: "sesiones",    label: "Panel Legislativo",     icon: "📋" },
    { key: "denuncias",   label: "Denuncias Ciudadanas",  icon: "📣" },
    { key: "presupuesto", label: "Análisis Presupuestal", icon: "💰" },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Segoe UI',sans-serif", background:"#f0f2f5", color:"#2c3e50" }}>
      <aside style={{ width:230, background:"#1a2742", color:"white", display:"flex", flexDirection:"column", boxShadow:"3px 0 10px rgba(0,0,0,.2)", flexShrink:0 }}>
        <div style={{ padding:"24px 16px", borderBottom:"1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontSize:32 }}>🏛️</div>
          <div style={{ fontSize:11, fontWeight:700, color:"#5dade2", textTransform:"uppercase", letterSpacing:2, marginTop:8 }}>Control Político</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:2 }}>FDL Usme · 2026</div>
        </div>
        <ul style={{ listStyle:"none", padding:0, margin:0, flex:1, paddingTop:8 }}>
          {navItems.map(n => (
            <li key={n.key} onClick={() => setTab(n.key)} style={{
              padding:"12px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, fontSize:13.5,
              background: tab===n.key ? "rgba(93,173,226,.2)" : "transparent",
              borderLeft: tab===n.key ? "3px solid #5dade2" : "3px solid transparent",
              color: tab===n.key ? "#5dade2" : "rgba(255,255,255,.75)",
              transition:"all 0.2s"
            }}>
              <span style={{ fontSize:16 }}>{n.icon}</span>{n.label}
            </li>
          ))}
        </ul>
        <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,.1)", fontSize:11, color:"rgba(255,255,255,.4)" }}>
          Alcaldía Local de Usme
        </div>
      </aside>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:"#1a2742", color:"white", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 8px rgba(0,0,0,.15)", flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:18 }}>{navItems.find(n=>n.key===tab)?.icon} {navItems.find(n=>n.key===tab)?.label}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.6)" }}>Localidad de Usme · Bogotá D.C.</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:11, background:"rgba(255,255,255,.1)", padding:"4px 10px", borderRadius:6 }}>
              📅 {new Date().toLocaleDateString("es-CO")}
            </span>
            <div style={{ width:34, height:34, borderRadius:"50%", background:"#5dade2", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13 }}>RB</div>
          </div>
        </div>

        <div style={{ flex:1, padding:20, overflowY:"auto" }}>
          {tab === "mapa"        && <MapaProyectos />}
          {tab === "sesiones"    && <PanelLegislativo />}
          {tab === "denuncias"   && <Denuncias />}
          {tab === "presupuesto" && <AnalisisPresupuestal />}
        </div>
      </div>

      <Politiko data={[]} />
    </div>
  );
}
