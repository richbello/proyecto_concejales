import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, TrendingDown, Users, DollarSign, AlertTriangle, FileWarning, BarChart3, X } from 'lucide-react';

interface DataRow { [key: string]: string | number; }

interface Mensaje {
  id: string;
  rol: 'user' | 'assistant';
  texto: string;
  timestamp: string;
  cargando?: boolean;
}

const toNum = (v: any) => {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const gc = (row: DataRow, variants: string[]): any => {
  for (const k of variants) if (row[k] !== undefined && row[k] !== '') return row[k];
  return '';
};

const fmtCOP = (v: number) => {
  if (v >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v/1e3).toFixed(0) + 'K';
  return '$' + v.toLocaleString('es-CO');
};

const COLS = {
  valorCRP:     ['Valor CRP'],
  valorNeto:    ['Valor Neto'],
  giro:         ['Autorizacion giro', 'Autorización giro'],
  anulaciones:  ['Anulaciones'],
  ejecucion:    ['EJECUCION %', 'Ejecucion %', 'EJECUCIÓN %'],
  tipo:         ['Tipo de compromiso', 'Tipo de Compromiso'],
  modalidad:    ['Descripcion Mod. Selec', 'Descripción Mod. Selec'],
  beneficiario: ['Nombre BP Beneficiario', 'Nombre Beneficiario'],
  rubro:        ['Descripción del Rubro', 'Descripcion del Rubro'],
  noComp:       ['No. Compromiso', 'No.Compromiso'],
};

// Genera resumen del CRP para enviar a la IA
const generarContexto = (data: DataRow[]): string => {
  if (!data || data.length === 0) return 'No hay datos cargados.';

  const totalCRP    = data.reduce((s,r) => s + toNum(gc(r,COLS.valorCRP)), 0);
  const totalNeto   = data.reduce((s,r) => s + toNum(gc(r,COLS.valorNeto)), 0);
  const totalGiro   = data.reduce((s,r) => s + toNum(gc(r,COLS.giro)), 0);
  const totalAnul   = data.reduce((s,r) => s + toNum(gc(r,COLS.anulaciones)), 0);
  const pctEjec     = totalCRP > 0 ? (totalGiro/totalCRP)*100 : 0;

  // Top beneficiarios
  const benMap: Record<string,number> = {};
  data.forEach(r => {
    const b = String(gc(r,COLS.beneficiario)||'');
    if (b) benMap[b] = (benMap[b]||0) + toNum(gc(r,COLS.valorNeto));
  });
  const topBen = Object.entries(benMap).sort((a,b)=>b[1]-a[1]).slice(0,10);

  // Por modalidad
  const modalMap: Record<string,number> = {};
  data.forEach(r => {
    const m = String(gc(r,COLS.modalidad)||'Sin clasificar');
    modalMap[m] = (modalMap[m]||0) + 1;
  });

  // Por rubro
  const rubroMap: Record<string,{valor:number,ejec:number,cnt:number}> = {};
  data.forEach(r => {
    const k = String(gc(r,COLS.rubro)||'Sin clasificar');
    if (!rubroMap[k]) rubroMap[k] = {valor:0,ejec:0,cnt:0};
    rubroMap[k].valor += toNum(gc(r,COLS.valorNeto));
    rubroMap[k].ejec  += toNum(gc(r,COLS.ejecucion));
    rubroMap[k].cnt   += 1;
  });
  const topRubros = Object.entries(rubroMap).sort((a,b)=>b[1].valor-a[1].valor).slice(0,8);

  // Contratistas repetidos
  const repMap: Record<string,number> = {};
  data.forEach(r => {
    const b = String(gc(r,COLS.beneficiario)||'');
    if (b) repMap[b] = (repMap[b]||0) + 1;
  });
  const repetidos = Object.entries(repMap).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Sin ejecución
  const sinEjec = data.filter(r => toNum(gc(r,COLS.ejecucion)) === 0 && toNum(gc(r,COLS.valorCRP)) > 0);
  const totalSinEjec = sinEjec.reduce((s,r) => s+toNum(gc(r,COLS.valorCRP)), 0);

  return `
DATOS DEL REPORTE CRP - LOCALIDAD DE USME 2026
Total registros: ${data.length}

RESUMEN FINANCIERO:
- Valor CRP Total: ${fmtCOP(totalCRP)}
- Valor Neto: ${fmtCOP(totalNeto)}
- Total Girado: ${fmtCOP(totalGiro)}
- Anulaciones: ${fmtCOP(totalAnul)}
- Porcentaje de ejecución: ${pctEjec.toFixed(2)}%

CONTRATOS SIN EJECUCIÓN (0%):
- Cantidad: ${sinEjec.length} contratos
- Valor total sin ejecutar: ${fmtCOP(totalSinEjec)}

TOP 10 BENEFICIARIOS POR VALOR:
${topBen.map(([n,v],i) => `${i+1}. ${n}: ${fmtCOP(v)}`).join('\n')}

CONTRATISTAS CON 3 O MÁS CONTRATOS:
${repetidos.length > 0 ? repetidos.map(([n,c]) => `- ${n}: ${c} contratos`).join('\n') : 'Ninguno detectado'}

MODALIDADES DE CONTRATACIÓN:
${Object.entries(modalMap).sort((a,b)=>b[1]-a[1]).map(([m,c]) => `- ${m}: ${c} contratos (${((c/data.length)*100).toFixed(1)}%)`).join('\n')}

TOP RUBROS PRESUPUESTALES:
${topRubros.map(([n,d]) => `- ${n}: ${fmtCOP(d.valor)} (ejec: ${((d.ejec/d.cnt)*100).toFixed(1)}%)`).join('\n')}
`.trim();
};

const PREGUNTAS_SUGERIDAS = [
  { texto: "¿Cuáles son los contratos más sospechosos?", icono: <AlertTriangle className="w-3.5 h-3.5"/> },
  { texto: "¿Qué contratistas tienen más contratos?", icono: <Users className="w-3.5 h-3.5"/> },
  { texto: "¿Qué rubros tienen menor ejecución?", icono: <TrendingDown className="w-3.5 h-3.5"/> },
  { texto: "¿Cuánto dinero no se ha ejecutado?", icono: <DollarSign className="w-3.5 h-3.5"/> },
  { texto: "¿Hay indicios de fraccionamiento de contratos?", icono: <FileWarning className="w-3.5 h-3.5"/> },
  { texto: "Dame un resumen ejecutivo del presupuesto", icono: <BarChart3 className="w-3.5 h-3.5"/> },
  { texto: "¿Qué preguntas puedo hacer en el debate?", icono: <Sparkles className="w-3.5 h-3.5"/> },
  { texto: "¿Cuáles son las anomalías más graves?", icono: <AlertTriangle className="w-3.5 h-3.5"/> },
];

interface Props {
  data: DataRow[];
}

export default function Politiko({ data }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: '0',
      rol: 'assistant',
      texto: `¡Hola! Soy **Politiko**, tu asistente de inteligencia presupuestal. 🏛️\n\n${data.length > 0 ? `He analizado **${data.length} registros** del reporte CRP. Puedo ayudarte a entender el presupuesto, detectar irregularidades y preparar preguntas para tus debates de control político.\n\n¿Qué quieres saber?` : 'Para comenzar, carga un reporte Excel CRP en la pestaña **Análisis Presupuestal**. Una vez cargado, podré responder preguntas sobre los datos.'}`,
      timestamp: new Date().toLocaleTimeString('es-CO'),
    }
  ]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const enviarMensaje = useCallback(async (texto: string) => {
    if (!texto.trim() || cargando) return;

    const userMsg: Mensaje = {
      id: Date.now().toString(),
      rol: 'user',
      texto: texto.trim(),
      timestamp: new Date().toLocaleTimeString('es-CO'),
    };

    const loadingMsg: Mensaje = {
      id: Date.now().toString() + '_load',
      rol: 'assistant',
      texto: '',
      timestamp: '',
      cargando: true,
    };

    setMensajes(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setCargando(true);

    try {
      const contexto = generarContexto(data);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `Eres Politiko, un asistente experto en control político y análisis presupuestal para concejales municipales de Colombia. 
          
Tu misión es ayudar a los concejales a entender el presupuesto local, detectar irregularidades y preparar debates de control político efectivos.

Responde siempre en español, de forma clara y directa. Usa emojis ocasionalmente para hacer la respuesta más visual. Cuando detectes posibles irregularidades, sé específico con nombres y cifras. Sugiere preguntas concretas que el concejal puede hacer en el Concejo Municipal.

CONTEXTO DEL REPORTE CRP ACTUAL:
${contexto}

Responde basándote en estos datos reales. Si el usuario pregunta algo que no está en los datos, indícalo claramente.`,
          messages: [
            ...mensajes.filter(m => !m.cargando).map(m => ({
              role: m.rol === 'user' ? 'user' : 'assistant',
              content: m.texto
            })),
            { role: 'user', content: texto.trim() }
          ]
        })
      });

      const result = await response.json();
      const respuesta = result.content?.[0]?.text || 'No pude procesar tu consulta. Intenta de nuevo.';

      setMensajes(prev => prev.map(m =>
        m.cargando ? { ...m, cargando: false, texto: respuesta, timestamp: new Date().toLocaleTimeString('es-CO') } : m
      ));
    } catch (error) {
      setMensajes(prev => prev.map(m =>
        m.cargando ? { ...m, cargando: false, texto: '⚠️ Error al conectar con el asistente. Verifica tu conexión e intenta de nuevo.', timestamp: new Date().toLocaleTimeString('es-CO') } : m
      ));
    } finally {
      setCargando(false);
    }
  }, [data, mensajes, cargando]);

  const renderTexto = (texto: string) => {
    return texto.split('\n').map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="mb-1 last:mb-0" dangerouslySetInnerHTML={{ __html: bold }} />;
    });
  };

  return (
    <>
      {/* BOTÓN FLOTANTE */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-blue-900 to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
          title="Abrir Politiko — Asistente IA">
          <div className="relative">
            <Bot className="w-7 h-7" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"/>
          </div>
        </button>
      )}

      {/* CHAT PANEL */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">

          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  Politiko <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                </div>
                <div className="text-blue-200 text-xs flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full inline-block"/>
                  Asistente de Control Político IA
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MENSAJES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {mensajes.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${m.rol === 'user' ? 'bg-blue-600' : 'bg-gradient-to-br from-blue-900 to-blue-600'}`}>
                  {m.rol === 'user' ? <User className="w-4 h-4"/> : <Bot className="w-4 h-4"/>}
                </div>
                {/* Burbuja */}
                <div className={`max-w-72 ${m.rol === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.rol === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-sm'
                  }`}>
                    {m.cargando ? (
                      <div className="flex items-center gap-1.5 py-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                      </div>
                    ) : (
                      <div className="leading-relaxed">{renderTexto(m.texto)}</div>
                    )}
                  </div>
                  {m.timestamp && !m.cargando && (
                    <span className="text-xs text-slate-400 mt-1 px-1">{m.timestamp}</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* PREGUNTAS SUGERIDAS */}
          {mensajes.length <= 2 && data.length > 0 && (
            <div className="px-3 py-2 bg-white border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-2 font-semibold">Preguntas frecuentes:</p>
              <div className="flex flex-wrap gap-1.5">
                {PREGUNTAS_SUGERIDAS.slice(0,4).map((p,i) => (
                  <button key={i} onClick={() => enviarMensaje(p.texto)}
                    className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 transition-colors">
                    {p.icono}{p.texto}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SUGERENCIAS ADICIONALES si hay más de 2 mensajes */}
          {mensajes.length > 2 && !cargando && (
            <div className="px-3 py-2 bg-white border-t border-slate-100">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {PREGUNTAS_SUGERIDAS.slice(4).map((p,i) => (
                  <button key={i} onClick={() => enviarMensaje(p.texto)}
                    className="flex-shrink-0 flex items-center gap-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 transition-colors">
                    {p.icono}{p.texto}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INPUT */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensaje(input)}
                placeholder={data.length > 0 ? "Pregunta sobre el presupuesto..." : "Carga un Excel primero..."}
                disabled={cargando || data.length === 0}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button onClick={() => enviarMensaje(input)}
                disabled={cargando || !input.trim() || data.length === 0}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 text-white rounded-xl w-10 h-10 flex items-center justify-center transition-colors flex-shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 text-center">Politiko · IA para Control Político · XBOG Technologies</p>
          </div>
        </div>
      )}
    </>
  );
}