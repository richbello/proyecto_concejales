/**
 * GeneradorProposicion.tsx
 * Generador automático de Proposiciones de Control Político
 */

import { useState } from "react";
import * as XLSX from "xlsx";

interface AlertaPAC {
  rubro: string;
  codigo: string;
  pct_ejecucion: number;
  pct_cierre_estimado: number;
  nivel: "VERDE" | "AMARILLO" | "ROJO";
  confianza: number;
  pac_actual: number;
  girado: number;
  mensaje: string;
}

interface AnomaliaContrato {
  id: string;
  proveedor: string;
  nit: string;
  monto: number;
  modalidad: string;
  score: number;
  nivel: "VERDE" | "AMARILLO" | "ROJO";
  razones: string[];
  fecha: string;
}

interface PropsGenerador {
  alertaPAC?: AlertaPAC | null;
  anomalia?: AnomaliaContrato | null;
  mesNombre?: string;
  totalPAC?: number;
  pctGlobal?: number;
  onCerrar: () => void;
}

const C = {
  navy: "#1a2742", cyan: "#5dade2",
  verde: "#27ae60", amar: "#f39c12", rojo: "#e74c3c",
  muted: "#7f8c8d", border: "#e8edf2",
};

const fmtCOP = (v: number) =>
  v >= 1e9 ? `$${(v/1e9).toFixed(2)}B COP` :
  v >= 1e6 ? `$${(v/1e6).toFixed(0)}M COP` :
  `$${(v/1e3).toFixed(0)}K COP`;

function generarTextoProposicion(datos: {
  edil: string;
  localidad: string;
  cargo: string;
  fechaDebate: string;
  mesNombre: string;
  alertaPAC?: AlertaPAC | null;
  anomalia?: AnomaliaContrato | null;
  totalPAC: number;
  pctGlobal: number;
  preguntasExtra: string;
}): string {
  const hoy = new Date().toLocaleDateString("es-CO", {
    day: "numeric", month: "long", year: "numeric"
  });

  const tipo = datos.alertaPAC ? "PRESUPUESTAL" : "CONTRACTUAL";

  let hallazgos = "";
  let preguntas = "";

  if (datos.alertaPAC) {
    const a = datos.alertaPAC;
    hallazgos = `HALLAZGO PRESUPUESTAL:\nRubro: ${a.rubro}\nPAC: ${fmtCOP(a.pac_actual)}\nGirado: ${fmtCOP(a.girado)}\nEjecución: ${a.pct_ejecucion}%\nEjecución proyectada: ${a.pct_cierre_estimado}%\nConfianza IA: ${a.confianza}%`;
    preguntas = `1. ¿Cuáles son las causas del rezago en la ejecución del rubro "${a.rubro}"?\n2. ¿Qué medidas adoptará para acelerar la ejecución?\n3. ¿Existen contratos pendientes de ejecutar?\n4. ¿Se han presentado devoluciones de recursos?\n5. ¿Cuál es el plan para garantizar ejecución mínima del 85%?`;
  }

  if (datos.anomalia) {
    const a = datos.anomalia;
    hallazgos = `HALLAZGO CONTRACTUAL:\nContrato: ${a.id}\nProveedor: ${a.proveedor}\nNIT: ${a.nit}\nMonto: ${fmtCOP(a.monto)}\nModalidad: ${a.modalidad}\nScore IA: ${a.score}/100\nAlertas: ${a.razones.join(" | ")}`;
    preguntas = `1. ¿Cuáles fueron los criterios para seleccionar a ${a.proveedor}?\n2. ¿Por qué se utilizó la modalidad "${a.modalidad}"?\n3. ¿Cuál es el estado de ejecución del contrato?\n4. ¿Cuántos contratos previos tiene este proveedor?\n5. ¿Se cuenta con los estudios previos documentados?`;
  }

  return `JUNTA ADMINISTRADORA LOCAL DE ${datos.localidad.toUpperCase()}

PROPOSICIÓN DE DEBATE DE CONTROL POLÍTICO ${tipo}
Bogotá D.C., ${hoy}

FUNDAMENTO LEGAL:
- Artículo 318 Constitución Política de Colombia
- Artículo 131 Decreto Ley 1421 de 1993
- Acuerdo 741 de 2019 del Concejo de Bogotá D.C.

EDIL PROPONENTE: ${datos.edil.toUpperCase()}
CARGO: ${datos.cargo}
LOCALIDAD: ${datos.localidad}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HALLAZGOS DETECTADOS POR IA:

${hallazgos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CUESTIONARIO PARA EL DEBATE:

${preguntas}

${datos.preguntasExtra.trim() ? `\nPREGUNTAS ADICIONALES:\n${datos.preguntasExtra}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SOLICITUDES:

PRIMERO: Citar a debate de control político al Alcalde Local y Secretario de Hacienda para responder el cuestionario.

SEGUNDO: Solicitar documentación completa (PAC, estudios previos, contratos) dentro de 5 días hábiles.

TERCERO: Enviar copia a la Contraloría de Bogotá D.C. y Veeduría Distrital.

Generado por ControlIA — Sistema de Inteligencia Artificial para Control Político
XBOG Technologies · gerencia@gestionyreclamoscolombia.org
${hoy}`;
}

export default function GeneradorProposicion({
  alertaPAC, anomalia, mesNombre = "DICIEMBRE",
  totalPAC = 0, pctGlobal = 0, onCerrar
}: PropsGenerador) {

  const [edil, setEdil]         = useState("");
  const [cargo, setCargo]       = useState("Edil");
  const [localidad, setLocalidad] = useState("Usme");
  const [fechaDebate, setFecha] = useState("");
  const [pregExtra, setPregExtra] = useState("");
  const [generado, setGenerado] = useState(false);
  const [previsualizando, setPrev] = useState(false);
  const [textoPrevia, setTextoPrevia] = useState("");

  const generar = () => {
    if (!edil.trim()) { alert("Por favor ingresa el nombre del Edil"); return; }

    const texto = generarTextoProposicion({
      edil, cargo, localidad, fechaDebate: fechaDebate || "por definir",
      mesNombre, alertaPAC, anomalia, totalPAC, pctGlobal, preguntasExtra: pregExtra,
    });

    const lineas = texto.split("\n").map(l => [l]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(lineas);
    ws["!cols"] = [{ wch: 120 }];
    XLSX.utils.book_append_sheet(wb, ws, "Proposición");

    const nombreArchivo = `Proposicion_Control_${localidad}_${new Date().getFullYear()}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
    setGenerado(true);
  };

  const previsualizar = () => {
    if (!edil.trim()) { alert("Por favor ingresa el nombre del Edil"); return; }
    const texto = generarTextoProposicion({
      edil, cargo, localidad, fechaDebate: fechaDebate || "por definir",
      mesNombre, alertaPAC, anomalia, totalPAC, pctGlobal, preguntasExtra: pregExtra,
    });
    setTextoPrevia(texto);
    setPrev(true);
  };

  if (previsualizando) {
    return (
      <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.6)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <div style={{ background:"white", borderRadius:12, width:"100%", maxWidth:780, maxHeight:"90vh", display:"flex", flexDirection:"column" as const, boxShadow:"0 20px 60px rgba(0,0,0,.4)" }}>
          <div style={{ background:C.navy, color:"white", padding:"16px 24px", borderRadius:"12px 12px 0 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontWeight:800, fontSize:15 }}>📄 Vista Previa — Proposición</div>
            <button onClick={() => setPrev(false)} style={{ background:"rgba(255,255,255,.15)", border:"none", color:"white", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13 }}>✕ Cerrar</button>
          </div>
          <div style={{ flex:1, overflow:"auto", padding:24, fontFamily:"'Courier New', monospace", fontSize:12, lineHeight:1.7, whiteSpace:"pre-wrap" as const, background:"#fafafa", color:"#1a1a1a" }}>
            {textoPrevia}
          </div>
          <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={() => setPrev(false)} style={{ padding:"9px 20px", background:"#f0f2f5", border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600 }}>← Editar</button>
            <button onClick={() => { setPrev(false); generar(); }} style={{ padding:"9px 20px", background:C.navy, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700 }}>⬇ Descargar Excel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"white", borderRadius:12, width:"100%", maxWidth:620, maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ background:`linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`, color:"white", padding:"20px 24px", borderRadius:"12px 12px 0 0" }}>
          <div style={{ fontSize:10, color:C.cyan, letterSpacing:2, textTransform:"uppercase" as const, fontWeight:700 }}>ControlIA · Generador Automático</div>
          <div style={{ fontWeight:800, fontSize:17, margin:"6px 0 4px" }}>📝 Proposición de Control Político</div>
        </div>

        <div style={{ padding:"20px 24px" }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:700, color:C.navy, display:"block", marginBottom:6 }}>Nombre del Edil *</label>
            <input value={edil} onChange={e => setEdil(e.target.value)} placeholder="Ej: Carlos Andrés Pérez Gómez" style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, boxSizing:"border-box" as const }} />
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:700, color:C.navy, display:"block", marginBottom:6 }}>Localidad</label>
            <select value={localidad} onChange={e => setLocalidad(e.target.value)} style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, background:"white", boxSizing:"border-box" as const }}>
              {["Usme","Bosa","Kennedy","Engativá","Suba","Ciudad Bolívar"].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:700, color:C.navy, display:"block", marginBottom:6 }}>Preguntas adicionales (opcional)</label>
            <textarea value={pregExtra} onChange={e => setPregExtra(e.target.value)} rows={3} style={{ width:"100%", padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, resize:"vertical" as const, boxSizing:"border-box" as const }} />
          </div>

          {generado && <div style={{ padding:"12px 16px", background:"#f0fff4", border:"1px solid #86efac", borderRadius:8, fontSize:13, color:C.verde, marginBottom:16, fontWeight:600 }}>✅ ¡Proposición generada! Revisa descargas.</div>}

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={onCerrar} style={{ padding:"10px 20px", background:"#f0f2f5", border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600 }}>Cancelar</button>
            <button onClick={previsualizar} style={{ padding:"10px 20px", background:"rgba(26,39,66,.1)", border:`1px solid ${C.navy}`, color:C.navy, borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700 }}>👁 Previsualizar</button>
            <button onClick={generar} style={{ padding:"10px 24px", background:C.navy, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700 }}>⬇ Generar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
