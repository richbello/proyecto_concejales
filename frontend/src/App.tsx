import React, { useState, useEffect } from "react";
import AnalisisPresupuestal from "./Components/AnalisisPresupuestal";
import MapaProyectos from "./Components/MapaProyectos";
import PanelLegislativo from "./Components/PanelLegislativo";
import Denuncias from "./Components/Denuncias";
import AccessGate from "./Components/AccessGate";
import SimuladorPresupuestal from "./Components/SimuladorPresupuestal";
import Politiko from "./Components/Politiko";
import Planeacion from "./Components/Planeacion";
import Contratacion from './Components/Contratacion/Contratacion';
import AlertasML from "./Components/AlertasML/AlertasML";
import HistoricoPagos from "./Components/HistoricoPagos";
import Ciberseguridad from "./Components/Ciberseguridad";
import GestorLicencias from "./Components/GestorLicencias";

interface DataRow { [key: string]: string | number; }

const TODOS_MODULOS = [
  { key:"mapa",           label:"Mapa de Proyectos",     icon:"🗺️"  },
  { key:"sesiones",       label:"Panel Legislativo",      icon:"📋"  },
  { key:"denuncias",      label:"Denuncias Ciudadanas",   icon:"📣"  },
  { key:"simulador",      label:"Simulador Presupuestal", icon:"🧮"  },
  { key:"presupuesto",    label:"Análisis Presupuestal",  icon:"💰"  },
  { key:"alertas",        label:"Alertas PAC FDL",             icon:"🤖"  },
  { key:"contratacion",   label:"Contratación",           icon:"📋"  },
  { key:"planeacion",     label:"Planeación PDL",         icon:"📐"  },
  { key:"historico",      label:"Histórico de Pagos",     icon:"📊"  },
  { key:"ciberseguridad", label:"Ciberseguridad",         icon:"🔐"  },
  { key:"licencias",      label:"Gestor Licencias",       icon:"🔑"  },
];

export default function App() {
  const [tab,       setTab]       = useState("mapa");
  const [crpData,   setCrpData]   = useState<DataRow[]>([]);
  const [planData,  setPlanData]  = useState<any>(null);
  const [contratosData, setContratosData] = useState<any>(null);
  const [pacData, setPacData] = useState<any>(null);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768);
  const [modulos,   setModulos]   = useState<string[]>(TODOS_MODULOS.map(m => m.key));
  const [planActual,setPlanActual]= useState<string>("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLicencia = (data: any) => {
    setModulos(data.modulos || TODOS_MODULOS.map(m => m.key));
    setPlanActual(data.plan || "");
    // Si el tab actual no está disponible, ir al primero disponible
    if (data.modulos && !data.modulos.includes(tab)) {
      setTab(data.modulos[0] || "mapa");
    }
  };

  const handleTabChange = (key: string) => { setTab(key); setMenuOpen(false); };

  const NAV_ITEMS = TODOS_MODULOS.filter(m => modulos.includes(m.key));
  const currentNav = NAV_ITEMS.find(n => n.key === tab);

  const renderModulo = () => {
    // Verificar acceso
    if (!modulos.includes(tab)) {
      return (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:300, flexDirection:"column" as const, gap:16 }}>
          <div style={{ fontSize:48 }}>🔒</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#2c3e50" }}>Módulo no disponible en tu plan</div>
          <div style={{ fontSize:13, color:"#7f8c8d" }}>Actualiza tu licencia para acceder a este módulo</div>
        </div>
      );
    }
    switch(tab) {
      case "mapa":           return <MapaProyectos />;
      case "sesiones":       return <PanelLegislativo />;
      case "denuncias":      return <Denuncias />;
      case "simulador":      return <SimuladorPresupuestal data={crpData} />;
      case "presupuesto":    return <AnalisisPresupuestal onDataLoad={setCrpData} />;
      case "contratacion":   return <Contratacion onDataLoad={setContratosData} />;
      case "alertas":        return <AlertasML onDataLoad={setPacData} />;
      case "planeacion":     return <Planeacion onDataLoad={setPlanData} />;
      case "historico":      return <HistoricoPagos />;
      case "ciberseguridad": return <Ciberseguridad />;
      case "licencias":      return <GestorLicencias />;
      default:               return null;
    }
  };

  return (
    <AccessGate onLicencia={handleLicencia}>
      <div style={{ display:"flex", flexDirection:isMobile?"column":"row", height:"100vh", fontFamily:"'Segoe UI',sans-serif", background:"#f0f2f5", color:"#2c3e50", overflow:"hidden" }}>

        {!isMobile && (
          <aside style={{ width:220, background:"#1a2742", color:"white", display:"flex", flexDirection:"column", boxShadow:"3px 0 10px rgba(0,0,0,.2)", flexShrink:0 }}>
            <div style={{ padding:"20px 16px", borderBottom:"1px solid rgba(255,255,255,.1)" }}>
              <div style={{ fontSize:28 }}>🏛️</div>
              <div style={{ fontSize:10, fontWeight:700, color:"#5dade2", textTransform:"uppercase", letterSpacing:2, marginTop:6 }}>Control Político</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", marginTop:2 }}>FDL Usme · 2026</div>
              {planActual && (
                <div style={{ marginTop:8, background:"rgba(93,173,226,.15)", borderRadius:6, padding:"4px 8px", fontSize:9, color:"#5dade2", fontWeight:700 }}>
                  🔑 {planActual}
                </div>
              )}
            </div>
            <ul style={{ listStyle:"none", padding:0, margin:0, flex:1, paddingTop:6, overflowY:"auto" }}>
              {NAV_ITEMS.map(n => (
                <li key={n.key} onClick={() => handleTabChange(n.key)} style={{ padding:"11px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:9, fontSize:13, background:tab===n.key?"rgba(93,173,226,.2)":"transparent", borderLeft:tab===n.key?"3px solid #5dade2":"3px solid transparent", color:tab===n.key?"#5dade2":"rgba(255,255,255,.75)", transition:"all 0.2s" }}>
                  <span style={{ fontSize:15 }}>{n.icon}</span>
                  <span>{n.label}</span>
                </li>
              ))}
            </ul>
            <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,.1)", fontSize:10, color:"rgba(255,255,255,.35)" }}>
              Alcaldía Local de Usme
            </div>
          </aside>
        )}

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
          <div style={{ background:"#1a2742", color:"white", padding:isMobile?"10px 14px":"12px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 8px rgba(0,0,0,.15)", flexShrink:0, gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
              {isMobile && (
                <button onClick={() => setMenuOpen(v=>!v)} style={{ background:"rgba(255,255,255,.1)", border:"none", color:"white", width:36, height:36, borderRadius:8, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, flexShrink:0 }}>
                  <span style={{ width:18, height:2, background:"white", borderRadius:2, display:"block", transition:"all .2s", transform:menuOpen?"rotate(45deg) translateY(6px)":"none" }}/>
                  <span style={{ width:18, height:2, background:"white", borderRadius:2, display:"block", opacity:menuOpen?0:1, transition:"all .2s" }}/>
                  <span style={{ width:18, height:2, background:"white", borderRadius:2, display:"block", transition:"all .2s", transform:menuOpen?"rotate(-45deg) translateY(-6px)":"none" }}/>
                </button>
              )}
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:isMobile?14:17, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {currentNav?.icon} {currentNav?.label}
                </div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.55)" }}>
                  {isMobile?"FDL Usme · 2026":"Localidad de Usme · Bogotá D.C."}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              {!isMobile && <span style={{ fontSize:10, background:"rgba(255,255,255,.1)", padding:"3px 8px", borderRadius:6 }}>📅 {new Date().toLocaleDateString("es-CO")}</span>}
              <div style={{ width:30, height:30, borderRadius:"50%", background:"#5dade2", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12 }}>RB</div>
            </div>
          </div>

          {isMobile && menuOpen && (
            <div style={{ background:"#1a2742", position:"absolute", top:57, left:0, right:0, zIndex:1000, boxShadow:"0 8px 24px rgba(0,0,0,.3)" }}>
              {NAV_ITEMS.map(n => (
                <div key={n.key} onClick={() => handleTabChange(n.key)} style={{ padding:"13px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, fontSize:14, background:tab===n.key?"rgba(93,173,226,.2)":"transparent", borderLeft:tab===n.key?"4px solid #5dade2":"4px solid transparent", color:tab===n.key?"#5dade2":"rgba(255,255,255,.8)", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ fontSize:18 }}>{n.icon}</span>
                  <span>{n.label}</span>
                  {tab===n.key && <span style={{ marginLeft:"auto", fontSize:10, color:"#5dade2" }}>●</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ flex:1, padding:isMobile?10:18, overflowY:"auto", overflowX:"hidden" }}>
            {renderModulo()}
          </div>
        </div>

        <Politiko data={crpData} planData={planData} contratosData={contratosData} pacData={pacData} />
      </div>
    </AccessGate>
  );
}