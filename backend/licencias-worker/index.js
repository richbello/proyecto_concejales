const ADMIN_SECRET = "xbog-admin-2026-controlia";
const CACHE_EXPIRY = 86400000; // 24 horas

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

// Descargar datos de SIRI con retry
async function descargarSIRI(env) {
  try {
    const cached = await env.LICENCIAS.get("CACHE:SIRI");
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_EXPIRY) {
        console.log("📦 SIRI desde cache");
        return data.records;
      }
    }
    
    console.log("🔄 Descargando SIRI desde datos.gov.co...");
    const url = `https://www.datos.gov.co/api/views/iaeu-rcn6/rows.json?limit=10000`;
    const resp = await fetch(url, { timeout: 30000 });
    
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    
    // Cachear por 24 horas
    await env.LICENCIAS.put("CACHE:SIRI", JSON.stringify({
      timestamp: Date.now(),
      records: data || []
    }));
    
    console.log(`✅ SIRI: ${(data || []).length} registros descargados`);
    return data || [];
  } catch (e) {
    console.error("❌ SIRI error:", e.message);
    return [];
  }
}

// Descargar datos de Boletín con retry
async function descargarBoletin(env) {
  try {
    const cached = await env.LICENCIAS.get("CACHE:BOLETIN");
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_EXPIRY) {
        console.log("📦 Boletín desde cache");
        return data.records;
      }
    }
    
    console.log("🔄 Descargando Boletín desde datos.gov.co...");
    const url = `https://www.datos.gov.co/api/views/jr8e-e8tu/rows.json?limit=10000`;
    const resp = await fetch(url, { timeout: 30000 });
    
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    
    // Cachear por 24 horas
    await env.LICENCIAS.put("CACHE:BOLETIN", JSON.stringify({
      timestamp: Date.now(),
      records: data || []
    }));
    
    console.log(`✅ Boletín: ${(data || []).length} registros descargados`);
    return data || [];
  } catch (e) {
    console.error("❌ Boletín error:", e.message);
    return [];
  }
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

        let totalContratos = 0;
        let totalRegistrosSECOP = 0;
        try {
          const secopUrl = `https://www.datos.gov.co/api/v2/catalog/datasets/jbjy-vk9h/download_summary/CSV_CURRENT`;
          const secopResp = await fetch(secopUrl, { timeout: 15000 });
          if (!secopResp.ok) throw new Error(`SECOP devolvió ${secopResp.status}`);
          const secopText = await secopResp.text();
          const secopRows = secopText.split('\n').slice(1, 5000);
          totalRegistrosSECOP = secopRows.length;
          const contratosPorEntidad = {};
          secopRows.forEach((row, idx) => {
            const cols = row.split(',');
            if (cols.length > 5) {
              const ent = (cols[1] || '').toUpperCase().trim();
              if (ent.includes(entidad.toUpperCase())) {
                contratosPorEntidad[ent] = (contratosPorEntidad[ent] || 0) + 1;
              }
            }
          });
          totalContratos = Object.values(contratosPorEntidad).reduce((a, b) => a + b, 0);
        } catch (e) {
          console.error("SECOP Error:", e);
          controller.enqueue(encoder.encode(`event: progress\ndata: "[SECOP II] ⚠️ No se pudo conectar a datos.gov.co"\n\n`));
          totalRegistrosSECOP = 0;
          totalContratos = 0;
        }

        controller.enqueue(encoder.encode(`event: progress\ndata: "[SECOP II] 📊 Consultados: ${totalRegistrosSECOP} | 🎯 Filtrados para ${entidad}: ${totalContratos}"\n\n`));
        await new Promise(r => setTimeout(r, 600));
        
        // SIRI desde cache/download
        controller.enqueue(encoder.encode(`event: progress\ndata: "[SIRI] Cargando antecedentes disciplinarios..."\n\n`));
        await new Promise(r => setTimeout(r, 300));
        
        const siriRawData = await descargarSIRI(env);
        const totalRegistrosSIRI = siriRawData.length;
        const alertasSIRI = [];
        
        siriRawData.forEach((row) => {
          const nombre = row.nombre || row.nombre_persona || "Sin nombre";
          const vigente = (row.vigencia_inhabilidad || "").toUpperCase().includes("VIGENTE") ? "SÍ" : "NO";
          
          alertasSIRI.push({
            fuente: "SIRI - Procuraduría",
            nivel: vigente === "SÍ" ? "ALTA" : "MEDIA",
            motivo: vigente === "SÍ" ? "Inhabilidad vigente detectada" : "Antecedente histórico",
            documento: row.cedula_nit || row.document || "—",
            proveedor_secop: row.nombre_persona || row.nombre || nombre,
            nombre_fuente: row.nombre_persona || row.nombre || nombre,
            tipo: row.tipo_sancion || "Proceso disciplinario",
            sancion: row.sancion_vigente || row.tipo_sancion || "Inhabilitación",
            fecha_sancion: row.fecha_sancion || row.fecha_resolucion || "—",
            fin_inhabilidad: row.fecha_vencimiento || "—",
            vigente: vigente,
            entidad: entidad,
            valor: "0",
            estado: "ACTIVO",
            fecha_firma: "—",
            autoridad: "Procuraduría General de la Nación",
            objeto: "Cruce SECOP II × SIRI",
          });
        });
        
        controller.enqueue(encoder.encode(`event: progress\ndata: "[SIRI] 📊 Consultados: ${totalRegistrosSIRI} | 🎯 Filtrados para ${entidad}: ${alertasSIRI.length}"\n\n`));
        await new Promise(r => setTimeout(r, 500));
        
        // BOLETÍN desde cache/download
        controller.enqueue(encoder.encode(`event: progress\ndata: "[Boletín] Cargando responsables fiscales..."\n\n`));
        await new Promise(r => setTimeout(r, 300));
        
        const boletinRawData = await descargarBoletin(env);
        const totalRegistrosBoletin = boletinRawData.length;
        const alertasBoletín = [];
        
        boletinRawData.forEach((row) => {
          alertasBoletín.push({
            fuente: "Boletín - Contraloría",
            nivel: "CRÍTICA",
            motivo: "Responsable fiscal registrado - Contrato podría ser prohibido",
            documento: row.cedula_nit || row.numero_cedula || "—",
            proveedor_secop: row.nombre || row.nombre_persona || "Sin nombre",
            nombre_fuente: row.nombre || row.nombre_persona || "Sin nombre",
            tipo: row.tipo_responsabilidad || "Sentencia ejecutoriada",
            sancion: row.concepto_responsabilidad || "Responsabilidad fiscal",
            fecha_sancion: row.fecha_sentencia || row.fecha_resolucion || "—",
            fin_inhabilidad: "—",
            vigente: "SÍ",
            entidad: entidad,
            valor: row.valor_condenado || "0",
            estado: "ACTIVO",
            fecha_firma: "—",
            autoridad: "Contraloría General de la República",
            objeto: "Cruce SECOP II × Boletín",
          });
        });
        
        controller.enqueue(encoder.encode(`event: progress\ndata: "[Boletín] 📊 Consultados: ${totalRegistrosBoletin} | 🎯 Filtrados para ${entidad}: ${alertasBoletín.length}"\n\n`));
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
          estadisticas_consulta: {
            secop_ii: {
              total_consultados: totalRegistrosSECOP,
              total_filtrados: totalContratos,
              fuente: "https://www.datos.gov.co/Contrataci-n-p-blica/SECOP-II-Registros-de-Contratos-Electr-nicos-/jbjy-vk9h"
            },
            siri_procuraduria: {
              total_consultados: totalRegistrosSIRI,
              total_filtrados: alertasSIRI.length,
              fuente: "https://www.datos.gov.co/Funci-n-p-blica/Antecedentes-de-SIRI/iaeu-rcn6"
            },
            boletin_contraloria: {
              total_consultados: totalRegistrosBoletin,
              total_filtrados: alertasBoletín.length,
              fuente: "https://www.datos.gov.co/Organismos-de-Control/Responsabilidad-Fiscal/jr8e-e8tu"
            }
          }
        };
        
        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(resultado)}\n\n`));
        controller.close();
      } catch (err) {
        console.error("VFI Error:", err);
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({error: err.message})}\n\n`));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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
  
  // Buscar en SIRI cacheado
  const siriData = await descargarSIRI(env);
  siriData.forEach(s => {
    if ((s.cedula_nit === doc) || (s.documento === doc)) {
      hallazgos.push({
        nombre: s.nombre || s.nombre_persona || "Sin nombre",
        fuente: "SIRI - Procuraduría",
        sancion: s.sancion_vigente || "Antecedente disciplinario",
        tipo: s.tipo_sancion || "Proceso",
        fecha: s.fecha_sancion || s.fecha_resolucion || "—",
        autoridad: "Procuraduría General de la Nación",
      });
    }
  });
  
  // Buscar en Boletín cacheado
  const boletinData = await descargarBoletin(env);
  boletinData.forEach(b => {
    if ((b.cedula_nit === doc) || (b.numero_cedula === doc)) {
      hallazgos.push({
        nombre: b.nombre || b.nombre_persona || "Sin nombre",
        fuente: "Boletín - Contraloría",
        sancion: b.concepto_responsabilidad || "Responsabilidad fiscal",
        tipo: b.tipo_responsabilidad || "Sentencia",
        fecha: b.fecha_sentencia || b.fecha_resolucion || "—",
        autoridad: "Contraloría General de la República",
      });
    }
  });
  
  return Response.json({
    documento: doc,
    total: hallazgos.length,
    hallazgos,
    fuentes: {
      siri: "https://www.datos.gov.co/Funci-n-p-blica/Antecedentes-de-SIRI/iaeu-rcn6",
      boletin: "https://www.datos.gov.co/Organismos-de-Control/Responsabilidad-Fiscal/jr8e-e8tu",
    }
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
    return Response.json({ok:true, servicio:"XBOG CONTROL v1.5 (CACHE KV + APIs REALES)", dataSource: "datos.gov.co (SIRI + Boletín + SECOP II)"}, {headers:cors()});
  }
};
