// Integracion con Politiko (Claude IA via Cloudflare Worker)
const WORKER_URL = "https://politiko-proxy.richbello.workers.dev/api/chat";
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = "Eres Politiko, asistente experto en analisis de contratacion publica y control politico en Colombia. Analizas contratos de alcaldias locales para detectar riesgos, irregularidades y patrones sospechosos. Respondes de forma concisa, directa y accionable, enfocado en lo que un Edil necesita saber para ejercer control politico efectivo.";

export const consultarPolitiko = async (pregunta: string, contexto?: string): Promise<string> => {
  try {
    const mensaje = contexto ? contexto + "\n\n" + pregunta : pregunta;
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: mensaje }],
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("[Politiko] HTTP error:", response.status, errText);
      throw new Error("HTTP " + response.status);
    }
    const data = await response.json();
    if (data.content && Array.isArray(data.content)) {
      return data.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
    }
    return data.text || data.response || "Sin respuesta de la IA";
  } catch (error) {
    console.error("[Politiko IA] Error:", error);
    return "Error conectando con IA. Verifica el Worker.";
  }
};

export const analizarContratista = async (contratista: string, totalContratos: number, valorTotal: number, porcentajeMercado: number): Promise<string> => {
  const contexto = "ANALISIS DE CONTRATISTA:\n- Nombre: " + contratista + "\n- Total contratos: " + totalContratos + "\n- Valor acumulado: $" + valorTotal.toLocaleString("es-CO") + "\n- Porcentaje del mercado: " + porcentajeMercado.toFixed(1) + "%";
  return consultarPolitiko("Cuales son los principales riesgos de favoritismo, monopolio o irregularidad que detectas? Que deberia investigar el Edil?", contexto);
};

export const analizarAlertas = async (alertasResumen: string): Promise<string> => {
  const contexto = "ALERTAS DETECTADAS EN CONTRATOS DE LA ALCALDIA LOCAL:\n\n" + alertasResumen;
  return consultarPolitiko("Como auditor de control politico, dame los 3 hallazgos mas criticos y un plan de accion inmediato y concreto para el Edil. Se especifico y directo.", contexto);
};
