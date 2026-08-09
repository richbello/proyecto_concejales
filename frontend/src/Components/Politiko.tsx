import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, X } from 'lucide-react';

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

const generarContextoContratos = (c: any): string => {
  if (!c) return "";
  const top3 = c.topContratistas.slice(0,3).map((t:any)=>`${t.nombre} ($${(t.valor/1e6).toFixed(0)}M, ${t.count} contratos)`).join(", ");
  return `\n\nDATOS DE CONTRATACIÓN ACTUAL:\n- Total contratos: ${c.totalContratos} | Valor final: $${(c.valorFinalTotal/1e9).toFixed(2)}B | Sobrecostos: ${c.contratosSobrecosto} contratos (${c.pctVariacionGlobal.toFixed(1)}% variación global)\n- Estados: ${c.porEstado.map((e:any)=>`${e.estado} (${e.count})`).join(", ")}\n- Top contratistas por valor: ${top3}`;
};

const generarContextoPAC = (p: any): string => {
  if (!p) return "";
  const c = p.consolidado;
  return `\n\nDATOS DE ALERTAS PAC FDL (mes actual: ${p.mesActual}):\n- PAC Actual: $${(c.pacActual/1e9).toFixed(2)}B | Girado: $${(c.girado/1e9).toFixed(2)}B (${(c.ejecutado*100).toFixed(1)}%) | Disponible: $${(c.disponibilidad/1e9).toFixed(2)}B\n- Rezago: ${p.rezago ? "$"+(p.rezago.pacActual/1e9).toFixed(2)+"B" : "sin datos"}`;
};

const generarContextoMapa = (m: any[]): string => {
  if (!m || m.length === 0) return "";
  const total = m.length;
  const enEjecucion = m.filter((p:any) => p.estado.includes("EJECUCION")).length;
  const enRetraso = m.filter((p:any) => p.estado.includes("RETRASO")).length;
  const finalizados = m.filter((p:any) => p.estado.includes("FINALIZADO")).length;
  const top3 = [...m].sort((a:any,b:any)=>b.presupuesto-a.presupuesto).slice(0,3).map((p:any)=>`${p.nombre} (${p.localidad}, ${p.avance}% avance, $${(p.presupuesto/1e6).toFixed(0)}M)`).join("; ");
  return `\n\nDATOS MAPA DE PROYECTOS:\n- Total: ${total} proyectos | En ejecucion: ${enEjecucion} | En retraso: ${enRetraso} | Finalizados: ${finalizados}\n- Top 3 por presupuesto: ${top3}`;
};

const generarContextoPlan = (plan: any): string => {
  if (!plan) return "";
  const { sectores, proyectos, totals } = plan;
  const top3 = [...proyectos].filter((p:any)=>p.compromisos>0).sort((a:any,b:any)=>b.compromisos-a.compromisos).slice(0,3).map((p:any)=>`${p.nombre} (${(p.pctComp*100).toFixed(1)}% compromisos)`).join(", ");
  const sinEj = proyectos.filter((p:any)=>p.apropiaciones===0).length;
  return `\n\nDATOS PDL PLANEACIÓN 2026:\n- POAI: $${(totals.poai/1e9).toFixed(1)}B | Apropiaciones: $${(totals.apropiaciones/1e9).toFixed(1)}B | Compromisos: $${(totals.compromisos/1e9).toFixed(1)}B (${(totals.compromisos/totals.apropiaciones*100).toFixed(1)}%) | Giros: $${(totals.giros/1e9).toFixed(1)}B (${(totals.giros/totals.apropiaciones*100).toFixed(1)}%)\n- Proyectos: ${proyectos.length} total, ${sinEj} sin ejecución\n- Sectores: ${sectores.map((s:any)=>`${s.nombre.split(",")[0]} ${(s.pctComp*100).toFixed(0)}%`).join(", ")}\n- Top compromisos: ${top3}`;
};
const generarContexto = (data: DataRow[]): string => {
  if (!data || data.length === 0) return 'No hay datos cargados.';
  const totalCRP  = data.reduce((s,r) => s + toNum(gc(r,COLS.valorCRP)), 0);
  const totalNeto = data.reduce((s,r) => s + toNum(gc(r,COLS.valorNeto)), 0);
  const totalGiro = data.reduce((s,r) => s + toNum(gc(r,COLS.giro)), 0);
  const totalAnul = data.reduce((s,r) => s + toNum(gc(r,COLS.anulaciones)), 0);
  const pctEjec   = totalCRP > 0 ? (totalGiro/totalCRP)*100 : 0;

  const benMap: Record<string,number> = {};
  data.forEach(r => {
    const b = String(gc(r,COLS.beneficiario)||'');
    if (b) benMap[b] = (benMap[b]||0) + toNum(gc(r,COLS.valorNeto));
  });
  const topBen = Object.entries(benMap).sort((a,b)=>b[1]-a[1]).slice(0,10);

  const modalMap: Record<string,number> = {};
  data.forEach(r => {
    const m = String(gc(r,COLS.modalidad)||'Sin clasificar');
    modalMap[m] = (modalMap[m]||0) + 1;
  });

  const rubroMap: Record<string,{valor:number,ejec:number,cnt:number}> = {};
  data.forEach(r => {
    const k = String(gc(r,COLS.rubro)||'Sin clasificar');
    if (!rubroMap[k]) rubroMap[k] = {valor:0,ejec:0,cnt:0};
    rubroMap[k].valor += toNum(gc(r,COLS.valorNeto));
    rubroMap[k].ejec  += toNum(gc(r,COLS.ejecucion));
    rubroMap[k].cnt   += 1;
  });
  const topRubros = Object.entries(rubroMap).sort((a,b)=>b[1].valor-a[1].valor).slice(0,8);

  const repMap: Record<string,number> = {};
  data.forEach(r => {
    const b = String(gc(r,COLS.beneficiario)||'');
    if (b) repMap[b] = (repMap[b]||0) + 1;
  });
  const repetidos = Object.entries(repMap).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const sinEjec = data.filter(r => toNum(gc(r,COLS.ejecucion))===0 && toNum(gc(r,COLS.valorCRP))>0);
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

const PREGUNTAS = [
  { texto:"¿Cuáles son los contratos más sospechosos?",      icono:"⚠️" },
  { texto:"¿Qué contratistas tienen más contratos?",         icono:"👥" },
  { texto:"¿Qué rubros tienen menor ejecución?",             icono:"📉" },
  { texto:"¿Cuánto dinero no se ha ejecutado?",              icono:"💰" },
  { texto:"¿Hay indicios de fraccionamiento de contratos?",  icono:"🔍" },
  { texto:"Dame un resumen ejecutivo del presupuesto",       icono:"📊" },
  { texto:"¿Qué preguntas puedo hacer en el debate?",        icono:"✨" },
  { texto:"¿Cuáles son las anomalías más graves?",           icono:"🚨" },
];

interface Props { data: DataRow[]; planData?: any; contratosData?: any; pacData?: any; mapaData?: any[]; }

export default function Politiko({ data, planData, contratosData, pacData, mapaData }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([{
    id:'0', rol:'assistant', timestamp: new Date().toLocaleTimeString('es-CO'),
    texto: data.length > 0
      ? `¡Hola! Soy **Politiko**, tu asistente de control político integral. 🏛️\n\nHe analizado **${data.length} registros** del reporte CRP. Pregúntame sobre presupuesto, contratación, anomalías, mapa de proyectos o cualquier otro tema de control político.\n\n¿Qué quieres saber?`
      : `¡Hola! Soy **Politiko** 🏛️\n\nPuedo ayudarte con presupuesto, contratación SECOP II, anomalías, mapa de proyectos, agenda legislativa y más.\n\nCarga un reporte Excel CRP en **Análisis Presupuestal** para análisis con datos reales, o pregúntame lo que necesites.`
  }]);
  const [input, setInput]       = useState('');
  const [cargando, setCargando] = useState(false);
  const [isOpen, setIsOpen]     = useState(false);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [mensajes]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  // Actualizar mensaje de bienvenida cuando llegan datos
  useEffect(() => {
    if (data.length > 0) {
      setMensajes([{
        id:'0', rol:'assistant', timestamp: new Date().toLocaleTimeString('es-CO'),
        texto: `¡Hola! Soy **Politiko** 🏛️\n\nHe analizado **${data.length} registros** del reporte CRP. Puedo ayudarte a detectar irregularidades y preparar preguntas para tus debates.\n\n¿Qué quieres saber?`,
      }]);
    }
  }, [data.length]);

  const enviar = useCallback(async (texto: string) => {
    if (!texto.trim() || cargando) return;
    const userMsg: Mensaje = {
      id: Date.now().toString(), rol:'user',
      texto: texto.trim(), timestamp: new Date().toLocaleTimeString('es-CO')
    };
    const loadMsg: Mensaje = {
      id: Date.now().toString()+'_l', rol:'assistant',
      texto:'', timestamp:'', cargando:true
    };
    setMensajes(prev => [...prev, userMsg, loadMsg]);
    setInput('');
    setCargando(true);

    try {
      const res = await fetch('https://politiko-proxy.richbello.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1000,
system: `Eres Politiko, asistente experto en control político integral para concejales y ediles municipales de Colombia, parte de la plataforma XBOG CONTROL.

Tu conocimiento cubre TODOS los frentes de control político, no solo presupuesto:

1. **Análisis Presupuestal**: CRP, PAC, ejecución presupuestal, SAP Distrital, FDL.
2. **Contratación pública**: SECOP II, tipos de contratos, modalidades de selección, supervisión, posibles irregularidades contractuales.
3. **Planeación del Desarrollo Local (PDL)**: metas de plan de desarrollo, indicadores, avance físico vs. financiero.
4. **Agenda y Panel Legislativo**: proyectos de acuerdo, sesiones, votaciones, proposiciones.
5. **Mapa de Proyectos**: ubicación territorial de inversiones, ejecución por localidad/barrio.
6. **Alertas y Anomalías**: detección de patrones atípicos en pagos, CRP, contratistas reincidentes.
7. **Denuncias Ciudadanas**: seguimiento a reportes de la comunidad.
8. **Generación de Proposiciones**: redacción de proposiciones y debates de control político.
9. **Ciberseguridad institucional**: buenas prácticas para entidades públicas.

ACLARACIÓN IMPORTANTE SOBRE EL PAC — existen dos conceptos distintos llamados "PAC" en el sector público colombiano, no los confundas:
1) PAC = Programa Anual Mensualizado de Caja: instrumento financiero que define cuánto dinero puede girarse mes a mes contra el presupuesto aprobado (PAC Inicial, PAC Reprogramado, Girado, Disponibilidad, % Ejecución). ESTE es el PAC que analiza el módulo Alertas PAC FDL de esta plataforma con datos reales de SAP.
2) Plan Anual de Contrataciones: listado de los contratos que la entidad planea celebrar en el año (modalidad de selección, cuantía, vigencia), publicado en SECOP II.
Cuando el usuario pregunte "qué es el PAC" sin más contexto, responde primero sobre el Programa Anual Mensualizado de Caja (es el que usa esta plataforma) y aclara brevemente que existe otro concepto homónimo, el Plan Anual de Contrataciones, para evitar confusión.

Si el usuario pregunta sobre un módulo para el cual NO tienes datos cargados en este momento, explícale qué hace ese módulo, cómo usarlo, y qué tipo de preguntas podría resolver — pero aclara que aún no tienes los datos específicos cargados en esta conversación, y sugiérele cargarlos o navegar a ese módulo.

Responde siempre en español, de forma clara y directa. Usa emojis ocasionalmente. Cuando detectes posibles irregularidades, sé específico con nombres y cifras. Sugiere preguntas concretas que el concejal puede hacer en el Concejo Municipal.

CONTEXTO DEL REPORTE CRP ACTUAL:
${generarContexto(data)}${generarContextoPlan(planData)}${generarContextoContratos(contratosData)}${generarContextoPAC(pacData)}${generarContextoMapa(mapaData ?? [])}

Responde basándote en estos datos reales cuando la pregunta sea sobre presupuesto. Para otros temas, usa tu conocimiento general de control político en Colombia.`,
          messages: [
            ...mensajes.filter(m => !m.cargando).map(m => ({
              role: m.rol === 'user' ? 'user' : 'assistant',
              content: m.texto
            })),
            { role: 'user', content: texto.trim() }
          ]
        })
      });

      const result = await res.json();
      const respuesta = result.content?.[0]?.text || 'No pude procesar tu consulta. Intenta de nuevo.';
      setMensajes(prev => prev.map(m =>
        m.cargando ? { ...m, cargando:false, texto:respuesta, timestamp: new Date().toLocaleTimeString('es-CO') } : m
      ));
    } catch {
      setMensajes(prev => prev.map(m =>
        m.cargando ? { ...m, cargando:false, texto:'⚠️ Error de conexión. Intenta de nuevo.', timestamp: new Date().toLocaleTimeString('es-CO') } : m
      ));
    } finally {
      setCargando(false);
    }
  }, [data, mensajes, cargando]);

  const renderTexto = (texto: string) =>
    texto.split('\n').map((line, i) => (
      <p key={i} className="mb-1 last:mb-0"
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}/>
    ));

  const btnFlotante: React.CSSProperties = {
    position:'fixed', bottom:24, right:24, zIndex:9999,
    width:60, height:60, borderRadius:'50%',
    background:'linear-gradient(135deg,#1a2742,#2563eb)',
    color:'white', border:'none', cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
    boxShadow:'0 8px 25px rgba(0,0,0,.35)',
  };

  const panelStyle: React.CSSProperties = {
    position:'fixed', bottom:24, right:24, zIndex:9999,
    width:384, height:600,
    background:'white', borderRadius:16,
    boxShadow:'0 20px 60px rgba(0,0,0,.2)',
    display:'flex', flexDirection:'column', overflow:'hidden',
    border:'1px solid #e2e8f0',
  };

  return (
    <>
      {!isOpen && (
        <button style={btnFlotante} onClick={() => setIsOpen(true)} title="Abrir Politiko — Asistente IA">
          <div style={{position:'relative'}}>
            <Bot size={26}/>
            <span style={{
              position:'absolute', top:-4, right:-4,
              width:10, height:10, background:'#4ade80',
              borderRadius:'50%', border:'2px solid white'
            }}/>
          </div>
        </button>
      )}

      {isOpen && (
        <div style={panelStyle}>
          {/* HEADER */}
          <div style={{background:'linear-gradient(135deg,#1a2742,#1d4ed8)',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Bot size={20} color="white"/>
              </div>
              <div>
                <div style={{fontWeight:700,color:'white',fontSize:14,display:'flex',alignItems:'center',gap:6}}>
                  Politiko <Sparkles size={13} color="#fde68a"/>
                </div>
                <div style={{color:'#93c5fd',fontSize:11,display:'flex',alignItems:'center',gap:4}}>
                  <span style={{width:7,height:7,background:'#4ade80',borderRadius:'50%',display:'inline-block'}}/>
                  Asistente IA · XBOG CONTROL
                  {data.length > 0 && <span style={{background:'rgba(255,255,255,.15)',padding:'1px 6px',borderRadius:10,marginLeft:4}}>{data.length} registros</span>}
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',cursor:'pointer'}}>
              <X size={20}/>
            </button>
          </div>

          {/* MENSAJES */}
          <div style={{flex:1,overflowY:'auto',padding:14,background:'#f8fafc',display:'flex',flexDirection:'column',gap:10}}>
            {mensajes.map(m => (
              <div key={m.id} style={{display:'flex',gap:8,flexDirection:m.rol==='user'?'row-reverse':'row'}}>
                <div style={{
                  width:28,height:28,borderRadius:'50%',flexShrink:0,
                  background:m.rol==='user'?'#2563eb':'linear-gradient(135deg,#1a2742,#2563eb)',
                  display:'flex',alignItems:'center',justifyContent:'center'
                }}>
                  {m.rol==='user' ? <User size={14} color="white"/> : <Bot size={14} color="white"/>}
                </div>
                <div style={{maxWidth:270,display:'flex',flexDirection:'column',alignItems:m.rol==='user'?'flex-end':'flex-start'}}>
                  <div style={{
                    borderRadius: m.rol==='user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                    padding:'8px 12px', fontSize:13, lineHeight:1.6,
                    background: m.rol==='user' ? '#2563eb' : 'white',
                    color: m.rol==='user' ? 'white' : '#1e293b',
                    boxShadow: m.rol==='user' ? 'none' : '0 1px 4px rgba(0,0,0,.08)',
                    border: m.rol==='user' ? 'none' : '1px solid #f1f5f9',
                  }}>
                    {m.cargando ? (
                      <div style={{display:'flex',gap:4,padding:'4px 0'}}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{
                            width:7,height:7,borderRadius:'50%',background:'#93c5fd',
                            animation:'bounce 1s infinite',animationDelay:`${i*150}ms`
                          }}/>
                        ))}
                      </div>
                    ) : (
                      <div>{renderTexto(m.texto)}</div>
                    )}
                  </div>
                  {m.timestamp && !m.cargando && (
                    <span style={{fontSize:10,color:'#94a3b8',marginTop:2,paddingLeft:2}}>{m.timestamp}</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef}/>
          </div>

          {/* PREGUNTAS SUGERIDAS - primeras 4 */}
          {mensajes.length <= 2 && data.length > 0 && (
            <div style={{padding:'8px 12px',background:'white',borderTop:'1px solid #f1f5f9',flexShrink:0}}>
              <p style={{fontSize:10,color:'#94a3b8',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>
                Preguntas frecuentes:
              </p>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {PREGUNTAS.slice(0,4).map((p,i) => (
                  <button key={i} onClick={() => enviar(p.texto)} style={{
                    fontSize:11,background:'#eff6ff',color:'#1d4ed8',
                    border:'1px solid #bfdbfe',borderRadius:20,
                    padding:'3px 10px',cursor:'pointer',
                    display:'flex',alignItems:'center',gap:4
                  }}>
                    {p.icono} {p.texto}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PREGUNTAS SUGERIDAS - siguientes cuando hay conversación */}
          {mensajes.length > 2 && !cargando && (
            <div style={{padding:'6px 12px',background:'white',borderTop:'1px solid #f1f5f9',flexShrink:0,overflowX:'auto'}}>
              <div style={{display:'flex',gap:5}}>
                {PREGUNTAS.slice(4).map((p,i) => (
                  <button key={i} onClick={() => enviar(p.texto)} style={{
                    flexShrink:0,fontSize:11,background:'#f8fafc',color:'#475569',
                    border:'1px solid #e2e8f0',borderRadius:20,
                    padding:'3px 10px',cursor:'pointer',
                    display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap'
                  }}>
                    {p.icono} {p.texto}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INPUT */}
          <div style={{padding:'10px 12px',background:'white',borderTop:'1px solid #e2e8f0',flexShrink:0}}>
            <div style={{display:'flex',gap:8}}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && enviar(input)}
                placeholder={data.length > 0 ? "Pregunta sobre el presupuesto..." : "Carga un Excel primero..."}
                disabled={cargando || (data.length === 0 && !planData && !contratosData && !pacData)}
                style={{
                  flex:1, border:'1px solid #e2e8f0', borderRadius:10,
                  padding:'8px 12px', fontSize:13, outline:'none',
                  background: data.length === 0 ? '#f8fafc' : 'white',
                  color: data.length === 0 ? '#94a3b8' : '#1e293b',
                }}
              />
              <button
                onClick={() => enviar(input)}
                disabled={cargando || !input.trim() || (data.length === 0 && !planData && !contratosData && !pacData)}
                style={{
                  width:38, height:38, borderRadius:10, border:'none', cursor:'pointer',
                  background: (cargando || !input.trim() || (data.length===0 && !planData && !contratosData && !pacData)) ? '#e2e8f0' : '#2563eb',
                  color: (cargando || !input.trim() || (data.length===0 && !planData && !contratosData && !pacData)) ? '#94a3b8' : 'white',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                }}>
                <Send size={16}/>
              </button>
            </div>
            <p style={{fontSize:10,color:'#94a3b8',textAlign:'center',marginTop:6}}>
              Politiko · IA para XBOG CONTROL · Codespage
            </p>
          </div>
        </div>
      )}
    </>
  );
}