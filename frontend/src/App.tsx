import Hallazgos from './Components/Hallazgos';
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
import GeneradorProposicion from "./Components/GeneradorProposicion";
import AlertasAutomaticas from "./Components/AlertasAutomaticas";
import VigilanciaFiscal from "./pages/VigilanciaFiscal";
import AnalisisSocialModule from "./Components/AnalisisSocialModule";
import SubsidiosMunicipiosModule from './Components/SubsidiosMunicipiosModule';
import Modulo12PobrezaSaludSeguridad from './Components/Modulo12PobrezaSaludSeguridad'; 


interface DataRow { [key: string]: string | number; }

interface ModuloItem { key: string; label: string; icon: string; isGroup?: boolean; children?: ModuloItem[] }
const TODOS_MODULOS: ModuloItem[] = [
  { key:"grupo-presupuesto", label:"1. Presupuesto FDL", icon:"📊", isGroup:true, children:[
    { key:"presupuesto", label:"1.1 Analisis Presupuestal", icon:"📈" },
    { key:"simulador", label:"1.2 Simulador Presupuesto", icon:"🧮" },
    { key:"historico", label:"1.3 Reportes de Pagos", icon:"✅" },
    { key:"hallazgos", label:"1.4 Hallazgos", icon:"📍" },
  ]},
  { key:"alertas", label:"2. Analisis PAC", icon:"🎯" },
  { key:"contratacion", label:"3. Contratacion", icon:"📋" },
  { key:"planeacion", label:"4. Planeacion Local", icon:"📐" },
  { key:"generador-proposiciones", label:"5. Generador de Proposiciones", icon:"📝" },
  { key:"alertas-automaticas", label:"6. Alertas Automaticas", icon:"⚠️" },
  { key:"vigilancia-fiscal", label:"7. Vigilancia Fiscal IA", icon:"⚖️" },
  { key:"ciberseguridad", label:"8. Ciberseguridad", icon:"🔐" },
  { key:"licencias", label:"9. Gestor de Licencias", icon:"🔑" },
  { key:"analisis-social", label:"10. Análisis Social por Localidad", icon:"👥" },
  {
  key: "subsidios-municipios",
  label: "11. Subsidios por Municipio",
  icon: "🏘️",
  isGroup: false
},
  {
  key: "modulo-12",
  label: "12. Pobreza, Salud y Seguridad",
  icon: "📊",
  isGroup: false
},
];



export default function App() {
  const [tab,       setTab]       = useState("presupuesto");
  const [crpData,   setCrpData]   = useState<DataRow[]>([]);
  const [planData,  setPlanData]  = useState<any>(null);
  const [contratosData, setContratosData] = useState<any>(null);
  const [pacData, setPacData] = useState<any>(null);
  const [mapaData, setMapaData] = useState<any[]>([]);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768);
  const [modulos,   setModulos]   = useState<string[]>(TODOS_MODULOS.map(m => m.key));
  const [planActual,setPlanActual]= useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["grupo-presupuesto"]));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLicencia = (data: any) => {
    const newModulos = data.modulos || TODOS_MODULOS.map(m => m.key);
    setModulos([...new Set([...newModulos, "licencias", "generador-proposiciones", "alertas-automaticas"])]);
    setPlanActual(data.plan || "");
    // Si el tab actual no está disponible, ir al primero disponible
    if (data.modulos && !data.modulos.includes(tab)) {
      setTab(data.modulos.includes("presupuesto") ? "presupuesto" : data.modulos[0]);
    }
  };

  const handleTabChange = (key: string) => { setTab(key); setMenuOpen(false); };

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) newExpanded.delete(key);
    else newExpanded.add(key);
    setExpandedGroups(newExpanded);
  };


  const NAV_ITEMS = TODOS_MODULOS
    .map(m => {
      if (m.isGroup) {
        const kids = (m.children || []);
        return kids.length ? { ...m, children: kids } : null;
      }
      return m;
    })
    .filter((m): m is ModuloItem => m !== null);
  const currentNav = NAV_ITEMS.find(n => n.key === tab);

  const renderModulo = () => {
    switch(tab) {
      case "mapa":           return <MapaProyectos onDataLoad={setMapaData} />;
      case "sesiones":       return <PanelLegislativo />;
      case "denuncias":      return <Denuncias />;
      case "simulador":      return <SimuladorPresupuestal data={crpData} />;
      case "presupuesto":    return <AnalisisPresupuestal onDataLoad={setCrpData} />;
      case "contratacion":   return <Contratacion onDataLoad={setContratosData} />;
      case "alertas":        return <AlertasML onDataLoad={setPacData} />;
      case "planeacion":     return <Planeacion onDataLoad={setPlanData} />;
      case "generador-proposiciones": return <GeneradorProposicion anomaliasData={pacData} localidad="FDL Usme" edil="Edil" />;
      case "historico":      return <HistoricoPagos />;
      case "hallazgos":      return <Hallazgos data={crpData}/>
      case "ciberseguridad": return <Ciberseguridad />;
      case "licencias":      return <GestorLicencias />;
      case "subsidios-municipios": return <SubsidiosMunicipiosModule />;
      case "modulo-12": return <Modulo12PobrezaSaludSeguridad />;
      case "analisis-social": return <AnalisisSocialModule />;
      case "alertas-automaticas": return <AlertasAutomaticas pacData={pacData} contratosData={contratosData} presupuestoData={crpData} />;
      case "vigilancia-fiscal":
      return <VigilanciaFiscal />;
    default:               return null;
    }
  };

  return (
    <AccessGate onLicencia={handleLicencia}>
      <div style={{ display:"flex", flexDirection:isMobile?"column":"row", height:"100vh", fontFamily:"'Segoe UI',sans-serif", background:"#f0f2f5", color:"#2c3e50", overflow:"hidden" }}>

        {!isMobile && (
          <aside style={{ width:220, background:"linear-gradient(160deg,#0f172a 0%,#0d9488 45%,#06b6d4 100%)", color:"white", display:"flex", flexDirection:"column", boxShadow:"3px 0 18px rgba(120,0,0,.35)", flexShrink:0 }}>
            <div style={{ padding:"16px", borderBottom:"1px solid rgba(255,255,255,.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <img src="/xbog-smart.png" alt="XBOG Smart" style={{ maxWidth:"100%", height:"auto", maxHeight:120 }} />
            </div>
            <ul style={{ listStyle:"none", padding:0, margin:0, flex:1, paddingTop:6, overflowY:"auto" }}>
              {NAV_ITEMS.map(n => (
                <div key={n.key}>
                  {n.isGroup ? (
                    <>
                      <li onClick={() => toggleGroup(n.key)} style={{ padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:9, fontSize:13, fontWeight:700, color:"#FFE082", letterSpacing:"0.3px" }}>
                        <span>{n.icon}</span>
                        <span>{n.label}</span>
                        <span style={{marginLeft:"auto"}}>{expandedGroups.has(n.key) ? "▼" : "▶"}</span>
                      </li>
                      {expandedGroups.has(n.key) && n.children?.map(child => (
                        <li key={child.key} onClick={() => handleTabChange(child.key)} style={{ paddingLeft:"30px", cursor:"pointer", display:"flex", alignItems:"center", gap:9, fontSize:12, background:tab===child.key?"rgba(255,209,0,.2)":"transparent", borderLeft:tab===child.key?"4px solid #FFE082":"4px solid transparent", color:tab===child.key?"#FFE082":"rgba(255,255,255,.75)", transition:"all 0.2s" }}>
                          <span>{child.icon}</span>
                          <span>{child.label}</span>
                        </li>
                      ))}
                    </>
                  ) : (
                    <li onClick={() => handleTabChange(n.key)} style={{ padding:"11px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:9, fontSize:13, background:tab===n.key?"#FFE082":"transparent", borderLeft:tab===n.key?"4px solid #FFE082":"4px solid transparent", color:tab===n.key?"#1a2742":"rgba(255,255,255,.85)", transition:"all 0.2s" }}>
                  <span style={{ fontSize:15 }}>{n.icon}</span>
                  <span>{n.label}</span>
                </li>
                  )}
                </div>
              ))}
            </ul>
            <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,.1)", fontSize:10, color:"rgba(255,255,255,.9)" }}>
              Propiedad de XBOG Technologies 2026
            </div>
          </aside>
        )}

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
          <div style={{ background:"linear-gradient(90deg,#0f172a 0%,#0d9488 60%,#06b6d4 100%)", color:"white", padding:isMobile?"10px 14px":"12px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 12px rgba(120,0,0,.25)", flexShrink:0, gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
              {tab !== "presupuesto" && (
                <button onClick={() => setTab("presupuesto")} style={{ background:"rgba(255,255,255,.1)", border:"none", color:"white", padding:"6px 12px", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                  Atras
                </button>
              )}
              {isMobile && (
                <button onClick={() => setMenuOpen(v=>!v)} style={{ background:"rgba(255,255,255,.1)", border:"none", color:"white", width:36, height:36, borderRadius:8, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, flexShrink:0 }}>
                  <span style={{ width:18, height:2, background:"white", borderRadius:2, display:"block", transition:"all .2s", transform:menuOpen?"rotate(45deg) translateY(6px)":"none" }}/>
                  <span style={{ width:18, height:2, background:"white", borderRadius:2, display:"block", opacity:menuOpen?0:1, transition:"all .2s" }}/>
                  <span style={{ width:18, height:2, background:"white", borderRadius:2, display:"block", transition:"all .2s", transform:menuOpen?"rotate(-45deg) translateY(-6px)":"none" }}/>
                </button>
              )}
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:isMobile?14:17, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"#FFE082" }}>
                  {currentNav?.icon} {currentNav?.label}
                </div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.55)" }}>
                  {isMobile?"XBOG Technologies":""}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              {!isMobile && <span style={{ fontSize:10, background:"rgba(255,255,255,.1)", padding:"3px 8px", borderRadius:6 }}>📅 {new Date().toLocaleDateString("es-CO")}</span>}
              <div style={{ width:30, height:30, borderRadius:"50%", background:"#FFE082", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12 }}>RB</div>
            </div>
          </div>

          {isMobile && menuOpen && (
            <div style={{ background:"linear-gradient(160deg,#0f172a 0%,#0d9488 60%,#06b6d4 100%)", position:"absolute", top:57, left:0, right:0, zIndex:1000, boxShadow:"0 8px 24px rgba(0,0,0,.3)" }}>
              {NAV_ITEMS.map(n => (
                n.isGroup ? (
                  <div key={n.key}>
                    <div onClick={() => toggleGroup(n.key)} style={{ padding:"13px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, fontSize:14, fontWeight:700, color:"#FFE082", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                      <span style={{ fontSize:18 }}>{n.icon}</span>
                      <span>{n.label}</span>
                      <span style={{ marginLeft:"auto", fontSize:11 }}>{expandedGroups.has(n.key) ? "▼" : "▶"}</span>
                    </div>
                    {expandedGroups.has(n.key) && n.children?.map(child => (
                      <div key={child.key} onClick={() => handleTabChange(child.key)} style={{ padding:"11px 18px 11px 44px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, fontSize:13, background:tab===child.key?"#FFE082":"transparent", borderLeft:tab===child.key?"4px solid #5dade2":"4px solid transparent", color:tab===child.key?"#7A1414":"rgba(255,255,255,.75)", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                        <span style={{ fontSize:15 }}>{child.icon}</span>
                        <span>{child.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                <div key={n.key} onClick={() => handleTabChange(n.key)} style={{ padding:"13px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, fontSize:14, background:tab===n.key?"#FFE082":"transparent", borderLeft:tab===n.key?"4px solid #5dade2":"4px solid transparent", color:tab===n.key?"#7A1414":"rgba(255,255,255,.8)", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ fontSize:18 }}>{n.icon}</span>
                  <span>{n.label}</span>
                  {tab===n.key && <span style={{ marginLeft:"auto", fontSize:10 }}>●</span>}
                </div>
                )
              ))}
            </div>
          )}

          <div style={{ flex:1, padding:isMobile?10:18, overflowY:"auto", overflowX:"hidden", background:"#F5F3EE", paddingBottom:isMobile?"50px":"20px" }}>
            {renderModulo()}
          </div>
          {isMobile && (
            <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#1a2742", borderTop:"1px solid #1e2a40", padding:"12px 16px", textAlign:"center", fontSize:10, color:"#94a3b8", zIndex:999 }}>
              Derechos Reservados Propiedad de XBOG Technologies 2026
            </div>
          )}
        </div>

        <Politiko data={crpData} planData={planData} contratosData={contratosData} pacData={pacData} mapaData={mapaData} />
      </div>
    </AccessGate>
  );
}// Privatized at Fri Aug 14 16:13:40 UTC 2026
// Deploy v1
// Rebuild trigger
