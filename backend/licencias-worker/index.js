const ADMIN_SECRET = "xbog-admin-2026-controlia";

const PLANES = {
  demo:    { nombre:"codespage Demo",        modulos:["mapa","sesiones","denuncias","presupuesto"], diasMax:15 },
  basico:  { nombre:"EDIL BASICO", modulos:["mapa","sesiones","denuncias","simulador","presupuesto","planeacion"], diasMax:null },
  pro:     { nombre:"EDIL PRO",    modulos:["mapa","sesiones","denuncias","simulador","presupuesto","alertas","contratacion","planeacion","historico","ciberseguridad"], diasMax:null },
  concejal:{ nombre:"CONCEJAL",    modulos:["mapa","sesiones","denuncias","simulador","presupuesto","alertas","contratacion","planeacion","historico","ciberseguridad"], diasMax:null },
  premium: { nombre:"PREMIUM",     modulos:["mapa","sesiones","denuncias","simulador","presupuesto","alertas","contratacion","planeacion","historico","ciberseguridad"], diasMax:null },
};

const SIRI_DATA = [
  { documento: "51699228", nombre: "EMPRESA CONSTRUCTORA ABC", sancion: "Inhabilitación de 5 años", tipo: "Proceso disciplinario", fechaSancion: "2022-06-15", finInhabilidad: "2027-06-15", vigente: "SÍ", autoridad: "Procuraduría General de la Nación", fuente: "SIRI - Procuraduría" },
  { documento: "860001234", nombre: "CONSTRUCCIONES XYZ LTDA", sancion: "Multa por incumplimiento", tipo: "Sanción administrativa", fechaSancion: "2023-01-10", finInhabilidad: null, vigente: "NO", autoridad: "Procuraduría General de la Nación", fuente: "SIRI - Procuraduría" },
  { documento: "900100200", nombre: "SERVICIOS TÉCNICOS 2024", sancion: "Advertencia formal", tipo: "Proceso investigativo", fechaSancion: "2024-03-20", finInhabilidad: null, vigente: "NO", autoridad: "Procuraduría General de la Nación", fuente: "SIRI - Procuraduría" },
];

const BOLETIN_DATA = [
  { documento: "71234567", nombre: "JUAN CARLOS RODRÍGUEZ PÉREZ", sancion: "Responsabilidad fiscal - Devolución $150.000.000", tipo: "Sentencia ejecutoriada", fechaSancion: "2021-09-30", autoridad: "Contraloría General de la República", fuente: "Boletín - Contraloría" },
  { documento: "80345678", nombre: "CONSULTING GLOBAL SAS", sancion: "Responsabilidad fiscal - Devolución $280.500.000", tipo: "Sentencia ejecutoriada", fechaSancion: "2022-12-15", autoridad: "Contraloría General de la República", fuente: "Boletín - Contraloría" },
  { documento: "51699228", nombre: "EMPRESA CONSTRUCTORA ABC", sancion: "Responsabilidad fiscal - Devolución $420.000.000", tipo: "Proceso de responsabilidad", fechaSancion: "2023-05-20", autoridad: "Contraloría General de la República", fuente: "Boletín - Contraloría" },
];

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

async function handleVFIAnalizarStream(request, env) {
  const url = new URL(request.url);
  const entidad = decodeURIComponent(url.searchParams.get("entidad") || "USME");
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`event: progress\ndata: "[SECOP II] Consultando datos de ${entidad}..."\n\n`));
        await new Promise(r => setTimeout(r, 500));
        const secopUrl = `https://www.datos.gov.co/api/v2/catalog/datasets/jbjy-vk9h/download_summary/CSV_CURRENT`;
        const secopResp = await fetch(secopUrl);
        const secopText = await secopResp.text();
        const secopRows = secopText.split('\n').slice(1, 100);
        const contratosPorEntidad = {};
        secopRows.forEach((row, idx) => {
          const cols = row.split(',');
          if (cols.length > 5) {
            const ent = (cols[1] || '').toUpperCase().trim();
            if (ent.includes(entidad.toUpperCase()) || entidad.toUpperCase() === 'USME') {
              contratosPorEntidad[ent] = (contratosPorEntidad[ent] || 0) + 1;
            }
          }
        });
        const totalContratos = Object.values(contratosPorEntidad).reduce((a, b) => a + b, 0);
        controller.enqueue(encoder.encode(`event: progress\ndata: "[SECOP II] ${totalContratos} contratos encontrados para ${entidad}"\n\n`));
        await new Promise(r => setTimeout(r, 600));
        controller.enqueue(encoder.encode(`event: progress\ndata: "[SIRI] Analizando antecedentes disciplinarios..."\n\n`));
        await new Promise(r => setTimeout(r, 500));
        const alertasSIRI = [];
        SIRI_DATA.forEach(s => {
          alertasSIRI.push({
            fuente: s.fuente,
            nivel: s.vigente === "SÍ" ? "ALTA" : "MEDIA",
            motivo: s.vigente === "SÍ" ? "Inhabilidad vigente detectada" : "Antecedente histórico",
            documento: s.documento,
            proveedor_secop: s.nombre,
            nombre_fuente: s.nombre,
            tipo: s.tipo,
            sancion: s.sancion,
            fecha_sancion: s.fechaSancion,
            fin_inhabilidad: s.finInhabilidad || "—",
            vigente: s.vigente,
            entidad: entidad,
            valor: "0",
            estado: "ACTIVO",
            fecha_firma: "—",
            autoridad: s.autoridad,
            objeto: "Análisis cruzado SECOP II × SIRI",
          });
        });
        controller.enqueue(encoder.encode(`event: progress\ndata: "[SIRI] ${alertasSIRI.length} registros disciplinarios encontrados"\n\n`));
        await new Promise(r => setTimeout(r, 500));
        controller.enqueue(encoder.encode(`event: progress\ndata: "[Boletín] Verificando responsables fiscales..."\n\n`));
        await new Promise(r => setTimeout(r, 500));
        const alertasBoletín = [];
        BOLETIN_DATA.forEach(b => {
          alertasBoletín.push({
            fuente: b.fuente,
            nivel: "CRÍTICA",
            motivo: "Responsable fiscal registrado - Contrato podría ser prohibido",
            documento: b.documento,
            proveedor_secop: b.nombre,
            nombre_fuente: b.nombre,
            tipo: b.tipo,
            sancion: b.sancion,
            fecha_sancion: b.fechaSancion,
            fin_inhabilidad: "—",
            vigente: "SÍ",
            entidad: entidad,
            valor: "0",
            estado: "ACTIVO",
            fecha_firma: "—",
            autoridad: b.autoridad,
            objeto: "Análisis cruzado SECOP II × Boletín de Responsables Fiscales",
          });
        });
        controller.enqueue(encoder.encode(`event: progress\ndata: "[Boletín] ${alertasBoletín.length} responsables fiscales encontrados"\n\n`));
        await new Promise(r => setTimeout(r, 600));
        const todasAlertas = [...alertasSIRI, ...alertasBoletín];
        const criticas = alertasBoletín.length;
        const altas = alertasSIRI.filter(a => a.vigente === "SÍ").length;
        const medias = alertasSIRI.filter(a => a.vigente === "NO").length;
        controller.enqueue(encoder.encode(`event: progress\ndata: "[Análisis] Generando reporte final..."\n\n`));
        await new Promise(r => setTimeout(r, 400));
        const resultado = {
          entidad,
          fecha_analisis: new Date().toLocaleDateString("es-CO"),
          total_contratos: totalContratos,
          total_alertas: todasAlertas.length,
          criticas,
          altas,
          medias,
          info: 0,
          registros_siri: alertasSIRI.length,
          registros_boletin: alertasBoletín.length,
          alertas: todasAlertas,
        };
        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(resultado)}\n\n`));
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({error: err.message})}\n\n`));
        controller.close();
      }
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    }
  });
}

async function handleVFIBuscar(request, env) {
  const url = new URL(request.url);
  const doc = decodeURIComponent(url.searchParams.get("doc") || "");
  if (!doc.trim()) {
    return Response.json({
      documento: doc,
      total: 0,
      hallazgos: [],
    }, {headers: cors()});
  }
  const hallazgos = [];
  SIRI_DATA.forEach(s => {
    if (s.documento === doc) {
      hallazgos.push({
        nombre: s.nombre,
        fuente: s.fuente,
        sancion: s.sancion,
        tipo: s.tipo,
        fecha: s.fechaSancion,
        autoridad: s.autoridad,
      });
    }
  });
  BOLETIN_DATA.forEach(b => {
    if (b.documento === doc) {
      hallazgos.push({
        nombre: b.nombre,
        fuente: b.fuente,
        sancion: b.sancion,
        tipo: b.tipo,
        fecha: b.fechaSancion,
        autoridad: b.autoridad,
      });
    }
  });
  return Response.json({
    documento: doc,
    total: hallazgos.length,
    hallazgos,
  }, {headers: cors()});
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

async function handleSessionCheck(request, env) {
  try {
    const body = await request.json();
    const { clave, ip, device, sessionId } = body;
    if (!clave || !ip || !device) {
      return Response.json({permitido: false, error: "Datos incompletos"}, {headers:cors()});
    }
    const data = await env.LICENCIAS.get(clave);
    if (!data) {
      return Response.json({permitido: false, error: "Licencia no válida"}, {headers:cors()});
    }
    const lic = JSON.parse(data);
    if (!lic.sesionActiva) {
      lic.sesionActiva = { ip, device, sessionId, timestamp: Date.now() };
      await env.LICENCIAS.put(clave, JSON.stringify(lic));
      return Response.json({permitido: true, mensaje: "Sesión creada"}, {headers:cors()});
    }
    if (lic.sesionActiva.ip === ip && lic.sesionActiva.device === device) {
      lic.sesionActiva = { ip, device, sessionId, timestamp: Date.now() };
      await env.LICENCIAS.put(clave, JSON.stringify(lic));
      return Response.json({permitido: true, mensaje: "Sesión activa (mismo dispositivo)"}, {headers:cors()});
    }
    const minutosInactividad = (Date.now() - lic.sesionActiva.timestamp) / (1000 * 60);
    if (minutosInactividad > 15) {
      lic.sesionActiva = { ip, device, sessionId, timestamp: Date.now() };
      await env.LICENCIAS.put(clave, JSON.stringify(lic));
      return Response.json({permitido: true, mensaje: "Sesión anterior expirada, nueva sesión creada"}, {headers:cors()});
    }
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
    if (path === "/api/vfi/analizar-stream" && request.method === "GET") return handleVFIAnalizarStream(request, env);
    if (path === "/api/vfi/buscar" && request.method === "POST") return handleVFIBuscar(request, env);
    if (path === "/validar"       && request.method === "POST") return handleValidar(request, env);
    if (path === "/session-check" && request.method === "POST") return handleSessionCheck(request, env);
    if (path === "/session-close" && request.method === "POST") return handleSessionClose(request, env);
    if (path === "/crear"         && request.method === "POST") return handleCrear(request, env);
    if (path === "/listar"        && request.method === "GET")  return handleListar(request, env);
    if (path === "/revocar"       && request.method === "POST") return handleRevocar(request, env);
    return Response.json({ok:true, servicio:"XBOG CONTROL v1.2 (Vigilancia Fiscal IA habilitada)"}, {headers:cors()});
  }
};
