// ─── Integración con SECOP II (datos.gov.co) ───────────────────────────────

export interface SecopContrato {
  numero_contrato: string;
  nombre_contratista: string;
  tipo_identificacion: string;
  fecha_inicio: string;
  fecha_termino_inicial: string;
  valor_contrato: number;
  valor_adiciones: number;
  fecha_termino_real: string;
  estado_contrato: string;
  localidad: string;
  objeto_contrato: string;
  rut_contratista: string;
}

// ─── Función principal: Cargar desde SECOP II ──────────────────────────────
export const cargarSecopII = async (localidad: string): Promise<any[]> => {
  try {
    // URL base de SECOP II en datos.gov.co
    const baseUrl = "https://www.datos.gov.co/api/views/p6yq-wvsx/rows.json";
    
    // Normalizar nombre de localidad para búsqueda
    const localidadNormalizada = normalizeLocalidad(localidad);
    
    // Construir query
    const query = `$where=localidad like '%${localidadNormalizada}%'&$limit=50000`;
    const url = `${baseUrl}?${query}`;
    
    console.log(`[SECOP II] Cargando contratos de ${localidad}...`);
    console.log(`[SECOP II] URL: ${url}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn("[SECOP II] Respuesta no es array:", data);
      return [];
    }

    console.log(`[SECOP II] ✅ ${data.length} contratos cargados de ${localidad}`);
    return data;
  } catch (error) {
    console.error("[SECOP II] Error:", error);
    throw error;
  }
};

// ─── Normalizar nombre de localidad ────────────────────────────────────────
function normalizeLocalidad(localidad: string): string {
  const mapa: Record<string, string> = {
    "usme": "Usme",
    "tunjuelito": "Tunjuelito",
    "bosa": "Bosa",
    "kennedy": "Kennedy",
    "antonio nariño": "Antonio Nariño",
    "la candelaria": "La Candelaria",
    "santa fe": "Santa Fe",
    "chapinero": "Chapinero",
    "barrios unidos": "Barrios Unidos",
    "teusaquillo": "Teusaquillo",
    "engativá": "Engativá",
    "suba": "Suba",
    "usaquén": "Usaquén",
    "san cristóbal": "San Cristóbal",
    "rafael uribe": "Rafael Uribe Uribe",
    "ciudad bolívar": "Ciudad Bolívar",
    "puente aranda": "Puente Aranda",
    "los mártires": "Los Mártires",
    "ráquira": "Ráquira",
  };

  const lower = localidad.toLowerCase().trim();
  return mapa[lower] || localidad;
}

// ─── Convertir SECOP a formato interno ─────────────────────────────────────
export const convertirSecopAFormato = (secopData: any[]): any[][] => {
  // Headers que esperamos
  const headers = [
    "CONTRATO",
    "NOMBRE DEL CONTRATISTA",
    "TIPO DE IDENTIFICACION",
    "FECHA INICIAL DE CONTRATO",
    "FECHA DE TERMINACION INICIAL",
    "VALOR INICIAL DEL CONTRATO",
    "VALOR FINAL DEL CONTRATO",
    "FECHA DE TERMINACION FINAL",
    "ESTADO ACTUAL DEL CONTRATO",
  ];

  // Convertir cada fila de SECOP
  const rows = secopData.map((row) => [
    row.numero_contrato || "",
    row.nombre_contratista || "",
    row.tipo_identificacion || "",
    formatFecha(row.fecha_inicio),
    formatFecha(row.fecha_termino_inicial),
    parseFloat(row.valor_contrato) || 0,
    parseFloat(row.valor_contrato) + parseFloat(row.valor_adiciones || 0),
    formatFecha(row.fecha_termino_real),
    (row.estado_contrato || "SIN ESTADO").toUpperCase(),
  ]);

  return [headers, ...rows];
};

// ─── Formateador de fechas ────────────────────────────────────────────────
function formatFecha(fecha: any): string {
  if (!fecha) return "";
  
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return "";
    
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

// ─── Obtener lista de localidades disponibles ──────────────────────────────
export const obtenerLocalidades = async (): Promise<string[]> => {
  try {
    const url = "https://www.datos.gov.co/api/views/p6yq-wvsx/rows.json?$select=localidad&$limit=1000";
    const response = await fetch(url);
    const data = await response.json();

    const localidadesArray = data.map((r: any) => r.localidad).filter(Boolean) as string[];
    const localidadesUnicas = [...new Set(localidadesArray)].sort();
    return localidadesUnicas;
  } catch (error) {
    console.error("[SECOP II] Error obteniendo localidades:", error);
    return [];
  }
};
