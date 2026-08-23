const ADMIN_SECRET = "xbog-admin-2026-controlia";

const PLANES = {
  demo:    { nombre:"codespage Demo",        modulos:["mapa","sesiones","denuncias","presupuesto"], diasMax:15 },
  basico:  { nombre:"EDIL BASICO", modulos:["mapa","sesiones","denuncias","simulador","presupuesto","planeacion"], diasMax:null },
  pro:     { nombre:"EDIL PRO",    modulos:["mapa","sesiones","denuncias","simulador","presupuesto","alertas","contratacion","planeacion","historico","ciberseguridad"], diasMax:null },
  concejal:{ nombre:"CONCEJAL",    modulos:["mapa","sesiones","denuncias","simulador","presupuesto","alertas","contratacion","planeacion","historico","ciberseguridad"], diasMax:null },
  premium: { nombre:"PREMIUM",     modulos:["mapa","sesiones","denuncias","simulador","presupuesto","alertas","contratacion","planeacion","historico","ciberseguridad"], diasMax:null },
};

function generarClave(plan) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const partes = [4,4,4,4].map(n => Array.from({length:n}, () => chars[Math.floor(Math.random()*chars.length)]).join(""));
  const prefijo = plan.toUpperCase().slice(0,3);
  return "CP-" + prefijo + "-" + partes.join("-");
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Admin-Secret",
    "Content-Type": "application/json",
  };
}

async function handleValidar(request, env) {
  const body = await request.json();
  const clave = (body.clave || "").toUpperCase().trim();
  if (!clave) return Response.json({ok:false, error:"Clave requerida"}, {headers:cors()});

  const data = await env.LICENCIAS.get(clave);
  if (!data) return Response.json({ok:false, error:"Licencia no valida"}, {headers:cors()});

  const lic = JSON.parse(data);

  if (lic.expira && Date.now() > lic.expira) {
    return Response.json({ok:false, error:"Licencia expirada", expirada:true}, {headers:cors()});
  }
  if (!lic.activa) {
    return Response.json({ok:false, error:"Licencia suspendida"}, {headers:cors()});
  }

  const plan = PLANES[lic.plan] || PLANES.demo;
  lic.ultimoAcceso = new Date().toISOString();
  lic.accesos = (lic.accesos || 0) + 1;
  await env.LICENCIAS.put(clave, JSON.stringify(lic));

  return Response.json({
    ok: true,
    plan: plan.nombre,
    planKey: lic.plan,
    modulos: plan.modulos,
    cliente: lic.cliente,
    localidad: lic.localidad,
    expira: lic.expira ? new Date(lic.expira).toLocaleDateString("es-CO") : null,
    diasRestantes: lic.expira ? Math.max(0, Math.ceil((lic.expira - Date.now()) / 86400000)) : null,
  }, {headers:cors()});
}

// ─── NUEVO: Validar sesión única (Fase 0) ──────────────────────────────
async function handleSessionCheck(request, env) {
  try {
    const body = await request.json();
    const { clave, ip, device, sessionId } = body;
    
    if (!clave || !ip || !device) {
      return Response.json({permitido: false, error: "Datos incompletos"}, {headers:cors()});
    }

    // Obtener licencia
    const data = await env.LICENCIAS.get(clave);
    if (!data) {
      return Response.json({permitido: false, error: "Licencia no válida"}, {headers:cors()});
    }

    const lic = JSON.parse(data);

    // Inicializar sesión activa si no existe
    if (!lic.sesionActiva) {
      lic.sesionActiva = { ip, device, sessionId, timestamp: Date.now() };
      await env.LICENCIAS.put(clave, JSON.stringify(lic));
      return Response.json({permitido: true, mensaje: "Sesión creada"}, {headers:cors()});
    }

    // ¿Es la misma IP y device? → Permitir (re-entrada)
    if (lic.sesionActiva.ip === ip && lic.sesionActiva.device === device) {
      lic.sesionActiva = { ip, device, sessionId, timestamp: Date.now() };
      await env.LICENCIAS.put(clave, JSON.stringify(lic));
      return Response.json({permitido: true, mensaje: "Sesión activa (mismo dispositivo)"}, {headers:cors()});
    }

    // ¿Sesión anterior expiró? (>15 min sin actividad)
    const minutosInactividad = (Date.now() - lic.sesionActiva.timestamp) / (1000 * 60);
    if (minutosInactividad > 15) {
      // Permitir y reemplazar sesión anterior
      lic.sesionActiva = { ip, device, sessionId, timestamp: Date.now() };
      await env.LICENCIAS.put(clave, JSON.stringify(lic));
      return Response.json({permitido: true, mensaje: "Sesión anterior expirada, nueva sesión creada"}, {headers:cors()});
    }

    // ¿IP o device diferente? → BLOQUEAR (reventa detectada)
    return Response.json({
      permitido: false,
      dispositivoActivo: lic.sesionActiva.device,
      ipActiva: lic.sesionActiva.ip,
      error: "Sesión activa en otro dispositivo"
    }, {headers:cors()});

  } catch (error) {
    console.error("Error en session-check:", error);
    return Response.json({permitido: false, error: "Error del servidor"}, {status:500, headers:cors()});
  }
}

// ─── NUEVO: Cerrar sesión (logout) ────────────────────────────────────
async function handleSessionClose(request, env) {
  try {
    const body = await request.json();
    const { clave, sessionId } = body;

    if (!clave) {
      return Response.json({ok: false, error: "Clave requerida"}, {headers:cors()});
    }

    const data = await env.LICENCIAS.get(clave);
    if (!data) {
      return Response.json({ok: false, error: "Licencia no válida"}, {headers:cors()});
    }

    const lic = JSON.parse(data);

    // Limpiar sesión si coincide el sessionId
    if (lic.sesionActiva && lic.sesionActiva.sessionId === sessionId) {
      lic.sesionActiva = null;
      await env.LICENCIAS.put(clave, JSON.stringify(lic));
    }

    return Response.json({ok: true, mensaje: "Sesión cerrada"}, {headers:cors()});

  } catch (error) {
    console.error("Error en session-close:", error);
    return Response.json({ok: false, error: "Error del servidor"}, {status:500, headers:cors()});
  }
}

async function handleCrear(request, env) {
  if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
    return Response.json({ok:false, error:"No autorizado"}, {status:401, headers:cors()});
  }
  const body = await request.json();
  const { plan, cliente, localidad, dias } = body;

  if (!plan || !PLANES[plan]) return Response.json({ok:false, error:"Plan invalido"}, {headers:cors()});
  if (!cliente) return Response.json({ok:false, error:"Cliente requerido"}, {headers:cors()});

  const clave = generarClave(plan);
  const diasFinal = dias || PLANES[plan].diasMax;
  const expira = diasFinal ? Date.now() + (diasFinal * 86400000) : null;

  const licencia = {
    clave, plan, cliente,
    localidad: localidad || "",
    activa: true,
    creada: new Date().toISOString(),
    expira, accesos: 0, ultimoAcceso: null,
    sesionActiva: null,
  };

  await env.LICENCIAS.put(clave, JSON.stringify(licencia));

  return Response.json({
    ok: true, clave,
    plan: PLANES[plan].nombre,
    cliente,
    expira: expira ? new Date(expira).toLocaleDateString("es-CO") : "Sin vencimiento",
  }, {headers:cors()});
}

async function handleListar(request, env) {
  if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
    return Response.json({ok:false, error:"No autorizado"}, {status:401, headers:cors()});
  }
  const lista = await env.LICENCIAS.list();
  const licencias = await Promise.all(
    lista.keys.map(async k => {
      const d = await env.LICENCIAS.get(k.name);
      return d ? JSON.parse(d) : null;
    })
  );
  return Response.json({ok:true, licencias: licencias.filter(Boolean), total: licencias.length}, {headers:cors()});
}

async function handleRevocar(request, env) {
  if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
    return Response.json({ok:false, error:"No autorizado"}, {status:401, headers:cors()});
  }
  const { clave, activa } = await request.json();
  const data = await env.LICENCIAS.get(clave);
  if (!data) return Response.json({ok:false, error:"No encontrada"}, {headers:cors()});

  const lic = JSON.parse(data);
  lic.activa = activa !== undefined ? activa : false;
  await env.LICENCIAS.put(clave, JSON.stringify(lic));

  return Response.json({ok:true, mensaje: lic.activa ? "Licencia activada" : "Licencia suspendida"}, {headers:cors()});
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, {headers:cors()});
    const path = new URL(request.url).pathname;
    if (path === "/validar"       && request.method === "POST") return handleValidar(request, env);
    if (path === "/session-check" && request.method === "POST") return handleSessionCheck(request, env);
    if (path === "/session-close" && request.method === "POST") return handleSessionClose(request, env);
    if (path === "/crear"         && request.method === "POST") return handleCrear(request, env);
    if (path === "/listar"        && request.method === "GET")  return handleListar(request, env);
    if (path === "/revocar"       && request.method === "POST") return handleRevocar(request, env);
    return Response.json({ok:true, servicio:"XBOG CONTROL Licencias v1.1 (Sesiones habilitadas)"}, {headers:cors()});
  }
};
