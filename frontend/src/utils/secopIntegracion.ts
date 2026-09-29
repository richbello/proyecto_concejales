// ══════════════════════════════════════════════════════════════════════════════
// Integración con SECOP II (datos.gov.co) - Dataset jbjy-vk9h
// Soporta: Bogotá (20 localidades) + municipios (Soacha, Mosquera, Funza, etc)
// ══════════════════════════════════════════════════════════════════════════════

const DATASET_ID = "jbjy-vk9h";
const BASE_URL = `https://www.datos.gov.co/resource/${DATASET_ID}.json`;

// Configuración por municipio y sus palabras clave en SECOP II
interface MunicipioConfig {
  nombre: string;
  ciudad: string;
  keywords: string[];
}

const MUNICIPIOS_SECOP: Record<string, MunicipioConfig> = {
  "Usaquén": { nombre: "Usaquén", ciudad: "Bogotá", keywords: ["USAQUEN", "ALCALDIA LOCAL"] },
  "Chapinero": { nombre: "Chapinero", ciudad: "Bogotá", keywords: ["CHAPINERO", "ALCALDIA LOCAL"] },
  "Santa Fe": { nombre: "Santa Fe", ciudad: "Bogotá", keywords: ["SANTA FE", "ALCALDIA LOCAL"] },
  "San Cristóbal": { nombre: "San Cristóbal", ciudad: "Bogotá", keywords: ["SAN CRISTOBAL", "ALCALDIA LOCAL"] },
  "Usme": { nombre: "Usme", ciudad: "Bogotá", keywords: ["USME", "ALCALDIA LOCAL"] },
  "Tunjuelito": { nombre: "Tunjuelito", ciudad: "Bogotá", keywords: ["TUNJUELITO", "ALCALDIA LOCAL"] },
  "Bosa": { nombre: "Bosa", ciudad: "Bogotá", keywords: ["BOSA", "ALCALDIA LOCAL"] },
  "Kennedy": { nombre: "Kennedy", ciudad: "Bogotá", keywords: ["KENNEDY", "ALCALDIA LOCAL"] },
  "Fontibón": { nombre: "Fontibón", ciudad: "Bogotá", keywords: ["FONTIBON", "ALCALDIA LOCAL"] },
  "Engativá": { nombre: "Engativá", ciudad: "Bogotá", keywords: ["ENGATIV", "ALCALDIA LOCAL"] },
  "Suba": { nombre: "Suba", ciudad: "Bogotá", keywords: ["SUBA", "ALCALDIA LOCAL"] },
  "Barrios Unidos": { nombre: "Barrios Unidos", ciudad: "Bogotá", keywords: ["BARRIOS UNIDOS", "ALCALDIA LOCAL"] },
  "Teusaquillo": { nombre: "Teusaquillo", ciudad: "Bogotá", keywords: ["TEUSAQUILLO", "ALCALDIA LOCAL"] },
  "Los Mártires": { nombre: "Los Mártires", ciudad: "Bogotá", keywords: ["MARTIRES", "ALCALDIA LOCAL"] },
  "Antonio Nariño": { nombre: "Antonio Nariño", ciudad: "Bogotá", keywords: ["ANTONIO NARI", "ALCALDIA LOCAL"] },
  "Puente Aranda": { nombre: "Puente Aranda", ciudad: "Bogotá", keywords: ["PUENTE ARANDA", "ALCALDIA LOCAL"] },
  "La Candelaria": { nombre: "La Candelaria", ciudad: "Bogotá", keywords: ["CANDELARIA", "ALCALDIA LOCAL"] },
  "Rafael Uribe": { nombre: "Rafael Uribe", ciudad: "Bogotá", keywords: ["RAFAEL URIBE", "ALCALDIA LOCAL"] },
  "Ciudad Bolívar": { nombre: "Ciudad Bolívar", ciudad: "Bogotá", keywords: ["CIUDAD BOLIVAR", "ALCALDIA LOCAL"] },
  "Sumapaz": { nombre: "Sumapaz", ciudad: "Bogotá", keywords: ["SUMAPAZ", "ALCALDIA LOCAL"] },
  
  "Soacha": { nombre: "Soacha", ciudad: "Soacha", keywords: ["MUNICIPIO DE SOACHA", "SOACHA"] },
  "Mosquera": { nombre: "Mosquera", ciudad: "Mosquera", keywords: ["MUNICIPIO DE MOSQUERA", "MOSQUERA"] },
  "Funza": { nombre: "Funza", ciudad: "Funza", keywords: ["MUNICIPIO DE FUNZA", "FUNZA"] },
  "Tocancipá": { nombre: "Tocancipá", ciudad: "Tocancipá", keywords: ["MUNICIPIO DE TOCANCIPA", "TOCANCIPA"] },
  "Zipaquirá": { nombre: "Zipaquirá", ciudad: "Zipaquirá", keywords: ["MUNICIPIO DE ZIPAQUIRA", "ZIPAQUIRA"] },
};

export const cargarSecopII = async (localidad: string): Promise<any[]> => {
  try {
    const config = MUNICIPIOS_SECOP[localidad];
    if (!config) {
      throw new Error(`Localidad/Municipio "${localidad}" no configurado`);
    }

    const whereCondiciones = config.keywords
      .map(kw => `upper(nombre_entidad) like '%${kw}%'`)
      .join(" OR ");

    const whereClause = encodeURIComponent(
      `(${whereCondiciones}) AND ciudad='${config.ciudad}'`
    );

    const url = `${BASE_URL}?$where=${whereClause}&$limit=5000`;

    console.log(`[SECOP II] Buscando "${localidad}" (ciudad: ${config.ciudad})...`);
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

export const obtenerMunicipios = (): string[] => {
  return Object.keys(MUNICIPIOS_SECOP).sort((a, b) => {
    const configA = MUNICIPIOS_SECOP[a];
    const configB = MUNICIPIOS_SECOP[b];
    if (configA.ciudad === "Bogotá" && configB.ciudad !== "Bogotá") return -1;
    if (configA.ciudad !== "Bogotá" && configB.ciudad === "Bogotá") return 1;
    return a.localeCompare(b);
  });
};

export const obtenerLocalidades = (municipio?: string): string[] => {
  if (!municipio) {
    return Object.keys(MUNICIPIOS_SECOP);
  }
  return MUNICIPIOS_SECOP[municipio] ? [municipio] : [];
};