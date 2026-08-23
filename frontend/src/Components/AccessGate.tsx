import { useState, useEffect, ReactNode } from "react";
import { validarSesionUnica, cerrarSesion } from "../utils/sessionControl";

const WORKER_URL = "https://controlia-licencias.richbello.workers.dev";
const STORAGE_KEY = "cp_licencia_v1";

interface LicenciaData {
  ok: boolean;
  plan: string;
  planKey: string;
  modulos: string[];
  cliente: string;
  localidad: string;
  expira: string | null;
  diasRestantes: number | null;
}

interface Props {
  children: ReactNode;
  onLicencia?: (data: LicenciaData) => void;
}

export let licenciaActual: LicenciaData | null = null;

export default function AccessGate({ children, onLicencia }: Props) {
  const [licencia, setLicencia] = useState<LicenciaData | null>(null);
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verClave, setVerClave] = useState(false);
  const [validando, setValidando] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        fetch(WORKER_URL + "/validar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clave: data.clave }),
        })
          .then(r => r.json())
          .then(res => {
            if (res.ok) {
              // Validar sesión única en carga inicial
              const sessionValidation = await validarSesionUnica(data.clave);
              
              if (!sessionValidation.permitido) {
                localStorage.removeItem(STORAGE_KEY);
                setError("⚠️ " + (sessionValidation.mensaje || "Sesión duplicada detectada"));
                setValidando(false);
                return;
              }
              
              licenciaActual = { ...res, clave: data.clave };
              setLicencia(res);
              onLicencia?.(res);
            } else {
              localStorage.removeItem(STORAGE_KEY);
              setError("Licencia inválida o expirada.");
            }
            setValidando(false);
          })
          .catch(() => {
            localStorage.removeItem(STORAGE_KEY);
            setError("No hay conexión con el servidor. Verifica tu internet e intenta nuevamente.");
            setValidando(false);
          });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setValidando(false);
      }
    } else {
      setValidando(false);
    }
  }, []);

  const validar = async () => {
    if (!clave.trim()) { setError("Ingresa tu clave de licencia."); return; }
    setCargando(true); setError("");
    try {
      const res = await fetch(WORKER_URL + "/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave: clave.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (data.ok) {
        const stored = { ...data, clave: clave.trim().toUpperCase() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        // Validar que solo 1 sesión activa por licencia
        const sessionValidation = await validarSesionUnica(clave.trim().toUpperCase());
        
        if (!sessionValidation.permitido) {
          setError("⚠️ " + (sessionValidation.mensaje || "Acceso denegado"));
          return;
        }
        
        licenciaActual = stored;
        setLicencia(data);
        setError("");
        onLicencia?.(data);
      } else {
        setError(data.error || "Licencia no válida.");
      }
    } catch {
      setError("Error de conexión. Verifica tu internet.");
    }
    setCargando(false);
  };

  const cerrar = async () => {
    if (licencia) {
      await cerrarSesion(clave || licencia.cliente);
    }
    localStorage.removeItem(STORAGE_KEY);
    licenciaActual = null;
    setLicencia(null);
    setClave("");
    setError("");
  };

  if (validando) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#0a0f1e" }}>
        <div style={{ color:"#5dade2", fontSize:14, fontFamily:"'Segoe UI',sans-serif" }}>⏳ Verificando licencia...</div>
      </div>
    );
  }

  if (!licencia) {
    return (
      <div style={{ minHeight:"100vh", background:"radial-gradient(ellipse at top, #0d1b2a 0%, #0a0f1e 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Segoe UI',sans-serif" }}>
        <div style={{ width:"100%", maxWidth:440 }}>
          <div style={{ textAlign:"center" as const, marginBottom:32 }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🏛️</div>
            <div style={{ fontSize:10, color:"#5dade2", letterSpacing:4, fontWeight:700, textTransform:"uppercase" as const }}>XBOG Technologies</div>
            <h1 style={{ color:"#e2e8f0", fontSize:26, fontWeight:900, margin:"10px 0 6px" }}>XBOG CONTROL</h1>
            <div style={{ color:"#94a3b8", fontSize:12 }}>Plataforma de Control Político</div>
          </div>

          <div style={{ background:"#161d2e", borderRadius:16, padding:32, border:"1px solid #1e2a40", boxShadow:"0 24px 48px rgba(0,0,0,.5)" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", marginBottom:20, textAlign:"center" as const }}>🔑 Ingresa tu clave de licencia</div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:10, color:"#94a3b8", fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, marginBottom:6 }}>Clave de licencia</label>
              <div style={{ position:"relative" as const }}>
                <input
                  value={clave}
                  onChange={e => setClave(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && validar()}
                  type={verClave ? "text" : "password"}
                  placeholder="CP-PRO-XXXX-XXXX-XXXX-XXXX"
                  style={{ width:"100%", background:"#0a0f1e", border:`1.5px solid ${error ? "#D10D0D" : "#1e2a40"}`, borderRadius:10, padding:"12px 44px 12px 16px", color:"#e2e8f0", fontSize:13, outline:"none", boxSizing:"border-box" as const, fontFamily:"monospace", letterSpacing:1 }}
                />
                <button onClick={() => setVerClave(v => !v)} style={{ position:"absolute" as const, right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#4a5568", fontSize:16 }}>
                  {verClave ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background:"#D10D0D22", border:"1px solid #D10D0D44", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#D10D0D", fontWeight:600 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={validar} disabled={cargando} style={{ width:"100%", background:cargando ? "#4a5568" : "linear-gradient(135deg,#FFD100 0%,#D10D0D 100%)", border:"none", borderRadius:10, padding:"13px", color:"#0a0f1e", fontWeight:800, fontSize:14, cursor:cargando ? "default" : "pointer" }}>
              {cargando ? "⏳ Verificando..." : "🚀 Activar plataforma"}
            </button>

            <div style={{ marginTop:20, padding:"12px 14px", background:"#0a0f1e", borderRadius:8, fontSize:11, color:"#4a5568", textAlign:"center" as const }}>
              ¿No tienes licencia? Contacta a XBOG Technologies<br/>
              <span style={{ color:"#5dade2" }}>xbogtechnologies@zohomail.com</span>
            </div>
          </div>

          <div style={{ textAlign:"center" as const, marginTop:16, fontSize:10, color:"#4a5568" }}>
            🔒 Conexión segura · XBOG Technologies © 2026
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {licencia.diasRestantes !== null && licencia.diasRestantes <= 5 && (
        <div style={{ background:"#D10D0D", color:"white", textAlign:"center" as const, padding:"6px", fontSize:12, fontWeight:700 }}>
          ⚠️ Tu licencia {licencia.plan} vence en {licencia.diasRestantes} días · Contacta a XBOG para renovar
        </div>
      )}
      {licencia.plan === "DEMO" && (
        <div style={{ background:"#f39c12", color:"#0a0f1e", textAlign:"center" as const, padding:"6px", fontSize:12, fontWeight:700 }}>
          🎯 Modo DEMO · {licencia.diasRestantes} días restantes · <span style={{ textDecoration:"underline", cursor:"pointer" }} onClick={cerrar}>Cambiar licencia</span>
        </div>
      )}
      {children}
    </>
  );
}
