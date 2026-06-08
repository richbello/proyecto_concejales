import React, { useState } from "react";
import AnalisisPresupuestal from "./Components/AnalisisPresupuestal";
import MapaProyectos from "./Components/MapaProyectos";
import PanelLegislativo from "./Components/PanelLegislativo";
import Denuncias from "./Components/Denuncias";

// 👉 Datos de ejemplo (puedes moverlos a otro archivo si quieres)
const proyectos = [
  { id:1, nombre:"Parque Ecologico El Uval", localidad:"El Uval", tipo:"Infraestructura", estado:"En Ejecucion", avance:65, coords:[4.478,-74.108], presupuesto:320000000 },
  { id:2, nombre:"Colegio Nuevo Usme IED", localidad:"Usme Centro", tipo:"Educacion", estado:"En Retraso", avance:30, coords:[4.489,-74.126], presupuesto:980000000 },
  { id:3, nombre:"Centro de Salud La Flora", localidad:"La Flora", tipo:"Salud", estado:"Finalizado", avance:100, coords:[4.501,-74.115], presupuesto:540000000 },
  { id:4, nombre:"Via Vereda Los Soches", localidad:"Los Soches", tipo:"Vias", estado:"En Ejecucion", avance:48, coords:[4.462,-74.098], presupuesto:210000000 },
  { id:5, nombre:"Acueducto Veredal Olarte", localidad:"Olarte", tipo:"Servicios", estado:"Planeado", avance:0, coords:[4.445,-74.120], presupuesto:175000000 },
  { id:6, nombre:"Salon Comunal Alfonso Lopez", localidad:"Alfonso Lopez", tipo:"Infraestructura", estado:"En Retraso", avance:20, coords:[4.510,-74.133], presupuesto:95000000 },
];

const sesiones = [
  { fecha:"2026-06-10", tipo:"Sesion Ordinaria", tema:"Control político al IDRD por obras en Usme", acta:"SRT-PN18", sala:"Sala Principal", estado:"Próxima" },
  { fecha:"2026-06-15", tipo:"Audiencia Pública", tema:"Rendición de cuentas presupuesto 2025", acta:"SRT-PN19", sala:"Sala Comunal", estado:"Próxima" },
  { fecha:"2026-06-22", tipo:"Debate de Control", tema:"Avance obras viales localidad Usme", acta:"SRT-PN20", sala:"Sala Principal", estado:"Próxima" },
];

const denuncias = [
  { id:1, ciudadano:"Jorge Martinez", asunto:"Corrupción en contrato de vías vereda Olarte", fecha:"2026-05-20", estado:"Investigado", avatar:"JM" },
  { id:2, ciudadano:"Luisa Fernandez", asunto:"Falta de alumbrado público sector La Flora", fecha:"2026-05-28", estado:"En Revisión", avatar:"LF" },
  { id:3, ciudadano:"Pedro Acosta", asunto:"Basura acumulada parque central Usme", fecha:"2026-06-01", estado:"En Revisión", avatar:"PA" },
  { id:4, ciudadano:"Carmen Rios", asunto:"Obra incompleta salón comunal Alfonso Lopez", fecha:"2026-06-03", estado:"Recibida", avatar:"CR" },
  { id:5, ciudadano:"Hector Vargas", asunto:"Contratista no ejecuta obras pactadas", fecha:"2026-06-05", estado:"Recibida", avatar:"HV" },
];

export default function App() {
  const [tab, setTab] = useState("mapa");

  const navItems = [
    { key: "mapa", label: "🗺️ Mapa de Proyectos" },
    { key: "sesiones", label: "📋 Panel Legislativo" },
    { key: "denuncias", label: "📣 Denuncias Ciudadanas" },
    { key: "presupuesto", label: "💰 Análisis Presupuestal" }
  ];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#f0f2f5", color: "#2c3e50" }}>
      {/* Sidebar */}
      <aside style={{ width: 230, background: "#1a2742", color: "white", display: "flex", flexDirection: "column", boxShadow: "3px 0 10px rgba(0,0,0,.2)" }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontSize: 28 }}>🏛️</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5dade2", textTransform: "uppercase", letterSpacing: 2, marginTop: 8 }}>Control Político</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 }}>FDL Usme 2026</div>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1, paddingTop: 8 }}>
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
        {tab === "mapa" && <MapaProyectos proyectos={proyectos} />}
        {tab === "sesiones" && <PanelLegislativo sesiones={sesiones} />}
        {tab === "denuncias" && <Denuncias denuncias={denuncias} />}
        {tab === "presupuesto" && <AnalisisPresupuestal />}
      </main>
    </div>
  );
}

