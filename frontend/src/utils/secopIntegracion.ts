// ─── Integración con SECOP II (datos.gov.co) - Dataset jbjy-vk9h ───────────

const DATASET_ID = "jbjy-vk9h";
const BASE_URL = `https://www.datos.gov.co/resource/${DATASET_ID}.json`;

// ─── Mapa de localidades a nombre FDL en SECOP ─────────────────────────────
const FDL_NOMBRES: Record<string, string> = {
  "Usaquén": "FONDO DE DESARROLLO LOCAL DE USAQUEN",
  "Chapinero": "FONDO DE DESARROLLO LOCAL DE CHAPINERO",
  "Santa Fe": "FONDO DE DESARROLLO LOCAL DE SANTA FE",
  "San Cristóbal": "FONDO DE DESARROLLO LOCAL DE SAN CRISTOBAL",
  "Usme": "FONDO DE DESARROLLO LOCAL DE USME",
  "Tunjuelito": "FONDO DE DESARROLLO LOCAL DE TUNJUELITO",
  "Bosa": "FONDO DE DESARROLLO LOCAL DE BOSA",
  "Kennedy": "FONDO DE DESARROLLO LOCAL DE KENNEDY",
  "Fontibón": "FONDO DE DESARROLLO LOCAL DE FONTIBON",
  "Engativá": "FONDO DE DESARROLLO LOCAL DE ENGATIVA",
  "Suba": "FONDO DE DESARROLLO LOCAL DE SUBA",
  "Barrios Unidos": "FONDO DE DESARROLLO LOCAL DE BARRIOS UNIDOS",
  "Teusaquillo": "FONDO DE DESARROLLO LOCAL DE TEUSAQUILLO",
  "Los Mártires": "FONDO DE DESARROLLO LOCAL DE LOS MARTIRES",
  "Antonio Nariño": "FONDO DE DESARROLLO LOCAL DE ANTONIO NARINO",
  "Puente Aranda": "FONDO DE DESARROLLO LOCAL DE PUENTE ARANDA",
  "La Candelaria": "FONDO DE DESARROLLO LOCAL DE LA CANDELARIA",
  "Rafael Uribe": "FONDO DE DESARROLLO LOCAL DE RAFAEL URIBE URIBE",
  "Ciudad Bolívar": "FONDO DE DESARROLLO LOCAL DE CIUDAD BOLIVAR",
  "Sumapaz": "FONDO DE DESARROLLO LOCAL DE SUMAPAZ",
};

// ─── Función principal: Cargar desde SECOP II ──────────────────────────────
export const cargarSecopII = async (localidad: string): Promise<any[]> => {
  try {
    const nombreFDL = FDL_NOMBRES[localidad] || `FONDO DE DESARROLLO LOCAL DE ${localidad.toUpperCase()}`;
    
    // Query con nombre de entidad exacto
    const whereClause = encodeURIComponent(`nombre_entidad='${nombreFDL}'`);
    const url = `${BASE_URL}?$where=${whereClause}&$limit=5000`;
    
    console.log(`[SECOP II] Cargando contratos de ${nombreFDL}...`);
    
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
    const valorPagado = parseFloat(row.valor_pagado) || 0;
    
    return [
      row.referencia_del_contrato || row.id_contrato || "",
      row.proveedor_adjudicado || "N/D",
      row.tipodocproveedor || "",
      formatFecha(row.fecha_de_inicio_del_contrato),
      formatFecha(row.fecha_de_fin_del_contrato),
      valorContrato,
      valorContrato,  // Valor final = valor contrato (SECOP no separa)
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
  return Object.keys(FDL_NOMBRES);
};
