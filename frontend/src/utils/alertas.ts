// ─── Tipos de Alertas ───────────────────────────────────────────────────────
export interface Alerta {
  id: string;
  tipo: "MONOPOLIO" | "SOBRECOSTO" | "ATRASO" | "DISCREPANCIA" | "RIESGO";
  severidad: "CRÍTICO" | "ALTO" | "MEDIO" | "BAJO";
  título: string;
  descripción: string;
  contratista?: string;
  contrato?: string;
  valor?: number;
  timestamp: number;
}

// ─── Contrato (importado) ───────────────────────────────────────────────────
interface Contrato {
  contrato: string;
  contratista: string;
  tipoId: string;
  fechaInicial: string;
  fechaTermInicial: string;
  valorInicial: number;
  valorFinal: number;
  fechaTermFinal: string;
  estado: string;
  variacion: number;
  pctVariacion: number;
  duracionDias: number;
}

// ─── Generador de IDs ───────────────────────────────────────────────────────
const generarId = () => `alerta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ─── 1. DETECTAR MONOPOLIOS ─────────────────────────────────────────────────
export const detectarMonopolios = (contratos: Contrato[]): Alerta[] => {
  const alertas: Alerta[] = [];
  const porContratista: Record<string, Contrato[]> = {};

  // Agrupar por contratista
  for (const c of contratos) {
    if (!porContratista[c.contratista]) {
      porContratista[c.contratista] = [];
    }
    porContratista[c.contratista].push(c);
  }

  // Detectar: contratista con +5 contratos
  for (const [contratista, contrs] of Object.entries(porContratista)) {
    if (contrs.length >= 5) {
      const valorTotal = contrs.reduce((s, c) => s + c.valorFinal, 0);
      const porcentaje = (contrs.length / contratos.length) * 100;
      
      alertas.push({
        id: generarId(),
        tipo: "MONOPOLIO",
        severidad: porcentaje > 20 ? "CRÍTICO" : porcentaje > 10 ? "ALTO" : "MEDIO",
        título: `⚠️ ${contratista} domina ${contrs.length} contratos`,
        descripción: `${contratista} gana ${porcentaje.toFixed(1)}% de todos los contratos (${contrs.length}/${contratos.length}). Valor acumulado: $${valorTotal.toLocaleString("es-CO")}. Analizar patrón de adjudicación.`,
        contratista,
        valor: valorTotal,
        timestamp: Date.now(),
      });
    }
  }

  return alertas;
};

// ─── 2. DETECTAR SOBRECOSTOS EXTREMOS ───────────────────────────────────────
export const detectarSobrecostos = (contratos: Contrato[]): Alerta[] => {
  const alertas: Alerta[] = [];

  for (const c of contratos) {
    // Sobrecosto > 30% es muy sospechoso
    if (c.pctVariacion > 30) {
      alertas.push({
        id: generarId(),
        tipo: "SOBRECOSTO",
        severidad: c.pctVariacion > 50 ? "CRÍTICO" : "ALTO",
        título: `💰 Contrato ${c.contrato} aumentó ${c.pctVariacion.toFixed(1)}%`,
        descripción: `Valor inicial: $${c.valorInicial.toLocaleString("es-CO")}. Valor final: $${c.valorFinal.toLocaleString("es-CO")}. Adición: $${c.variacion.toLocaleString("es-CO")}. Verificar justificación de cambios.`,
        contrato: c.contrato,
        contratista: c.contratista,
        valor: c.variacion,
        timestamp: Date.now(),
      });
    }
  }

  return alertas;
};

// ─── 3. DETECTAR ATRASOS ────────────────────────────────────────────────────
export const detectarAtrasos = (contratos: Contrato[]): Alerta[] => {
  const alertas: Alerta[] = [];
  const hoy = new Date();

  for (const c of contratos) {
    if (c.estado.toUpperCase() === "EN EJECUCIÓN" || c.estado.toUpperCase() === "EN EJECUCION") {
      if (c.fechaTermFinal) {
        const fechaTermino = new Date(c.fechaTermFinal.split("/").reverse().join("-"));
        const diasAtraso = Math.floor((hoy.getTime() - fechaTermino.getTime()) / (1000 * 60 * 60 * 24));

        if (diasAtraso > 0) {
          alertas.push({
            id: generarId(),
            tipo: "ATRASO",
            severidad: diasAtraso > 180 ? "CRÍTICO" : diasAtraso > 90 ? "ALTO" : "MEDIO",
            título: `⏰ Contrato ${c.contrato} atrasado ${diasAtraso} días`,
            descripción: `Fecha de término: ${c.fechaTermFinal}. Hoy es ${hoy.toLocaleDateString("es-CO")}. Atraso: ${diasAtraso} días. Contactar contratista para acelerar entrega.`,
            contrato: c.contrato,
            contratista: c.contratista,
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  return alertas;
};

// ─── 4. DETECTAR ADICIONES SOSPECHOSAS ────────────────────────────────────
export const detectarAdiciones = (contratos: Contrato[]): Alerta[] => {
  const alertas: Alerta[] = [];

  for (const c of contratos) {
    // Adición entre 15% y 30% es sospechosa pero no crítica
    if (c.pctVariacion > 15 && c.pctVariacion <= 30) {
      alertas.push({
        id: generarId(),
        tipo: "RIESGO",
        severidad: "MEDIO",
        título: `🔍 Contrato ${c.contrato} con adición ${c.pctVariacion.toFixed(1)}%`,
        descripción: `Adición moderada detectada. Valor adicional: $${c.variacion.toLocaleString("es-CO")}. Revisar documentación de cambios y justificaciones.`,
        contrato: c.contrato,
        contratista: c.contratista,
        valor: c.variacion,
        timestamp: Date.now(),
      });
    }
  }

  return alertas;
};

// ─── 5. DETECTOR GENERAL (COMBINA TODOS) ─────────────────────────────────
export const generarTotdasAlertas = (contratos: Contrato[]): Alerta[] => {
  const alertas = [
    ...detectarMonopolios(contratos),
    ...detectarSobrecostos(contratos),
    ...detectarAtrasos(contratos),
    ...detectarAdiciones(contratos),
  ];

  // Ordenar por severidad
  const severidadOrden = { CRÍTICO: 0, ALTO: 1, MEDIO: 2, BAJO: 3 };
  return alertas.sort((a, b) => severidadOrden[a.severidad] - severidadOrden[b.severidad]);
};

// ─── 6. FILTRAR ALERTAS POR SEVERIDAD ────────────────────────────────────
export const filtrarAlertas = (alertas: Alerta[], severidad: "CRÍTICO" | "ALTO" | "MEDIO" | "BAJO"): Alerta[] => {
  return alertas.filter(a => a.severidad === severidad);
};
