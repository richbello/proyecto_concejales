import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, TrendingDown, Users, DollarSign, FileWarning, Scale, Search } from 'lucide-react';

interface DataRow { [key: string]: string | number; }

interface AnomaliaDetectada {
  id: string;
  categoria: string;
  titulo: string;
  descripcion: string;
  evidencia: string[];
  impacto: string;
  recomendacion: string;
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  registros: DataRow[];
  icono: string;
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
  numDoc:       ['Número Doc. BP Beneficiario', 'Numero Doc BP'],
};

const severidadConfig = {
  critica: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'CRÍTICA', emoji: '🔴' },
  alta:    { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'ALTA',    emoji: '🟠' },
  media:   { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'MEDIA',   emoji: '🟡' },
  baja:    { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'BAJA',    emoji: '🟢' },
};

export function detectarAnomalias(data: DataRow[]): AnomaliaDetectada[] {
  if (!data || data.length === 0) return [];
  const anomalias: AnomaliaDetectada[] = [];

  // ── 1. CONTRATOS CON CERO EJECUCIÓN ──────────────────────────────────────
  const sinEjec = data.filter(r => toNum(gc(r, COLS.ejecucion)) === 0 && toNum(gc(r, COLS.valorCRP)) > 0);
  if (sinEjec.length > 0) {
    const total = sinEjec.reduce((s, r) => s + toNum(gc(r, COLS.valorCRP)), 0);
    anomalias.push({
      id: 'sin_ejecucion',
      categoria: 'Ejecución Presupuestal',
      titulo: 'Contratos sin ninguna ejecución',
      descripcion: `Se encontraron ${sinEjec.length} contratos con 0% de ejecución por un valor total de ${fmtCOP(total)}. Estos recursos están comprometidos pero no se ha girado ningún peso.`,
      evidencia: sinEjec.slice(0, 5).map(r => `• ${gc(r, COLS.noComp)} — ${String(gc(r, COLS.beneficiario)).slice(0, 40)} — ${fmtCOP(toNum(gc(r, COLS.valorCRP)))}`),
      impacto: `${fmtCOP(total)} en riesgo de no ejecutarse antes del cierre fiscal`,
      recomendacion: 'Solicitar informe de causas del retraso a la Secretaría de Hacienda y al supervisor del contrato.',
      severidad: sinEjec.length > 5 ? 'critica' : 'alta',
      registros: sinEjec,
      icono: '⏸️',
    });
  }

  // ── 2. CONTRATISTAS REPETIDOS ─────────────────────────────────────────────
  const benefMap: Record<string, DataRow[]> = {};
  data.forEach(r => {
    const b = String(gc(r, COLS.beneficiario) || '').trim();
    if (b && b !== '') {
      if (!benefMap[b]) benefMap[b] = [];
      benefMap[b].push(r);
    }
  });
  const repetidos = Object.entries(benefMap).filter(([, rows]) => rows.length >= 3).sort((a, b) => b[1].length - a[1].length);
  if (repetidos.length > 0) {
    const topRepetido = repetidos[0];
    const totalRepetidos = repetidos.reduce((s, [, rows]) => s + rows.reduce((ss, r) => ss + toNum(gc(r, COLS.valorNeto)), 0), 0);
    anomalias.push({
      id: 'contratistas_repetidos',
      categoria: 'Transparencia en Contratación',
      titulo: 'Contratistas con múltiples contratos',
      descripcion: `${repetidos.length} contratistas tienen 3 o más contratos. El más frecuente es "${topRepetido[0].slice(0, 50)}" con ${topRepetido[1].length} contratos. Esto puede indicar favorecimiento o posible fraccionamiento.`,
      evidencia: repetidos.slice(0, 5).map(([nombre, rows]) => {
        const total = rows.reduce((s, r) => s + toNum(gc(r, COLS.valorNeto)), 0);
        return `• ${nombre.slice(0, 40)} — ${rows.length} contratos — ${fmtCOP(total)}`;
      }),
      impacto: `${fmtCOP(totalRepetidos)} concentrados en ${repetidos.length} contratistas recurrentes`,
      recomendacion: 'Solicitar estudios previos y justificación de cada contrato. Verificar si hay inhabilidades o conflictos de interés.',
      severidad: repetidos.length > 3 ? 'alta' : 'media',
      registros: repetidos.flatMap(([, rows]) => rows),
      icono: '👥',
    });
  }

  // ── 3. CONTRATACIÓN DIRECTA EXCESIVA ─────────────────────────────────────
  const modalMap: Record<string, number> = {};
  data.forEach(r => {
    const m = String(gc(r, COLS.modalidad) || 'Sin clasificar');
    modalMap[m] = (modalMap[m] || 0) + 1;
  });
  const directaEntry = Object.entries(modalMap).find(([k]) => k.toLowerCase().includes('direct'));
  if (directaEntry) {
    const pct = (directaEntry[1] / data.length) * 100;
    if (pct > 50) {
      const directaRows = data.filter(r => String(gc(r, COLS.modalidad) || '').toLowerCase().includes('direct'));
      const totalDirecta = directaRows.reduce((s, r) => s + toNum(gc(r, COLS.valorNeto)), 0);
      anomalias.push({
        id: 'contratacion_directa',
        categoria: 'Modalidad de Contratación',
        titulo: 'Uso excesivo de contratación directa',
        descripcion: `El ${pct.toFixed(1)}% de los contratos (${directaEntry[1]} de ${data.length}) se adjudicaron por contratación directa. La Ley 80 establece que esta modalidad debe ser excepcional.`,
        evidencia: [
          `• Contratos directos: ${directaEntry[1]} (${pct.toFixed(1)}%)`,
          `• Valor total contratación directa: ${fmtCOP(totalDirecta)}`,
          `• Contratos por licitación/concurso: ${data.length - directaEntry[1]} (${(100 - pct).toFixed(1)}%)`,
        ],
        impacto: `${fmtCOP(totalDirecta)} adjudicados sin proceso competitivo`,
        recomendacion: 'Solicitar las justificaciones legales de cada contratación directa. Verificar cumplimiento del artículo 2 de la Ley 1150 de 2007.',
        severidad: pct > 70 ? 'critica' : 'alta',
        registros: directaRows,
        icono: '⚖️',
      });
    }
  }

  // ── 4. ANULACIONES ELEVADAS ───────────────────────────────────────────────
  const totalCRP = data.reduce((s, r) => s + toNum(gc(r, COLS.valorCRP)), 0);
  const totalAnul = data.reduce((s, r) => s + toNum(gc(r, COLS.anulaciones)), 0);
  const pctAnul = totalCRP > 0 ? (totalAnul / totalCRP) * 100 : 0;
  if (pctAnul > 5) {
    const conAnul = data.filter(r => toNum(gc(r, COLS.anulaciones)) > 0);
    anomalias.push({
      id: 'anulaciones_altas',
      categoria: 'Control Presupuestal',
      titulo: 'Nivel de anulaciones presupuestales elevado',
      descripcion: `Las anulaciones representan el ${pctAnul.toFixed(2)}% del presupuesto CRP total (${fmtCOP(totalAnul)} de ${fmtCOP(totalCRP)}). Un porcentaje alto puede indicar mala planeación o modificaciones no justificadas.`,
      evidencia: [
        `• Total anulaciones: ${fmtCOP(totalAnul)}`,
        `• Porcentaje del CRP: ${pctAnul.toFixed(2)}%`,
        `• Registros con anulaciones: ${conAnul.length}`,
        ...conAnul.slice(0, 3).map(r => `• ${gc(r, COLS.noComp)} — anulado: ${fmtCOP(toNum(gc(r, COLS.anulaciones)))}`),
      ],
      impacto: `${fmtCOP(totalAnul)} retirados del presupuesto comprometido`,
      recomendacion: 'Solicitar acto administrativo que justifique cada anulación. Verificar si corresponden a contratos terminados anticipadamente.',
      severidad: pctAnul > 15 ? 'critica' : pctAnul > 10 ? 'alta' : 'media',
      registros: conAnul,
      icono: '🗑️',
    });
  }

  // ── 5. VALORES ATÍPICOS (OUTLIERS) ────────────────────────────────────────
  const valores = data.map(r => toNum(gc(r, COLS.valorCRP))).filter(v => v > 0);
  if (valores.length > 3) {
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    const outliers = data.filter(r => toNum(gc(r, COLS.valorCRP)) > promedio * 4);
    if (outliers.length > 0) {
      anomalias.push({
        id: 'valores_atipicos',
        categoria: 'Análisis de Riesgo',
        titulo: 'Contratos con valores inusualmente altos',
        descripcion: `${outliers.length} contratos tienen un valor 4 veces superior al promedio (${fmtCOP(promedio)}). Esto requiere verificación de estudios de mercado y justificación del precio.`,
        evidencia: outliers.slice(0, 5).map(r => `• ${gc(r, COLS.noComp)} — ${String(gc(r, COLS.beneficiario)).slice(0, 35)} — ${fmtCOP(toNum(gc(r, COLS.valorCRP)))}`),
        impacto: `Promedio general: ${fmtCOP(promedio)} — estos contratos superan 4x ese valor`,
        recomendacion: 'Solicitar estudios previos, análisis del sector y justificación de precios para cada contrato identificado.',
        severidad: 'alta',
        registros: outliers,
        icono: '📈',
      });
    }
  }

  // ── 6. BAJA EJECUCIÓN GENERAL ─────────────────────────────────────────────
  const totalGiro = data.reduce((s, r) => s + toNum(gc(r, COLS.giro)), 0);
  const pctEjecGlobal = totalCRP > 0 ? (totalGiro / totalCRP) * 100 : 0;
  if (pctEjecGlobal < 30 && totalCRP > 0) {
    anomalias.push({
      id: 'baja_ejecucion_global',
      categoria: 'Ejecución Presupuestal',
      titulo: 'Ejecución presupuestal global crítica',
      descripcion: `Solo se ha girado el ${pctEjecGlobal.toFixed(1)}% del presupuesto total comprometido. Una ejecución menor al 30% puede generar pérdida de recursos por fenecimiento.`,
      evidencia: [
        `• CRP Total comprometido: ${fmtCOP(totalCRP)}`,
        `• Total girado (ejecutado): ${fmtCOP(totalGiro)}`,
        `• Pendiente por girar: ${fmtCOP(totalCRP - totalGiro)}`,
        `• Porcentaje de ejecución: ${pctEjecGlobal.toFixed(1)}%`,
      ],
      impacto: `${fmtCOP(totalCRP - totalGiro)} en riesgo de no ejecutarse`,
      recomendacion: 'Convocar debate de control político urgente. Exigir plan de aceleración de la ejecución a la administración.',
      severidad: pctEjecGlobal < 15 ? 'critica' : 'alta',
      registros: [],
      icono: '⚠️',
    });
  }

  return anomalias.sort((a, b) => {
    const orden = { critica: 0, alta: 1, media: 2, baja: 3 };
    return orden[a.severidad] - orden[b.severidad];
  });
}

// ── COMPONENTE ────────────────────────────────────────────────────────────
interface Props { data: DataRow[]; }

export default function AnomaliasCRP({ data }: Props) {
  const [expandida, setExpandida] = useState<string | null>(null);
  const [filtroSev, setFiltroSev] = useState<string>('todas');
  const [tabRegistros, setTabRegistros] = useState<string | null>(null);

  const anomalias = useMemo(() => detectarAnomalias(data), [data]);

  const filtradas = anomalias.filter(a => filtroSev === 'todas' || a.severidad === filtroSev);

  const conteos = {
    critica: anomalias.filter(a => a.severidad === 'critica').length,
    alta:    anomalias.filter(a => a.severidad === 'alta').length,
    media:   anomalias.filter(a => a.severidad === 'media').length,
    total:   anomalias.length,
  };

  if (data.length === 0) return (
    <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
      <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 font-semibold">Carga un reporte Excel para detectar anomalías</p>
      <p className="text-slate-400 text-xs mt-1">El sistema analizará automáticamente los datos del CRP</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">

      {/* RESUMEN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Anomalías',  val: conteos.total,   color: '#1a2742', icon: <AlertTriangle className="w-4 h-4"/> },
          { label: 'Críticas',         val: conteos.critica, color: '#dc2626', icon: <FileWarning className="w-4 h-4"/> },
          { label: 'Altas',            val: conteos.alta,    color: '#ea580c', icon: <TrendingDown className="w-4 h-4"/> },
          { label: 'Medias',           val: conteos.media,   color: '#d97706', icon: <Scale className="w-4 h-4"/> },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm" style={{borderTop:`3px solid ${k.color}`}}>
            <div className="flex items-center gap-2 mb-1" style={{color:k.color}}>{k.icon}<span className="text-xs text-slate-500">{k.label}</span></div>
            <div className="text-2xl font-bold" style={{color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* AVISO GENERAL */}
      {conteos.total === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-4">
          <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0"/>
          <div>
            <div className="font-bold text-green-700">No se detectaron anomalías</div>
            <div className="text-green-600 text-sm mt-0.5">El reporte analizado no presenta irregularidades significativas según los parámetros establecidos.</div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0"/>
          <div>
            <div className="font-bold text-red-700">Se detectaron {conteos.total} anomalías que requieren atención</div>
            <div className="text-red-600 text-sm mt-0.5">
              {conteos.critica > 0 && `${conteos.critica} críticas · `}
              {conteos.alta > 0 && `${conteos.alta} altas · `}
              {conteos.media > 0 && `${conteos.media} medias`}
              — Revisar para posibles debates de control político
            </div>
          </div>
        </div>
      )}

      {/* FILTRO */}
      {conteos.total > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[
            { val:'todas',   label:`Todas (${conteos.total})` },
            { val:'critica', label:`🔴 Críticas (${conteos.critica})` },
            { val:'alta',    label:`🟠 Altas (${conteos.alta})` },
            { val:'media',   label:`🟡 Medias (${conteos.media})` },
          ].map(f => (
            <button key={f.val} onClick={() => setFiltroSev(f.val)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filtroSev===f.val?'bg-slate-800 text-white border-slate-800':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* LISTA DE ANOMALÍAS */}
      {filtradas.map(a => {
        const cfg = severidadConfig[a.severidad];
        const isOpen = expandida === a.id;
        const showReg = tabRegistros === a.id;

        return (
          <div key={a.id} className="rounded-xl border overflow-hidden shadow-sm"
            style={{borderColor: cfg.border}}>

            {/* CABECERA */}
            <div className="p-4 cursor-pointer" style={{background: cfg.bg}}
              onClick={() => setExpandida(isOpen ? null : a.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{a.icono}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{a.titulo}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{background: cfg.color, color:'white'}}>
                        {cfg.emoji} {cfg.label}
                      </span>
                      <span className="text-xs text-slate-500 bg-white/60 px-2 py-0.5 rounded-full">
                        {a.categoria}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.descripcion}</p>
                  </div>
                </div>
                <span className="text-slate-400 text-lg flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* DETALLE EXPANDIDO */}
            {isOpen && (
              <div className="p-4 bg-white border-t" style={{borderColor: cfg.border}}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                  {/* Evidencia */}
                  <div className="lg:col-span-2">
                    <div className="font-bold text-slate-700 text-xs mb-2 uppercase tracking-wide">📋 Evidencia Encontrada</div>
                    <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs text-slate-700 space-y-1">
                      {a.evidencia.map((e, i) => <div key={i}>{e}</div>)}
                    </div>
                  </div>

                  {/* Impacto y recomendación */}
                  <div className="space-y-3">
                    <div>
                      <div className="font-bold text-slate-700 text-xs mb-1 uppercase tracking-wide">💥 Impacto</div>
                      <div className="text-xs text-slate-600 bg-orange-50 border border-orange-200 rounded-lg p-2">
                        {a.impacto}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-700 text-xs mb-1 uppercase tracking-wide">✅ Recomendación</div>
                      <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        {a.recomendacion}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ver registros */}
                {a.registros.length > 0 && (
                  <div className="mt-4">
                    <button onClick={() => setTabRegistros(showReg ? null : a.id)}
                      className="text-xs font-semibold px-4 py-2 rounded-lg border transition-colors"
                      style={{background: cfg.bg, color: cfg.color, borderColor: cfg.border}}>
                      {showReg ? '▲ Ocultar registros' : `▼ Ver ${a.registros.length} registros involucrados`}
                    </button>

                    {showReg && (
                      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-800 text-white">
                              <th className="px-3 py-2 text-left">No. Compromiso</th>
                              <th className="px-3 py-2 text-left">Beneficiario</th>
                              <th className="px-3 py-2 text-left">Modalidad</th>
                              <th className="px-3 py-2 text-right">Valor CRP</th>
                              <th className="px-3 py-2 text-right">Anulaciones</th>
                              <th className="px-3 py-2 text-right">Ejecución</th>
                            </tr>
                          </thead>
                          <tbody>
                            {a.registros.slice(0, 20).map((r, i) => {
                              const ejec = toNum(gc(r, COLS.ejecucion)) * 100;
                              return (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className="px-3 py-2 font-semibold text-blue-600">{String(gc(r, COLS.noComp))}</td>
                                  <td className="px-3 py-2 max-w-40 truncate">{String(gc(r, COLS.beneficiario)).slice(0,35)}</td>
                                  <td className="px-3 py-2 text-slate-500 text-xs">{String(gc(r, COLS.modalidad)).slice(0,20)}</td>
                                  <td className="px-3 py-2 text-right font-semibold">{fmtCOP(toNum(gc(r, COLS.valorCRP)))}</td>
                                  <td className="px-3 py-2 text-right text-red-600">{fmtCOP(toNum(gc(r, COLS.anulaciones)))}</td>
                                  <td className="px-3 py-2 text-right">
                                    <span className={`font-bold ${ejec===0?'text-red-600':ejec<50?'text-orange-500':'text-green-600'}`}>
                                      {ejec.toFixed(0)}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {a.registros.length > 20 && (
                              <tr><td colSpan={6} className="text-center py-2 text-slate-400 text-xs">... y {a.registros.length - 20} registros más</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
