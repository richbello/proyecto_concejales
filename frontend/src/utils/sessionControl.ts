// Session Control - Prevenir reventa de licencias (Fase 0)
// Solo permite 1 sesión activa por licencia a la vez

interface SessionInfo {
  ip: string;
  device: string;
  userAgent: string;
  sessionId: string;
  timestamp: number;
}

const WORKER_URL = "https://controlia-licencias.richbello.workers.dev";
const SESSION_STORAGE_KEY = "xbog_session_v1";

// Obtener IP del usuario
async function obtenerIP(): Promise<string> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || "0.0.0.0";
  } catch {
    return "0.0.0.0";
  }
}

// Generar fingerprint del dispositivo
function generarFingerprint(): string {
  const platform = navigator.platform || "unknown";
  const width = screen.width;
  const height = screen.height;
  const lang = navigator.language || "unknown";
  return `${platform}_${width}x${height}_${lang}`;
}

// Generar ID de sesión único
function generarSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// FUNCIÓN PRINCIPAL: Validar que solo 1 sesión activa por licencia
export const validarSesionUnica = async (licenseKey: string): Promise<{permitido: boolean; dispositivo?: string; ip?: string; mensaje?: string}> => {
  try {
    // 1. Obtener datos de esta sesión
    const ip = await obtenerIP();
    const device = generarFingerprint();
    const sessionId = generarSessionId();
    
    // 2. Llamar Worker para validar
    const response = await fetch(`${WORKER_URL}/session-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clave: licenseKey,
        ip,
        device,
        sessionId
      })
    });
    
    const result = await response.json();
    
    if (!result.permitido) {
      console.warn("[SessionControl] Acceso denegado - Sesión activa en otro dispositivo");
      return {
        permitido: false,
        dispositivo: result.dispositivoActivo,
        ip: result.ipActiva,
        mensaje: `Esta licencia ya está en uso en otro dispositivo.\nSi no eres tú, contacta a Richard: 320-8303847`
      };
    }
    
    // 3. Guardar sessionId en localStorage para desloguear después
    const sessionData: SessionInfo = {
      ip,
      device,
      userAgent: navigator.userAgent,
      sessionId,
      timestamp: Date.now()
    };
    
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    console.log("[SessionControl] ✅ Sesión validada y registrada");
    
    return { permitido: true };
  } catch (error) {
    console.error("[SessionControl] Error validando sesión:", error);
    return { permitido: false, mensaje: "Error validando sesión" };
  }
};

// Cerrar sesión (cuando el usuario se logout)
export const cerrarSesion = async (licenseKey: string): Promise<void> => {
  try {
    const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionData) {
      const session: SessionInfo = JSON.parse(sessionData);
      
      // Notificar al Worker que esta sesión se cerró
      await fetch(`${WORKER_URL}/session-close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clave: licenseKey,
          sessionId: session.sessionId
        })
      }).catch(() => {}); // No requiere éxito
      
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (error) {
    console.error("[SessionControl] Error cerrando sesión:", error);
  }
};

// Obtener info de sesión actual
export const obtenerSessionActual = (): SessionInfo | null => {
  const data = localStorage.getItem(SESSION_STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};
