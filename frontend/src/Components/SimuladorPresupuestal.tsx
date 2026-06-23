import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  AlertTriangle, GraduationCap, HeartPulse, Construction, Palette, Trophy, Shield,
  Download, RotateCcw, TrendingUp, TrendingDown, Sparkles, Activity, CheckCircle2
} from 'lucide-react';

interface DataRow { [key: string]: string | number; }
interface Props { data?: DataRow[]; }

const fmtCOP = (v: number) => {
  const sign = v < 0 ? '-' : '';
  v = Math.abs(v);
  if (v >= 1e9) return sign + '$' + (v/1e9).toFixed(2) + 'B';
  if (v >= 1e6) return sign + '$' + (v/1e6).toFixed(1) + 'M';
  if (v >= 1e3) return sign + '$' + (v/1e3).toFixed(0) + 'K';
  return sign + '$' + v.toLocaleString('es-CO');
};

const toNum = (v: any): number => {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const gc = (row: DataRow, variants: string[]): any => {
  for (const k of variants) if (row[k] !== undefined && row[k] !== '') return row[k];
  return '';
};

const COLS_RUBRO = ['Descripción del Rubro', 'Descripcion del Rubro', 'Descripción Rubro'];
const COLS_VALOR = ['Valor Neto'];
const COLS_GIRO  = ['Autorizacion giro', 'Autorización giro'];

const PALETA = [
  { color:'#16a34a', light:'#dcfce7', icon:GraduationCap, match:['educ'] },
  { color:'#2563eb', light:'#dbeafe', icon:HeartPulse,    match:['salud'] },
  { color:'#ec4899', light:'#fce7f3', icon:Construction,  match:['vía','via','infraestruc','obra'] },
  { color:'#f59e0b', light:'#fef3c7', icon:Palette,       match:['cultura'] },
  { color:'#8b5cf6', light:'#ede9fe', icon:Trophy,        match:['deporte'] },
  { color:'#0ea5e9', light:'#e0f2fe', icon:Shield,        match:['seguridad'] },
];

const paletaPara = (nombre: string) => {
  const n = nombre.toLowerCase();
  const found = PALETA.find(p => p.match.some(m => n.includes(m)));
  return found || PALETA[0];
};

const TABS = [
  { key:'reasignacion', label:'Reasignación de Recursos' },
  { key:'proyeccion',   label:'Proyección a Largo Plazo' },
  { key:'impacto',      label:'Impacto Social' },
  { key:'riesgo',       label:'Escenarios de Riesgo' },
];

const ESCENARIOS_RIESGO = [
  { key:'recorte',    label:'Recorte tributario',   detalle:'Caída del 15% en recaudo por ley tributaria', factor:0.85 },
  { key:'inflacion',  label:'Inflación alta',        detalle:'Incremento del 12% en costos de ejecución',   factor:1.12 },
  { key:'baja_ejec',  label:'Baja ejecución',        detalle:'Históricamente el 10% no se ejecuta',         factor:0.90 },
  { key:'emergencia', label:'Emergencia sanitaria',  detalle:'+25% obligatorio en salud por decreto',       factor:1.25, solo:'salud' },
];

export default function SimuladorPresupuestal({ data = [] }: Props) {
  const [tab, setTab] = useState('reasignacion');
  const [ajustes, setAjustes] = useState<Record<string, number>>({});
  const [riesgos, setRiesgos] = useState<Record<string, boolean>>({});

  // ── Sectores reales desde el CRP ──────────────────────────────────
  const sectoresBase = useMemo(() => {
    if (!data || data.length === 0) return [];
    const grupos: Record<string, { valor:number; giro:number }> = {};
    data.forEach(r => {
      const rubro = String(gc(r, COLS_RUBRO) || 'Sin clasificar').trim();
      if (!grupos[rubro]) grupos[rubro] = { valor:0, giro:0 };
      grupos[rubro].valor += toNum(gc(r, COLS_VALOR));
      grupos[rubro].giro  += toNum(gc(r, COLS_GIRO));
    });
    return Object.entries(grupos)
      .map(([nombre, d], i) => {
        const p = paletaPara(nombre);
        return {
          key: `s${i}`,
          nombre: nombre.length > 24 ? nombre.slice(0,24)+'…' : nombre,
          nombreCompleto: nombre,
          base: Math.round(d.valor / 1e6),
          ejecucion: d.valor > 0 ? (d.giro/d.valor)*100 : 0,
          color: p.color,
          light: p.light,
          Icon: p.icon,
        };
      })
      .filter(s => s.base > 0)
      .sort((a,b) => b.base - a.base)
      .slice(0, 4);
  }, [data]);

  const ajustesActuales = useMemo(() => {
    const d: Record<string, number> = {};
    sectoresBase.forEach(s => { d[s.key] = ajustes[s.key] ?? 0; });
    return d;
  }, [sectoresBase, ajustes]);

  // ── Simulación dinámica: cada cambio recalcula TODO ───────────────
  const simulado = useMemo(() => sectoresBase.map(s => {
    let valor = s.base * (1 + (ajustesActuales[s.key]||0)/100);
    ESCENARIOS_RIESGO.forEach(r => {
      if (!riesgos[r.key]) return;
      if (r.solo && !s.nombreCompleto.toLowerCase().includes(r.solo)) return;
      valor *= r.factor;
    });
    return { ...s, simulado: Math.round(valor) };
  }), [sectoresBase, ajustesActuales, riesgos]);

  const totalBase       = sectoresBase.reduce((s,sec)=>s+sec.base,0);
  const totalSimulado   = simulado.reduce((s,sec)=>s+sec.simulado,0);
  const diferencia      = totalSimulado - totalBase;
  const totalReasignado = totalBase > 0 ? ((diferencia/totalBase)*100) : 0;
  const riesgosActivos  = ESCENARIOS_RIESGO.filter(r => riesgos[r.key]);

  // ── Proyección dinámica basada en ajustes reales ──────────────────
  const proyeccion = useMemo(() => {
    const crecAnualSimulado = 1 + (totalReasignado/100)*0.3; // el ajuste influye en la pendiente
    return [0,1,2,3].map(i => {
      const año = new Date().getFullYear() + i;
      return {
        año,
        'Escenario Actual':    Math.round(totalBase * Math.pow(1.05, i)),
        'Escenario Simulado':  Math.round(totalSimulado * Math.pow(crecAnualSimulado, i)),
        'Escenario Pesimista': Math.round(totalBase * Math.pow(0.96, i)),
      };
    });
  }, [totalBase, totalSimulado, totalReasignado]);

  // ── Comparativa dinámica de escenarios (ejecución proyectada) ─────
  const comparativa = useMemo(() => simulado.map(s => {
    const ajusteVal = ajustesActuales[s.key] || 0;
    const base = Math.min(96, s.ejecucion);
    return {
      name: s.nombre,
      Actual: parseFloat(base.toFixed(1)),
      Simulado: parseFloat(Math.max(20, Math.min(99, base + ajusteVal*1.3)).toFixed(1)),
    };
  }), [simulado, ajustesActuales]);

  // ── Radar de balance entre sectores (visual nuevo, dinámico) ──────
  const radarData = useMemo(() => simulado.map(s => ({
    sector: s.nombre.length > 12 ? s.nombre.slice(0,12)+'…' : s.nombre,
    Base: 100,
    Simulado: parseFloat(((s.simulado/(s.base||1))*100).toFixed(0)),
  })), [simulado]);

  // ── Alertas inteligentes (dinámicas según ajustes Y riesgos) ──────
  const alertas = useMemo(() => {
    const out: { titulo:string; detalle:string; color:string; severidad:string }[] = [];
    simulado.forEach(s => {
      const val = ajustesActuales[s.key] || 0;
      const diffPct = s.base>0 ? ((s.simulado-s.base)/s.base)*100 : 0;
      if (diffPct <= -15) {
        out.push({ titulo:`Déficit crítico en ${s.nombreCompleto}`, detalle:`Reducción acumulada del ${Math.abs(diffPct).toFixed(0)}% — riesgo alto de incumplir metas del Plan de Desarrollo`, color:'#dc2626', severidad:'critica' });
      } else if (diffPct <= -5) {
        out.push({ titulo:`Alerta en ${s.nombreCompleto}`, detalle:`Reducción del ${Math.abs(diffPct).toFixed(0)}% — revisar impacto en cobertura del servicio`, color:'#f59e0b', severidad:'media' });
      }
      if (val !== 0 && s.ejecucion < 30 && diffPct < 0) {
        out.push({ titulo:`Ejecución ya crítica en ${s.nombreCompleto}`, detalle:`Este rubro tiene solo ${s.ejecucion.toFixed(0)}% de ejecución real — un recorte adicional agrava el rezago`, color:'#dc2626', severidad:'critica' });
      }
    });
    if (riesgosActivos.length >= 2) {
      out.push({ titulo:'Múltiples escenarios de riesgo activos', detalle:`${riesgosActivos.length} riesgos simultáneos pueden generar un efecto acumulativo no lineal sobre el presupuesto`, color:'#dc2626', severidad:'critica' });
    }
    return out;
  }, [simulado, ajustesActuales, riesgosActivos]);

  // ── Análisis automático en texto (el "cerebro" del simulador) ─────
  const analisis = useMemo(() => {
    if (sectoresBase.length === 0) return '';
    const mayor = [...simulado].sort((a,b)=> ((b.simulado-b.base)) - ((a.simulado-a.base)))[0];
    const menor = [...simulado].sort((a,b)=> ((a.simulado-a.base)) - ((b.simulado-b.base)))[0];
    const partes: string[] = [];

    if (totalReasignado === 0 && riesgosActivos.length === 0) {
      partes.push('No se han aplicado ajustes. Mueva los controles deslizantes para simular escenarios presupuestales.');
    } else {
      if (diferencia >= 0) {
        partes.push(`El escenario simulado incrementa el presupuesto total en ${fmtCOP(Math.abs(diferencia)*1e6)} (${totalReasignado.toFixed(1)}%) respecto al presupuesto base.`);
      } else {
        partes.push(`El escenario simulado reduce el presupuesto total en ${fmtCOP(Math.abs(diferencia)*1e6)} (${totalReasignado.toFixed(1)}%) respecto al presupuesto base.`);
      }
      if (mayor.simulado !== mayor.base) {
        const dir = mayor.simulado > mayor.base ? 'mayor incremento' : 'mayor recorte';
        partes.push(`${mayor.nombreCompleto} concentra el ${dir} con ${fmtCOP(Math.abs(mayor.simulado-mayor.base)*1e6)}.`);
      }
      if (menor.key !== mayor.key && menor.simulado < menor.base) {
        partes.push(`${menor.nombreCompleto} es el rubro más afectado negativamente.`);
      }
      if (riesgosActivos.length > 0) {
        partes.push(`Se simulan ${riesgosActivos.length} escenario(s) de riesgo: ${riesgosActivos.map(r=>r.label).join(', ')}.`);
      }
      if (alertas.some(a=>a.severidad==='critica')) {
        partes.push('⚠️ Hay alertas críticas activas — se recomienda revisar antes de presentar este escenario en debate.');
      } else if (alertas.length === 0) {
        partes.push('✅ El escenario actual no presenta riesgos significativos según los parámetros definidos.');
      }
    }
    return partes.join(' ');
  }, [sectoresBase, simulado, totalReasignado, diferencia, riesgosActivos, alertas]);

  const resetear = () => { setAjustes({}); setRiesgos({}); };

  // ── EXPORTAR PDF ───────────────────────────────────────────────────
  const exportarPDF = () => {
    const fecha = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });
    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>Simulador Presupuestal — FDL Usme</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',sans-serif; color:#1e293b; padding:40px; }
h1 { font-size:22px; font-weight:800; color:#0f172a; margin-bottom:4px; }
.sub { font-size:12px; color:#64748b; margin-bottom:20px; }
.analisis { background:#eff6ff; border:1.5px solid #bfdbfe; border-radius:10px; padding:14px 16px; margin-bottom:22px; font-size:12px; line-height:1.6; color:#1e3a5f; }
.kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:22px; }
.kpi { border-radius:12px; padding:16px; text-align:center; }
table { width:100%; border-collapse:collapse; margin-bottom:22px; font-size:12px; }
th { background:#0f172a; color:white; padding:9px 12px; text-align:left; }
td { padding:9px 12px; border-bottom:1px solid #f1f5f9; }
tr:nth-child(even) { background:#f8fafc; }
.badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; }
.alert { border-radius:10px; padding:12px 14px; margin-bottom:8px; color:white; }
.impact-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:22px; }
.impact { background:#f8fafc; border-radius:10px; padding:14px; text-align:center; }
.footer { margin-top:30px; text-align:center; font-size:10px; color:#94a3b8; padding-top:10px; border-top:1px solid #e2e8f0; }
@media print { body { padding:20px; } }
</style></head><body>
<h1>🧮 Simulador Presupuestal — FDL Usme</h1>
<div class="sub">Generado el ${fecha} · Datos reales del CRP · XBOG Technologies</div>

<div class="analisis"><strong>📊 Análisis automático:</strong><br/>${analisis}</div>

<div class="kpi-grid">
  <div class="kpi" style="background:#eff6ff;border:2px solid #bfdbfe">
    <div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:6px">PRESUPUESTO BASE</div>
    <div style="font-size:20px;font-weight:900;color:#1d4ed8">${fmtCOP(totalBase*1e6)}</div>
  </div>
  <div class="kpi" style="background:${diferencia>=0?'#f0fdf4':'#fef2f2'};border:2px solid ${diferencia>=0?'#bbf7d0':'#fecaca'}">
    <div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:6px">FONDO ACTUALIZADO</div>
    <div style="font-size:20px;font-weight:900;color:${diferencia>=0?'#16a34a':'#dc2626'}">${fmtCOP(totalSimulado*1e6)}</div>
  </div>
  <div class="kpi" style="background:${diferencia>=0?'#f0fdf4':'#fef2f2'};border:2px solid ${diferencia>=0?'#bbf7d0':'#fecaca'}">
    <div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:6px">TOTAL REASIGNADO</div>
    <div style="font-size:20px;font-weight:900;color:${diferencia>=0?'#16a34a':'#dc2626'}">${diferencia>=0?'+':''}${totalReasignado.toFixed(1)}%</div>
  </div>
</div>

${riesgosActivos.length>0 ? `<h3 style="font-size:13px;font-weight:700;margin-bottom:8px">🎲 Escenarios de Riesgo Simulados</h3>
<table><thead><tr><th>Escenario</th><th>Descripción</th></tr></thead><tbody>
${riesgosActivos.map(r=>`<tr><td><strong>${r.label}</strong></td><td>${r.detalle}</td></tr>`).join('')}
</tbody></table>` : ''}

${alertas.length > 0 ? `<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">⚠️ Alertas de Riesgo</h3>
${alertas.map(a => `<div class="alert" style="background:${a.color}"><strong>${a.titulo}</strong><br/><span style="font-size:11px;opacity:.9">${a.detalle}</span></div>`).join('')}
<div style="margin-bottom:18px"></div>` : ''}

<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">Ajustes por Rubro</h3>
<table><thead><tr><th>Rubro</th><th>Ejec. Real</th><th>Base</th><th>Simulado</th><th>Variación</th></tr></thead>
<tbody>
${simulado.map(s => {
  const diff = s.simulado - s.base;
  const pct = s.base>0 ? ((diff/s.base)*100) : 0;
  return `<tr>
    <td><strong>${s.nombreCompleto}</strong></td>
    <td>${s.ejecucion.toFixed(1)}%</td>
    <td>${fmtCOP(s.base*1e6)}</td>
    <td style="font-weight:700;color:${diff>=0?'#16a34a':'#dc2626'}">${fmtCOP(s.simulado*1e6)}</td>
    <td><span class="badge" style="background:${diff>=0?'#d1fae5':'#fee2e2'};color:${diff>=0?'#065f46':'#991b1b'}">${diff>=0?'+':''}${pct.toFixed(1)}%</span></td>
  </tr>`;
}).join('')}
<tr style="background:#f1f5f9;font-weight:700">
  <td colspan="2">TOTAL</td>
  <td>${fmtCOP(totalBase*1e6)}</td>
  <td style="color:${diferencia>=0?'#16a34a':'#dc2626'}">${fmtCOP(totalSimulado*1e6)}</td>
  <td><span class="badge" style="background:${diferencia>=0?'#d1fae5':'#fee2e2'};color:${diferencia>=0?'#065f46':'#991b1b'}">${diferencia>=0?'+':''}${totalReasignado.toFixed(1)}%</span></td>
</tr>
</tbody></table>

<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">Proyección Financiera a 3 Años</h3>
<table><thead><tr><th>Año</th><th>Escenario Actual</th><th>Escenario Simulado</th><th>Escenario Pesimista</th></tr></thead>
<tbody>${proyeccion.map(p => `<tr>
  <td><strong>${p.año}</strong></td>
  <td>${fmtCOP(p['Escenario Actual']*1e6)}</td>
  <td style="color:#16a34a;font-weight:700">${fmtCOP(p['Escenario Simulado']*1e6)}</td>
  <td style="color:#dc2626">${fmtCOP(p['Escenario Pesimista']*1e6)}</td>
</tr>`).join('')}</tbody></table>

<div class="footer">Simulador Presupuestal · Control Político · XBOG Technologies · richbello.github.io/proyecto_concejales</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;
    const blob = new Blob([html], { type:'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-96">
      <div className="bg-gradient-to-br from-slate-700 to-blue-900 rounded-2xl p-10 text-center text-white max-w-md shadow-2xl">
        <div className="text-6xl mb-4">🧮</div>
        <h2 className="text-2xl font-bold mb-2">Simulador Presupuestal</h2>
        <p className="text-slate-300 text-sm">Carga el reporte Excel CRP en <strong>Análisis Presupuestal</strong> para activar el simulador con datos reales.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* HEADER / NAVBAR */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 via-blue-400 to-pink-400 flex items-center justify-center text-xl">
              🧮
            </div>
            <div>
              <h2 className="text-white font-extrabold text-lg tracking-wide leading-tight">SIMULADOR PRESUPUESTAL</h2>
              <p className="text-blue-200 text-xs">{sectoresBase.length} rubros reales del CRP · análisis en vivo</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={resetear} className="flex items-center gap-1.5 text-xs text-blue-200 hover:text-white border border-white/20 rounded-lg px-3 py-2 transition-colors">
              <RotateCcw className="w-3.5 h-3.5"/> Resetear
            </button>
            <button onClick={exportarPDF} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg px-3 py-2 transition-colors shadow-md">
              <Download className="w-3.5 h-3.5"/> Exportar PDF
            </button>
          </div>
        </div>
        <div className="flex border-t border-white/10 px-5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${tab===t.key?'text-white border-blue-400':'text-blue-200/60 border-transparent hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ANÁLISIS AUTOMÁTICO — siempre visible, siempre dinámico */}
      <div className="bg-white rounded-xl p-4 shadow-sm border-l-4" style={{borderColor: alertas.some(a=>a.severidad==='critica')?'#dc2626':diferencia>=0?'#16a34a':'#f59e0b'}}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{background: alertas.some(a=>a.severidad==='critica')?'#fee2e2':diferencia>=0?'#dcfce7':'#fef3c7'}}>
            <Sparkles className="w-4 h-4" style={{color: alertas.some(a=>a.severidad==='critica')?'#dc2626':diferencia>=0?'#16a34a':'#d97706'}}/>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Análisis Automático</div>
            <p className="text-sm text-slate-700 leading-relaxed">{analisis}</p>
          </div>
        </div>
      </div>

      {/* TAB: REASIGNACIÓN */}
      {tab === 'reasignacion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4">Ajuste de Presupuesto</h3>
            <div className="space-y-5">
              {sectoresBase.map(sector => {
                const val = ajustesActuales[sector.key] || 0;
                const Icon = sector.Icon;
                const simVal = simulado.find(s=>s.key===sector.key)?.simulado || sector.base;
                return (
                  <div key={sector.key}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: sector.color}}>
                        <Icon className="w-5 h-5 text-white"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-700 truncate" title={sector.nombreCompleto}>{sector.nombre}</div>
                        <input type="range" min={-20} max={20} value={val}
                          onChange={e => setAjustes(prev => ({...prev, [sector.key]: Number(e.target.value)}))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer mt-1.5"
                          style={{accentColor: sector.color, background:`linear-gradient(to right, ${sector.color} ${(val+20)*2.5}%, #e2e8f0 ${(val+20)*2.5}%)`}}
                        />
                      </div>
                      <div className="w-16 text-right font-extrabold text-sm flex-shrink-0" style={{color: val>0?'#16a34a':val<0?'#dc2626':'#64748b'}}>
                        {val>0?'+':''}{val}%
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 ml-13 pl-13" style={{paddingLeft:52}}>
                      {fmtCOP(sector.base*1e6)} → <span className="font-semibold" style={{color:sector.color}}>{fmtCOP(simVal*1e6)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base mb-4">Resumen</h3>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Total Reasignado:</span>
                <span className="text-xl font-extrabold flex items-center gap-1" style={{color: totalReasignado>=0?'#16a34a':'#dc2626'}}>
                  {totalReasignado>=0?<TrendingUp className="w-4 h-4"/>:<TrendingDown className="w-4 h-4"/>}
                  {totalReasignado>=0?'+':''}{totalReasignado.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-500">Fondo Actualizado:</span>
                <span className="text-xl font-extrabold text-blue-700">{fmtCOP(totalSimulado * 1e6)}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 flex justify-between">
                <span>Base: {fmtCOP(totalBase*1e6)}</span>
                <span className={diferencia>=0?'text-green-600 font-semibold':'text-red-600 font-semibold'}>
                  {diferencia>=0?'+':''}{fmtCOP(Math.abs(diferencia)*1e6)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm flex-1">
              <h3 className="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500"/> Alertas de Riesgo
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {alertas.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400 mb-2"/>
                    <span className="text-sm text-slate-400">Sin alertas — los ajustes están dentro de rangos seguros</span>
                  </div>
                )}
                {alertas.map((a,i) => (
                  <div key={i} className="rounded-xl p-3 text-white flex items-start gap-3" style={{background:a.color}}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5"/>
                    <div>
                      <div className="font-bold text-sm">{a.titulo}</div>
                      <div className="text-xs opacity-90">{a.detalle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PROYECCIÓN */}
      {tab === 'proyeccion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4">Proyección Financiera a 3 Años</h3>
            <ResponsiveContainer width="99%" height={280}>
              <LineChart data={proyeccion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="año" tick={{fontSize:11}}/>
                <YAxis tickFormatter={v=>fmtCOP(v*1e6)} tick={{fontSize:10}}/>
                <Tooltip formatter={(v:any)=>fmtCOP((v as number)*1e6)}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="Escenario Actual" stroke="#2563eb" strokeWidth={2} dot={{r:5}} strokeDasharray="6 4"/>
                <Line type="monotone" dataKey="Escenario Simulado" stroke="#16a34a" strokeWidth={3} dot={{r:5}}/>
                <Line type="monotone" dataKey="Escenario Pesimista" stroke="#ef4444" strokeWidth={2} dot={{r:5}} strokeDasharray="6 4"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4">Comparativa de Ejecución por Rubro</h3>
            <ResponsiveContainer width="99%" height={280}>
              <BarChart data={comparativa}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{fontSize:10}} angle={-15} textAnchor="end" height={50}/>
                <YAxis domain={[0,100]} tickFormatter={v=>v+'%'} tick={{fontSize:10}}/>
                <Tooltip formatter={(v:any)=>(v as number).toFixed(1)+'%'}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="Actual" fill="#94a3b8" radius={[3,3,0,0]}/>
                <Bar dataKey="Simulado" fill="#2563eb" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm lg:col-span-2">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500"/> Balance entre Sectores (Base = 100%)
            </h3>
            <ResponsiveContainer width="99%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0"/>
                <PolarAngleAxis dataKey="sector" tick={{fontSize:11}}/>
                <PolarRadiusAxis tick={{fontSize:9}} domain={[0, 130]}/>
                <Radar name="Base" dataKey="Base" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15}/>
                <Radar name="Simulado" dataKey="Simulado" stroke="#2563eb" fill="#2563eb" fillOpacity={0.35}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Tooltip formatter={(v:any)=>v+'%'}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB: IMPACTO SOCIAL */}
      {tab === 'impacto' && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-base mb-4">Impacto Social Estimado</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon:'🏠', label:'Nuevas Aulas',       sector:'educ',  base:5,   factor:1.5, color:'#2563eb' },
              { icon:'🏥', label:'Camas Hospitalarias', sector:'salud', base:8,   factor:6.25,color:'#0ea5e9' },
              { icon:'🎭', label:'Eventos Culturales',  sector:'cultura',base:6,  factor:1.3, color:'#dc2626' },
              { icon:'⚽', label:'Programas Deportivos',sector:'deporte',base:4,  factor:1.1, color:'#8b5cf6' },
              { icon:'🛡️', label:'Patrullas Adicionales',sector:'seguridad',base:3,factor:0.8, color:'#0ea5e9' },
              { icon:'🏗️', label:'Km de Vía Mejorada',  sector:'via',   base:2,   factor:0.6, color:'#ec4899' },
            ].map((m,i) => {
              const sector = sectoresBase.find(s => s.nombreCompleto.toLowerCase().includes(m.sector));
              const val = sector ? Math.max(0, Math.round(((ajustesActuales[sector.key]||0)+m.base)*m.factor)) : 0;
              const activo = !!sector;
              return (
                <div key={i} className={`flex items-center gap-3 rounded-xl p-4 ${activo?'bg-slate-50':'bg-slate-50/50 opacity-50'}`}>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0" style={{background:m.color+'22'}}>
                    {m.icon}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold">{m.label}</div>
                    <div className="text-2xl font-extrabold" style={{color:m.color}}>
                      {activo ? `+${val}` : '—'}
                    </div>
                    {!activo && <div className="text-xs text-slate-400">Sin datos en CRP</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-4">* Estimaciones basadas en proporciones estándar de inversión por sector. Ajuste los sliders en la pestaña "Reasignación de Recursos" para ver el impacto.</p>
        </div>
      )}

      {/* TAB: ESCENARIOS DE RIESGO */}
      {tab === 'riesgo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500"/> Activar Escenarios de Riesgo
            </h3>
            <div className="space-y-3">
              {ESCENARIOS_RIESGO.map(r => (
                <label key={r.key} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-colors hover:bg-slate-50"
                  style={{background: riesgos[r.key] ? '#fef2f2' : 'white', borderColor: riesgos[r.key] ? '#fecaca' : '#e2e8f0'}}>
                  <input type="checkbox" checked={!!riesgos[r.key]}
                    onChange={e => setRiesgos(prev => ({...prev, [r.key]: e.target.checked}))}
                    className="mt-1 cursor-pointer w-4 h-4 accent-red-600"/>
                  <div>
                    <div className="text-sm font-bold text-slate-700">{r.label}</div>
                    <div className="text-xs text-slate-500">{r.detalle}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4">Efecto Combinado de Riesgos</h3>
            {riesgosActivos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-400 mb-2"/>
                <span className="text-sm text-slate-400">Active uno o más escenarios para ver el impacto combinado</span>
              </div>
            ) : (
              <ResponsiveContainer width="99%" height={260}>
                <BarChart data={simulado}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="nombre" tick={{fontSize:9}} angle={-20} textAnchor="end" height={60}/>
                  <YAxis tickFormatter={v=>fmtCOP(v*1e6)} tick={{fontSize:10}}/>
                  <Tooltip formatter={(v:any)=>fmtCOP((v as number)*1e6)}/>
                  <Bar dataKey="base" fill="#94a3b8" name="Sin riesgo" radius={[3,3,0,0]}/>
                  <Bar dataKey="simulado" fill="#dc2626" name="Con riesgo aplicado" radius={[3,3,0,0]}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
