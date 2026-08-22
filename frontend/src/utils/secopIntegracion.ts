// ─── Integración con SECOP II (datos.gov.co) - Dataset jbjy-vk9h ───────────

const DATASET_ID = "jbjy-vk9h";
const BASE_URL = `https://www.datos.gov.co/resource/${DATASET_ID}.json`;

// ─── Palabra clave única por localidad para búsqueda LIKE ───────────────────
// SECOP II tiene nombres INCONSISTENTES, usamos keyword robusto
const LOCALIDAD_KEYWORD: Record<string, string> = {
  "Usaquén": "USAQUEN",
  "Chapinero": "CHAPINERO",
  "Santa Fe": "SANTA FE",
  "San Cristóbal": "SAN CRISTOBAL",
  "Usme": "USME",
  "Tunjuelito": "TUNJUELITO",
  "Bosa": "BOSA",
  "Kennedy": "KENNEDY",
  "Fontibón": "FONTIBON",
  "Engativá": "ENGATIV",
  "Suba": "SUBA",
  "Barrios Unidos": "BARRIOS UNIDOS",
  "Teusaquillo": "TEUSAQUILLO",
  "Los Mártires": "MARTIRES",
  "Antonio Nariño": "ANTONIO NARI",
  "Puente Aranda": "PUENTE ARANDA",
  "La Candelaria": "CANDELARIA",
  "Rafael Uribe": "RAFAEL URIBE",
  "Ciudad Bolívar": "CIUDAD BOLIVAR",
  "Sumapaz": "SUMAPAZ",
};

// ─── Función principal: Cargar desde SECOP II ──────────────────────────────
export const cargarSecopII = async (localidad: string): Promise<any[]> => {
  try {
    const keyword = LOCALIDAD_KEYWORD[localidad] || localidad.toUpperCase();
    
    // Buscar entidades que sean ALCALDIA o FONDO DESARROLLO + keyword localidad
    // upper() normaliza mayúsculas en el servidor
    const whereClause = encodeURIComponent(
      `upper(nombre_entidad) like '%${keyword}%' AND ` +
      `(upper(nombre_entidad) like '%ALCALDIA LOCAL%' OR upper(nombre_entidad) like '%DESARROLLO LOCAL%') AND ` +
      `ciudad='Bogotá'`
    );
    const url = `${BASE_URL}?$where=${whereClause}&$limit=5000`;
    
    console.log(`[SECOP II] Buscando "${keyword}" en ${localidad}...`);
    console.log(`[SECOP II] URL: ${url}`);
    
    const response = await fetch(url);

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

// ─── Convertir SECOP a formato interno del módulo ──────────────────────────
export const convertirSecopAFormato = (secopData: any[]): any[][] => {
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

  const rows = secopData.map((row) => {
    const valorContrato = parseFloat(row.valor_del_contrato) || 0;
    
    return [
      row.referencia_del_contrato || row.id_contrato || "",
      row.proveedor_adjudicado || "N/D",
      row.tipodocproveedor || "",
      formatFecha(row.fecha_de_inicio_del_contrato),
      formatFecha(row.fecha_de_fin_del_contrato),
      valorContrato,
      valorContrato,
      formatFecha(row.fecha_de_fin_del_contrato),
      (row.estado_contrato || "SIN ESTADO").toUpperCase(),
    ];
  });

  return [headers, ...rows];
};

// ─── Formateador de fechas ────────────────────────────────────────────────
function formatFecha(fecha: any): string {
  if (!fecha) return "";
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

// ─── Obtener lista de localidades disponibles ──────────────────────────────
export const obtenerLocalidades = async (): Promise<string[]> => {
  return Object.keys(LOCALIDAD_KEYWORD);
};
