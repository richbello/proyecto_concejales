// ==============================================================================
// Integracion con SECOP II (datos.gov.co) - Dataset jbjy-vk9h
// Soporta: Bogota (20 localidades) + municipios (Soacha, Mosquera, Funza, etc)
// ==============================================================================

const DATASET_ID = "jbjy-vk9h";
const BASE_URL = `https://www.datos.gov.co/resource/${DATASET_ID}.json`;

const LOCALIDADES_BOGOTA: Record<string, string[]> = {
  "Usaquen": ["USAQUEN", "ALCALDIA LOCAL"],
  "Chapinero": ["CHAPINERO", "ALCALDIA LOCAL"],
  "Santa Fe": ["SANTA FE", "ALCALDIA LOCAL"],
  "San Cristobal": ["SAN CRISTOBAL", "ALCALDIA LOCAL"],
  "Usme": ["USME", "ALCALDIA LOCAL"],
  "Tunjuelito": ["TUNJUELITO", "ALCALDIA LOCAL"],
  "Bosa": ["BOSA", "ALCALDIA LOCAL"],
  "Kennedy": ["KENNEDY", "ALCALDIA LOCAL"],
  "Fontibon": ["FONTIBON", "ALCALDIA LOCAL"],
  "Engativa": ["ENGATIV", "ALCALDIA LOCAL"],
  "Suba": ["SUBA", "ALCALDIA LOCAL"],
  "Barrios Unidos": ["BARRIOS UNIDOS", "ALCALDIA LOCAL"],
  "Teusaquillo": ["TEUSAQUILLO", "ALCALDIA LOCAL"],
  "Los Martires": ["MARTIRES", "ALCALDIA LOCAL"],
  "Antonio Narino": ["ANTONIO NARI", "ALCALDIA LOCAL"],
  "Puente Aranda": ["PUENTE ARANDA", "ALCALDIA LOCAL"],
  "La Candelaria": ["CANDELARIA", "ALCALDIA LOCAL"],
  "Rafael Uribe": ["RAFAEL URIBE", "ALCALDIA LOCAL"],
  "Ciudad Bolivar": ["CIUDAD BOLIVAR", "ALCALDIA LOCAL"],
  "Sumapaz": ["SUMAPAZ", "ALCALDIA LOCAL"],
};

interface MunicipioConfig {
  ciudad: string;
  keywords: string[];
}

const MUNICIPIOS: Record<string, MunicipioConfig> = {
  "Soacha": { ciudad: "Soacha", keywords: ["MUNICIPIO DE SOACHA", "SOACHA"] },
  "Mosquera": { ciudad: "Mosquera", keywords: ["MUNICIPIO DE MOSQUERA", "MOSQUERA"] },
  "Funza": { ciudad: "Funza", keywords: ["MUNICIPIO DE FUNZA", "FUNZA"] },
  "Tocancipa": { ciudad: "Tocancipa", keywords: ["MUNICIPIO DE TOCANCIPA", "TOCANCIPA"] },
  "Zipaquira": { ciudad: "Zipaquira", keywords: ["MUNICIPIO DE ZIPAQUIRA", "ZIPAQUIRA"] },
};

export const obtenerMunicipios = (): string[] => {
  return ["Bogota", ...Object.keys(MUNICIPIOS)];
};

export const obtenerLocalidades = (municipio?: string): string[] => {
  if (!municipio || municipio === "Bogota") {
    return Object.keys(LOCALIDADES_BOGOTA);
  }
  return ["General"];
};

export const cargarSecopII = async (
  municipio: string,
  localidad?: string
): Promise<any[]> => {
  try {
    let keywords: string[];
    let ciudad: string;

    if (!municipio || municipio === "Bogota") {
      ciudad = "Bogot\u00e1";
      const loc = localidad && LOCALIDADES_BOGOTA[localidad] ? localidad : "Usme";
      keywords = LOCALIDADES_BOGOTA[loc];
    } else {
      const config = MUNICIPIOS[municipio];
      if (!config) {
        throw new Error(`Municipio "${municipio}" no configurado`);
      }
      ciudad = config.ciudad;
      keywords = config.keywords;
    }

    const whereCondiciones = keywords
      .map(kw => `upper(nombre_entidad) like '%${kw}%'`)
      .join(" OR ");

    const whereClause = encodeURIComponent(
      `(${whereCondiciones}) AND ciudad='${ciudad}'`
    );

    const url = `${BASE_URL}?$where=${whereClause}&$limit=5000`;

    console.log(`[SECOP II] Buscando municipio="${municipio}" localidad="${localidad}" (ciudad: ${ciudad})...`);
    console.log(`[SECOP II] URL: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[SECOP II] ${data.length} contratos encontrados`);
    return data;
  } catch (error) {
    console.error("[SECOP II] Error:", error);
    throw error;
  }
};

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