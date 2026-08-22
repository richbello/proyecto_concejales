// ─── Integración con Politiko (Claude IA vía Cloudflare Worker) ──────────

export interface MensajeIA {
  role: "user" | "assistant";
  content: string;
}

// ─── Función para llamar a Politiko ───────────────────────────────────────
export const consultarPolitiko = async (pregunta: string, contexto?: string): Promise<string> => {
  try {
    const mensaje = contexto ? `${contexto}\n\nPregunta: ${pregunta}` : pregunta;

    const response = await fetch("https://politiko-proxy.richbello.workers.dev/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: mensaje,
        system: "Eres Politiko, asistente especializado en análisis de contratos y auditoría de administración pública colombiana. Responde de forma concisa y directa, enfocado en riesgos políticos y administrativos.",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.text || "Sin respuesta";
  } catch (error) {
    console.error("[Politiko IA] Error:", error);
    return "Error conectando con IA. Intenta de nuevo.";
  }
};

// ─── Análisis de Contratista ──────────────────────────────────────────────
export const analizarContratista = async (
  contratista: string,
  totalContratos: number,
  valorTotal: number,
  porcentajeMercado: number
): Promise<string> => {
  const contexto = `
ANÁLISIS DE CONTRATISTA:
- Nombre: ${contratista}
- Total de contratos: ${totalContratos}
- Valor acumulado: $${valorTotal.toLocaleString("es-CO")}
- Porcentaje del mercado: ${porcentajeMercado.toFixed(1)}%

Pregunta: ¿Cuáles son los principales riesgos de favoritismo o monopolio que detectas en este patrón? Sé específico.
  `;

  return consultarPolitiko("", contexto);
};

// ─── Análisis de Sobrecosto ───────────────────────────────────────────────
export const analizarSobrecosto = async (
  contrato: string,
  contratista: string,
  valorInicial: number,
  valorFinal: number,
  pctAumento: number
): Promise<string> => {
  const contexto = `
ANÁLISIS DE SOBRECOSTO:
- Contrato: ${contrato}
- Contratista: ${contratista}
- Valor inicial: $${valorInicial.toLocaleString("es-CO")}
- Valor final: $${valorFinal.toLocaleString("es-CO")}
- Aumento: ${pctAumento.toFixed(1)}%

Pregunta: ¿Qué indica este nivel de adición? ¿Es normal o sospechoso? ¿Cuáles son las preguntas que debería hacer el Edil?
  `;

  return consultarPolitiko("", contexto);
};

// ─── Análisis de Atraso ───────────────────────────────────────────────────
export const analizarAtraso = async (
  contrato: string,
  contratista: string,
  diasAtraso: number,
  estado: string
): Promise<string> => {
  const contexto = `
ANÁLISIS DE ATRASO:
- Contrato: ${contrato}
- Contratista: ${contratista}
- Días de atraso: ${diasAtraso}
- Estado actual: ${estado}

Pregunta: ¿Qué riesgos administrativos y políticos implica este atraso? ¿Qué acciones debería tomar el Edil?
  `;

  return consultarPolitiko("", contexto);
};

// ─── Pregunta General sobre Alertas ────────────────────────────────────────
export const analizarAlertas = async (alertasResumen: string): Promise<string> => {
  const contexto = `
RESUMEN DE ALERTAS DETECTADAS EN CONTRATOS:

${alertasResumen}

Pregunta: Como auditor político, ¿cuáles son los 3 hallazgos más críticos? ¿Cuál debería ser el plan de acción inmediato del Edil?
  `;

  return consultarPolitiko("", contexto);
};
