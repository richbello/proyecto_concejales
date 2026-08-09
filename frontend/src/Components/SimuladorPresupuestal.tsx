import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, ComposedChart,
  ScatterChart, Scatter, ZAxis, ReferenceLine, Cell,
} from 'recharts';
import {
  AlertTriangle, Download, RotateCcw, TrendingUp, TrendingDown, Sparkles,
  Activity, CheckCircle2, Receipt, Landmark, Building2, Wallet, Users, Target,
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
const fmtNum = (v: number) => Math.round(v).toLocaleString('es-CO');

const toNum = (v: any): number => {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

// Normalizador + buscador de columna EXACTO (sin acentos, sin puntos)
const norm = (s: any): string => String(s)
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

const gcExacto = (row: DataRow, variants: string[]): any => {
  const keys = Object.keys(row);
  for (const v of variants) { const nv = norm(v); const h = keys.find(k => norm(k) === nv); if (h !== undefined) return row[h]; }
  for (const v of variants) { const nv = norm(v); const h = keys.find(k => norm(k).includes(nv)); if (h !== undefined) return row[h]; }
  return '';
};

const COLS = {
  compromiso: ['Compromiso'],
  rubro:      ['Rubro'],
  valorCRP:   ['Valor CRP'],
  valorNeto:  ['Valor Neto'],
  giro:       ['Autorizacion giro', 'Autorización giro'],
  sinGiro:    ['Com.Sin.Aut.Giro', 'Com. Sin. Aut. Giro', 'Com Sin Aut Giro'],
};

const COLORES = ['#2563eb','#16a34a','#f59e0b','#8b5cf6','#ec4899','#0ea5e9'];
const ICONOS  = [Receipt, Landmark, Building2, Wallet, Users, Target];

// Escenarios de riesgo (aplicados POR COMPROMISO)
const ESCENARIOS_RIESGO = [
  { key:'recorte',       label:'Recorte presupuestal',      detalle:'Reducción del 15% del CRP por ajuste fiscal' },
  { key:'inflacion',     label:'Inflación / sobrecostos',   detalle:'Pérdida del 12% de poder adquisitivo en la ejecución' },
  { key:'baja_ejec',     label:'Baja ejecución histórica',  detalle:'Compromisos con ejecución <50% pierden 10% del saldo' },
  { key:'congelamiento', label:'Congelamiento de giros',    detalle:'El saldo Com. Sin Aut. Giro no alcanza a ejecutarse en la vigencia' },
  { key:'emergencia',    label:'Priorización por emergencia',detalle:'+20% obligatorio al compromiso de mayor cuantía' },
];

// Conversores de impacto social (costos de referencia en pesos)
const CONVERSORES = [
  { key:'benef', label:'Beneficiarios de programas', icon:'👥', costo: 2_500_000,  color:'#2563eb' },
  { key:'meses', label:'Meses de servicios prof.',   icon:'📋', costo: 5_000_000,  color:'#16a34a' },
  { key:'viv',   label:'Mejoramientos de vivienda',  icon:'🏠', costo: 20_000_000, color:'#f59e0b' },
  { key:'dot',   label:'Dotaciones deporte/cultura', icon:'🎽', costo: 30_000_000, color:'#8b5cf6' },
];
const COSTO_BENEF = 2_500_000; // para gráfica por compromiso

const TABS = [
  { key:'reasignacion', label:'Reasignación de Recursos' },
  { key:'proyeccion',   label:'Proyección & Cuadrante' },
  { key:'impacto',      label:'Impacto Social' },
  { key:'riesgo',       label:'Escenarios de Riesgo' },
];

export default function SimuladorPresupuestal({ data = [] }: Props) {
  const [tab, setTab] = useState('reasignacion');
  const [ajustes, setAjustes] = useState<Record<string, number>>({});
  const [riesgos, setRiesgos] = useState<Record<string, boolean>>({});

  // ── Unidades reales: Top compromisos por Valor CRP ─────────────────
  const unidades = useMemo(() => {
    if (!data || data.length === 0) return [];
    const g: Record<string, { crp:number; giro:number; sinGiro:number; neto:number; count:number }> = {};
    data.forEach(r => {
      const k = String(gcExacto(r, COLS.compromiso) || 'Sin compromiso').trim() || 'Sin compromiso';
      if (!g[k]) g[k] = { crp:0, giro:0, sinGiro:0, neto:0, count:0 };
      g[k].crp     += toNum(gcExacto(r, COLS.valorCRP));
      g[k].giro    += toNum(gcExacto(r, COLS.giro));
      g[k].sinGiro += toNum(gcExacto(r, COLS.sinGiro));
      g[k].neto    += toNum(gcExacto(r, COLS.valorNeto));
      g[k].count   += 1;
    });
    const ordenado = Object.entries(g)
      .map(([nombre, d]) => ({ nombre, ...d }))
      .filter(d => d.crp > 0)
      .sort((a,b) => b.crp - a.crp)
      .slice(0, 6);
    const maxCrp = ordenado[0]?.crp ?? 0;
    return ordenado.map((d, i) => ({
      key: `c${i}`,
      nombre: d.nombre,
      nombreCompleto: d.nombre,
      base:    Math.round(d.crp / 1e6),      // millones (CRP = base presupuestal)
      giro:    Math.round(d.giro / 1e6),
      sinGiro: Math.round(d.sinGiro / 1e6),
      neto:    Math.round(d.neto / 1e6),
      ejecucion: d.crp > 0 ? (d.giro / d.crp) * 100 : 0,
      count: d.count,
      color: COLORES[i % COLORES.length],
      Icon: ICONOS[i % ICONOS.length],
      esMayor: d.crp === maxCrp,
    }));
  }, [data]);

  const ajustesActuales = useMemo(() => {
    const d: Record<string, number> = {};
    unidades.forEach(u => { d[u.key] = ajustes[u.key] ?? 0; });
    return d;
  }, [unidades, ajustes]);

  // ── Aplicación de riesgos POR COMPROMISO ───────────────────────────
  const aplicarRiesgos = (u: any, valorAjustado: number): number => {
    let v = valorAjustado;
    if (riesgos.recorte)                       v *= 0.85;
    if (riesgos.inflacion)                     v *= 0.88;
    if (riesgos.baja_ejec && u.ejecucion < 50) v *= 0.90;
    if (riesgos.congelamiento)                 v = v - u.sinGiro;
    if (riesgos.emergencia && u.esMayor)       v *= 1.20;
    return Math.max(0, Math.round(v));
  };

  // ── Simulación (sliders + riesgos) ─────────────────────────────────
  const simulado = useMemo(() => unidades.map(u => {
    const ajustado = u.base * (1 + (ajustesActuales[u.key] || 0) / 100);
    return { ...u, simulado: aplicarRiesgos(u, ajustado) };
  }), [unidades, ajustesActuales, riesgos]);

  // ── Efecto AISLADO de los riesgos (ignora sliders) ─────────────────
  const riesgoData = useMemo(() => unidades.map(u => ({
    nombre: u.nombre,
    nombreCompleto: u.nombreCompleto,
    color: u.color,
    base: u.base,
    conRiesgo: aplicarRiesgos(u, u.base),
  })), [unidades, riesgos]);

  const totalBase       = unidades.reduce((s,u)=>s+u.base,0);
  const totalSimulado   = simulado.reduce((s,u)=>s+u.simulado,0);
  const diferencia      = totalSimulado - totalBase;
  const totalReasignado = totalBase > 0 ? ((diferencia/totalBase)*100) : 0;
  const riesgosActivos  = ESCENARIOS_RIESGO.filter(r => riesgos[r.key]);

  // ── Proyección a 3 años (dinámica) ─────────────────────────────────
  const proyeccion = useMemo(() => {
    const crec = 1 + (totalReasignado/100)*0.3;
    return [0,1,2,3].map(i => {
      const año = new Date().getFullYear() + i;
      return {
        año,
        'Escenario Actual':    Math.round(totalBase * Math.pow(1.05, i)),
        'Escenario Simulado':  Math.round(totalSimulado * Math.pow(crec, i)),
        'Escenario Pesimista': Math.round(totalBase * Math.pow(0.96, i)),
      };
    });
  }, [totalBase, totalSimulado, totalReasignado]);

  // ── Cuadrante de riesgo (scatter): CRP vs Ejecución, tamaño = Sin Giro ─
  const medianaCRP = useMemo(() => {
    if (unidades.length === 0) return 0;
    const arr = [...unidades.map(u=>u.base)].sort((a,b)=>a-b);
    const m = Math.floor(arr.length/2);
    return arr.length % 2 ? arr[m] : (arr[m-1]+arr[m])/2;
  }, [unidades]);

  const scatterData = useMemo(() => unidades.map(u => ({
    x: u.base, y: parseFloat(u.ejecucion.toFixed(1)), z: Math.max(u.sinGiro, 1),
    nombre: u.nombreCompleto,
    critico: u.base >= medianaCRP && u.ejecucion < 50,
  })), [unidades, medianaCRP]);

  // ── Comparativa base vs simulado + ejecución (ComposedChart) ───────
  const comparativa = useMemo(() => simulado.map(s => ({
    name: s.nombre,
    Base: s.base,
    Simulado: s.simulado,
    'Ejecución %': parseFloat(s.ejecucion.toFixed(1)),
  })), [simulado]);

  // ── Impacto social por compromiso (dinámico, en beneficiarios equiv.) ─
  const impactoPorCompromiso = useMemo(() => simulado.map(s => ({
    name: s.nombre,
    Base:     Math.round((s.base*1e6)/COSTO_BENEF),
    Simulado: Math.round((s.simulado*1e6)/COSTO_BENEF),
  })), [simulado]);

  const impactoTotales = useMemo(() => CONVERSORES.map(c => {
    const base = Math.floor((totalBase*1e6)/c.costo);
    const sim  = Math.floor((totalSimulado*1e6)/c.costo);
    return { ...c, base, sim, delta: sim - base };
  }), [totalBase, totalSimulado]);

  // ── Alertas dinámicas ──────────────────────────────────────────────
  const alertas = useMemo(() => {
    const out: { titulo:string; detalle:string; color:string; severidad:string }[] = [];
    simulado.forEach(s => {
      const diffPct = s.base>0 ? ((s.simulado-s.base)/s.base)*100 : 0;
      if (diffPct <= -15) out.push({ titulo:`Déficit crítico en "${s.nombre}"`, detalle:`Reducción acumulada del ${Math.abs(diffPct).toFixed(0)}% — riesgo alto de incumplir el objeto contractual`, color:'#dc2626', severidad:'critica' });
      else if (diffPct <= -5) out.push({ titulo:`Alerta en "${s.nombre}"`, detalle:`Reducción del ${Math.abs(diffPct).toFixed(0)}% — revisar impacto en la ejecución`, color:'#f59e0b', severidad:'media' });
      if (s.ejecucion < 30 && diffPct < 0) out.push({ titulo:`Ejecución ya crítica en "${s.nombre}"`, detalle:`Solo ${s.ejecucion.toFixed(0)}% de ejecución real — un recorte adicional agrava el rezago`, color:'#dc2626', severidad:'critica' });
    });
    if (riesgos.congelamiento) {
      const congelado = unidades.reduce((s,u)=>s+u.sinGiro,0);
      if (congelado>0) out.push({ titulo:'Saldo en riesgo de congelamiento', detalle:`${fmtCOP(congelado*1e6)} en Com. Sin Aut. Giro podrían no ejecutarse en la vigencia`, color:'#dc2626', severidad:'critica' });
    }
    if (riesgosActivos.length >= 2) out.push({ titulo:'Múltiples escenarios de riesgo activos', detalle:`${riesgosActivos.length} riesgos simultáneos generan un efecto acumulativo no lineal`, color:'#dc2626', severidad:'critica' });
    return out;
  }, [simulado, riesgos, riesgosActivos, unidades]);

  // ── Análisis automático ─────────────────────────────────────────────
  const analisis = useMemo(() => {
    if (unidades.length === 0) return '';
    const mayor = [...simulado].sort((a,b)=> (b.simulado-b.base) - (a.simulado-a.base))[0];
    const menor = [...simulado].sort((a,b)=> (a.simulado-a.base) - (b.simulado-b.base))[0];
    const criticoQuad = scatterData.find(d => d.critico);
    const partes: string[] = [];

    if (totalReasignado === 0 && riesgosActivos.length === 0) {
      partes.push('No se han aplicado ajustes. Mueva los controles o active escenarios de riesgo para simular.');
    } else {
      partes.push(diferencia >= 0
        ? `El escenario simulado incrementa el presupuesto en ${fmtCOP(Math.abs(diferencia)*1e6)} (${totalReasignado.toFixed(1)}%) respecto a la base.`
        : `El escenario simulado reduce el presupuesto en ${fmtCOP(Math.abs(diferencia)*1e6)} (${totalReasignado.toFixed(1)}%) respecto a la base.`);
      if (mayor && mayor.simulado !== mayor.base) partes.push(`"${mayor.nombre}" concentra el mayor ${mayor.simulado>mayor.base?'incremento':'recorte'} (${fmtCOP(Math.abs(mayor.simulado-mayor.base)*1e6)}).`);
      if (menor && menor.key !== mayor?.key && menor.simulado < menor.base) partes.push(`"${menor.nombre}" es el compromiso más afectado.`);
      if (riesgosActivos.length > 0) partes.push(`Riesgos simulados: ${riesgosActivos.map(r=>r.label).join(', ')}.`);
    }
    if (criticoQuad) partes.push(`⚠️ "${criticoQuad.nombre.slice(0,40)}" es un compromiso de alta cuantía con baja ejecución (zona de riesgo del cuadrante).`);
    if (alertas.some(a=>a.severidad==='critica')) partes.push('Hay alertas críticas activas — revísalas antes de llevar este escenario a debate.');
    else if (alertas.length === 0 && totalReasignado !== 0) partes.push('✅ El escenario no presenta riesgos significativos según los parámetros definidos.');
    return partes.join(' ');
  }, [unidades, simulado, scatterData, totalReasignado, diferencia, riesgosActivos, alertas]);

  const resetear = () => { setAjustes({}); setRiesgos({}); };

  // ── EXPORTAR PDF ────────────────────────────────────────────────────
  const exportarPDF = () => {
    const fecha = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Simulador Presupuestal — XBOG CONTROL</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;color:#1e293b;padding:40px}
h1{font-size:22px;font-weight:800;color:#0f172a;margin-bottom:4px}.sub{font-size:12px;color:#64748b;margin-bottom:20px}
.analisis{background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:22px;font-size:12px;line-height:1.6;color:#1e3a5f}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px}.kpi{border-radius:12px;padding:16px;text-align:center}
table{width:100%;border-collapse:collapse;margin-bottom:22px;font-size:12px}th{background:#0f172a;color:#fff;padding:9px 12px;text-align:left}
td{padding:9px 12px;border-bottom:1px solid #f1f5f9}tr:nth-child(even){background:#f8fafc}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
.alert{border-radius:10px;padding:12px 14px;margin-bottom:8px;color:#fff}
.footer{margin-top:30px;text-align:center;font-size:10px;color:#94a3b8;padding-top:10px;border-top:1px solid #e2e8f0}
@media print{body{padding:20px}}
</style></head><body>
<h1>🧮 Simulador Presupuestal — XBOG CONTROL</h1>
<div class="sub">Generado el ${fecha} · Datos reales del CRP (por compromiso) · XBOG Technologies</div>
<div class="analisis"><strong>📊 Análisis automático:</strong><br/>${analisis}</div>
<div class="kpi-grid">
  <div class="kpi" style="background:#eff6ff;border:2px solid #bfdbfe"><div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:6px">PRESUPUESTO BASE (CRP)</div><div style="font-size:20px;font-weight:900;color:#1d4ed8">${fmtCOP(totalBase*1e6)}</div></div>
  <div class="kpi" style="background:${diferencia>=0?'#f0fdf4':'#fef2f2'};border:2px solid ${diferencia>=0?'#bbf7d0':'#fecaca'}"><div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:6px">FONDO SIMULADO</div><div style="font-size:20px;font-weight:900;color:${diferencia>=0?'#16a34a':'#dc2626'}">${fmtCOP(totalSimulado*1e6)}</div></div>
  <div class="kpi" style="background:${diferencia>=0?'#f0fdf4':'#fef2f2'};border:2px solid ${diferencia>=0?'#bbf7d0':'#fecaca'}"><div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:6px">VARIACIÓN TOTAL</div><div style="font-size:20px;font-weight:900;color:${diferencia>=0?'#16a34a':'#dc2626'}">${diferencia>=0?'+':''}${totalReasignado.toFixed(1)}%</div></div>
</div>
${riesgosActivos.length>0?`<h3 style="font-size:13px;font-weight:700;margin-bottom:8px">🎲 Escenarios de Riesgo</h3><table><thead><tr><th>Escenario</th><th>Descripción</th></tr></thead><tbody>${riesgosActivos.map(r=>`<tr><td><strong>${r.label}</strong></td><td>${r.detalle}</td></tr>`).join('')}</tbody></table>`:''}
${alertas.length>0?`<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">⚠️ Alertas</h3>${alertas.map(a=>`<div class="alert" style="background:${a.color}"><strong>${a.titulo}</strong><br/><span style="font-size:11px;opacity:.9">${a.detalle}</span></div>`).join('')}<div style="margin-bottom:18px"></div>`:''}
<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">Ajustes por Compromiso</h3>
<table><thead><tr><th>Compromiso</th><th>Ejec.</th><th>Base (CRP)</th><th>Simulado</th><th>Variación</th></tr></thead><tbody>
${simulado.map(s=>{const diff=s.simulado-s.base;const pct=s.base>0?((diff/s.base)*100):0;return `<tr><td><strong>${s.nombreCompleto}</strong></td><td>${s.ejecucion.toFixed(1)}%</td><td>${fmtCOP(s.base*1e6)}</td><td style="font-weight:700;color:${diff>=0?'#16a34a':'#dc2626'}">${fmtCOP(s.simulado*1e6)}</td><td><span class="badge" style="background:${diff>=0?'#d1fae5':'#fee2e2'};color:${diff>=0?'#065f46':'#991b1b'}">${diff>=0?'+':''}${pct.toFixed(1)}%</span></td></tr>`;}).join('')}
<tr style="background:#f1f5f9;font-weight:700"><td colspan="2">TOTAL</td><td>${fmtCOP(totalBase*1e6)}</td><td style="color:${diferencia>=0?'#16a34a':'#dc2626'}">${fmtCOP(totalSimulado*1e6)}</td><td><span class="badge" style="background:${diferencia>=0?'#d1fae5':'#fee2e2'};color:${diferencia>=0?'#065f46':'#991b1b'}">${diferencia>=0?'+':''}${totalReasignado.toFixed(1)}%</span></td></tr>
</tbody></table>
<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">Proyección Financiera a 3 Años</h3>
<table><thead><tr><th>Año</th><th>Actual</th><th>Simulado</th><th>Pesimista</th></tr></thead><tbody>
${proyeccion.map(p=>`<tr><td><strong>${p.año}</strong></td><td>${fmtCOP(p['Escenario Actual']*1e6)}</td><td style="color:#16a34a;font-weight:700">${fmtCOP(p['Escenario Simulado']*1e6)}</td><td style="color:#dc2626">${fmtCOP(p['Escenario Pesimista']*1e6)}</td></tr>`).join('')}
</tbody></table>
<div class="footer">Simulador Presupuestal · XBOG CONTROL · Codespage · richbello.github.io/proyecto_concejales</div>
<script>window.onload=()=>window.print()</script></body></html>`;
    const blob = new Blob([html], { type:'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // ── Tooltip scatter ──────────────────────────────────────────────────
  const ScatterTT = ({active, payload}: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-lg" style={{maxWidth:240}}>
        <div className="font-bold text-slate-700 mb-1">{d.nombre.slice(0,50)}</div>
        <div>CRP: <strong>{fmtCOP(d.x*1e6)}</strong></div>
        <div>Ejecución: <strong>{d.y}%</strong></div>
        <div>Sin Aut. Giro: <strong>{fmtCOP(d.z*1e6)}</strong></div>
        {d.critico && <div className="text-red-600 font-semibold mt-1">⚠️ Alta cuantía + baja ejecución</div>}
      </div>
    );
  };

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-96">
      <div className="bg-gradient-to-br from-slate-700 to-blue-900 rounded-2xl p-10 text-center text-white max-w-md shadow-2xl">
        <div className="text-6xl mb-4">🧮</div>
        <h2 className="text-2xl font-bold mb-2">Simulador Presupuestal</h2>
        <p className="text-slate-300 text-sm">Carga el reporte Excel CRP en <strong>Análisis Presupuestal</strong> para activar el simulador con datos reales por compromiso.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 via-blue-400 to-pink-400 flex items-center justify-center text-xl">🧮</div>
            <div>
              <h2 className="text-white font-extrabold text-lg tracking-wide leading-tight">SIMULADOR PRESUPUESTAL</h2>
              <p className="text-blue-200 text-xs">{unidades.length} compromisos top del CRP · análisis en vivo</p>
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

      {/* ANÁLISIS AUTOMÁTICO */}
      <div className="bg-white rounded-xl p-4 shadow-sm border-l-4" style={{borderColor: alertas.some(a=>a.severidad==='critica')?'#dc2626':diferencia>=0?'#16a34a':'#f59e0b'}}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background: alertas.some(a=>a.severidad==='critica')?'#fee2e2':diferencia>=0?'#dcfce7':'#fef3c7'}}>
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
            <h3 className="font-bold text-slate-800 text-base mb-4">Ajuste por Compromiso (Top 6 por CRP)</h3>
            <div className="space-y-5">
              {unidades.map(u => {
                const val = ajustesActuales[u.key] || 0;
                const Icon = u.Icon;
                const simVal = simulado.find(s=>s.key===u.key)?.simulado || u.base;
                return (
                  <div key={u.key}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:u.color}}>
                        <Icon className="w-5 h-5 text-white"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-700" title={u.nombreCompleto} style={{whiteSpace:"normal",wordBreak:"break-word",lineHeight:"1.3"}}>{u.nombre}</div>
                        <input type="range" min={-20} max={20} value={val}
                          onChange={e=>setAjustes(prev=>({...prev,[u.key]:Number(e.target.value)}))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer mt-1.5"
                          style={{accentColor:u.color, background:`linear-gradient(to right, ${u.color} ${(val+20)*2.5}%, #e2e8f0 ${(val+20)*2.5}%)`}}/>
                      </div>
                      <div className="w-16 text-right font-extrabold text-sm flex-shrink-0" style={{color: val>0?'#16a34a':val<0?'#dc2626':'#64748b'}}>
                        {val>0?'+':''}{val}%
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1" style={{paddingLeft:52}}>
                      Ejec. {u.ejecucion.toFixed(0)}% · {fmtCOP(u.base*1e6)} → <span className="font-semibold" style={{color:u.color}}>{fmtCOP(simVal*1e6)}</span>
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
                <span className="text-sm text-slate-500">Variación Total:</span>
                <span className="text-xl font-extrabold flex items-center gap-1" style={{color: totalReasignado>=0?'#16a34a':'#dc2626'}}>
                  {totalReasignado>=0?<TrendingUp className="w-4 h-4"/>:<TrendingDown className="w-4 h-4"/>}
                  {totalReasignado>=0?'+':''}{totalReasignado.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-500">Fondo Simulado:</span>
                <span className="text-xl font-extrabold text-blue-700">{fmtCOP(totalSimulado*1e6)}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 flex justify-between">
                <span>Base CRP: {fmtCOP(totalBase*1e6)}</span>
                <span className={diferencia>=0?'text-green-600 font-semibold':'text-red-600 font-semibold'}>{diferencia>=0?'+':''}{fmtCOP(Math.abs(diferencia)*1e6)}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm flex-1">
              <h3 className="font-bold text-slate-800 text-base mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500"/> Alertas de Riesgo</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {alertas.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400 mb-2"/>
                    <span className="text-sm text-slate-400">Sin alertas — los ajustes están dentro de rangos seguros</span>
                  </div>
                )}
                {alertas.map((a,i)=>(
                  <div key={i} className="rounded-xl p-3 text-white flex items-start gap-3" style={{background:a.color}}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5"/>
                    <div><div className="font-bold text-sm">{a.titulo}</div><div className="text-xs opacity-90">{a.detalle}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PROYECCIÓN & CUADRANTE */}
      {tab === 'proyeccion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4">Proyección Financiera a 3 Años</h3>
            <ResponsiveContainer width="99%" height={280}>
              <LineChart data={proyeccion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="año" tick={{fontSize:11}}/>
                <YAxis tickFormatter={v=>fmtCOP(v*1e6)} tick={{fontSize:10}} width={62}/>
                <Tooltip formatter={(v:any)=>fmtCOP((v as number)*1e6)}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="Escenario Actual" stroke="#2563eb" strokeWidth={2} dot={{r:5}} strokeDasharray="6 4"/>
                <Line type="monotone" dataKey="Escenario Simulado" stroke="#16a34a" strokeWidth={3} dot={{r:5}}/>
                <Line type="monotone" dataKey="Escenario Pesimista" stroke="#ef4444" strokeWidth={2} dot={{r:5}} strokeDasharray="6 4"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4">Base vs Simulado + Ejecución</h3>
            <ResponsiveContainer width="99%" height={280}>
              <ComposedChart data={comparativa}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{fontSize:9}} angle={-15} textAnchor="end" height={54}/>
                <YAxis yAxisId="l" tickFormatter={v=>fmtCOP(v*1e6)} tick={{fontSize:9}} width={58}/>
                <YAxis yAxisId="r" orientation="right" domain={[0,100]} tickFormatter={v=>v+'%'} tick={{fontSize:9}} width={40}/>
                <Tooltip formatter={(v:any,n:any)=> n==='Ejecución %' ? (v as number).toFixed(1)+'%' : fmtCOP((v as number)*1e6)}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar yAxisId="l" dataKey="Base" fill="#94a3b8" radius={[3,3,0,0]}/>
                <Bar yAxisId="l" dataKey="Simulado" fill="#2563eb" radius={[3,3,0,0]}/>
                <Line yAxisId="r" type="monotone" dataKey="Ejecución %" stroke="#f59e0b" strokeWidth={2} dot={{r:4}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm lg:col-span-2">
            <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500"/> Cuadrante de Riesgo por Compromiso</h3>
            <p className="text-xs text-slate-400 mb-3">Eje X: Valor CRP · Eje Y: Ejecución % · Tamaño de burbuja: Com. Sin Aut. Giro. La zona <span className="text-red-500 font-semibold">superior-derecha inferior</span> (alta cuantía + baja ejecución) es la de mayor riesgo político.</p>
            <ResponsiveContainer width="99%" height={320}>
              <ScatterChart margin={{top:10,right:20,left:10,bottom:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis type="number" dataKey="x" name="CRP" tickFormatter={v=>fmtCOP(v*1e6)} tick={{fontSize:9}}/>
                <YAxis type="number" dataKey="y" name="Ejecución" domain={[0,100]} tickFormatter={v=>v+'%'} tick={{fontSize:10}}/>
                <ZAxis type="number" dataKey="z" range={[80,600]} name="Sin Aut. Giro"/>
                <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="5 5" label={{value:'Ejec. 50%',fontSize:9,fill:'#f59e0b',position:'insideTopRight'}}/>
                <ReferenceLine x={medianaCRP} stroke="#94a3b8" strokeDasharray="5 5"/>
                <Tooltip content={<ScatterTT/>}/>
                <Scatter data={scatterData}>
                  {scatterData.map((d,i)=><Cell key={i} fill={d.critico?'#dc2626':'#2563eb'} fillOpacity={0.7}/>)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB: IMPACTO SOCIAL (dinámico) */}
      {tab === 'impacto' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-1">Capacidad Social del Presupuesto</h3>
            <p className="text-xs text-slate-400 mb-4">Equivalencias estimadas con costos de referencia. Cambian en vivo con los sliders y los escenarios de riesgo.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {impactoTotales.map(m => (
                <div key={m.key} className="rounded-xl p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl" style={{background:m.color+'22'}}>{m.icon}</div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold flex items-center gap-1 justify-end" style={{color: m.delta>=0?'#16a34a':'#dc2626'}}>
                        {m.delta>=0?<TrendingUp className="w-3 h-3"/>:<TrendingDown className="w-3 h-3"/>}
                        {m.delta>=0?'+':''}{fmtNum(m.delta)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">{m.label}</div>
                  <div className="text-2xl font-extrabold" style={{color:m.color}}>{fmtNum(m.sim)}</div>
                  <div className="text-[11px] text-slate-400">Base: {fmtNum(m.base)} · ${(m.costo/1e6).toFixed(0)}M c/u</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-1">Alcance por Compromiso (beneficiarios equivalentes)</h3>
            <p className="text-xs text-slate-400 mb-4">Beneficiarios financiables por compromiso (${(COSTO_BENEF/1e6).toFixed(1)}M c/u), base vs simulado.</p>
            <ResponsiveContainer width="99%" height={300}>
              <BarChart data={impactoPorCompromiso} margin={{bottom:40}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{fontSize:9}} angle={-18} textAnchor="end" height={60} interval={0}/>
                <YAxis tickFormatter={v=>fmtNum(v)} tick={{fontSize:9}} width={54}/>
                <Tooltip formatter={(v:any)=>fmtNum(v as number)+' benef.'}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="Base" fill="#94a3b8" radius={[3,3,0,0]}/>
                <Bar dataKey="Simulado" fill="#16a34a" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-slate-400 mt-3">* Estimaciones con costos unitarios de referencia. No constituyen cifras oficiales de ejecución.</p>
          </div>
        </div>
      )}

      {/* TAB: ESCENARIOS DE RIESGO (por compromiso) */}
      {tab === 'riesgo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500"/> Activar Escenarios</h3>
            <div className="space-y-3">
              {ESCENARIOS_RIESGO.map(r => (
                <label key={r.key} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-colors hover:bg-slate-50"
                  style={{background: riesgos[r.key]?'#fef2f2':'white', borderColor: riesgos[r.key]?'#fecaca':'#e2e8f0'}}>
                  <input type="checkbox" checked={!!riesgos[r.key]} onChange={e=>setRiesgos(prev=>({...prev,[r.key]:e.target.checked}))} className="mt-1 cursor-pointer w-4 h-4 accent-red-600"/>
                  <div><div className="text-sm font-bold text-slate-700">{r.label}</div><div className="text-xs text-slate-500">{r.detalle}</div></div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4">Efecto de Riesgos por Compromiso</h3>
            {riesgosActivos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-400 mb-2"/>
                <span className="text-sm text-slate-400">Active uno o más escenarios para ver el impacto por compromiso</span>
              </div>
            ) : (
              <ResponsiveContainer width="99%" height={280}>
                <BarChart data={riesgoData} layout="vertical" margin={{left:8,right:16}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                  <XAxis type="number" tickFormatter={v=>fmtCOP(v*1e6)} tick={{fontSize:9}}/>
                  <YAxis type="category" dataKey="nombre" width={150} tick={{fontSize:9}}/>
                  <Tooltip formatter={(v:any)=>fmtCOP((v as number)*1e6)}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="base" name="Base CRP" fill="#94a3b8" radius={[0,3,3,0]}/>
                  <Bar dataKey="conRiesgo" name="Con riesgos" fill="#dc2626" radius={[0,3,3,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {riesgosActivos.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm lg:col-span-2">
              <h3 className="font-bold text-slate-800 text-base mb-3">Detalle del Impacto por Compromiso</h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-800 text-white">
                    {['Compromiso','Base CRP','Con Riesgos','Pérdida','% Impacto'].map(h=>(
                      <th key={h} className={`px-3 py-2 ${h==='Compromiso'?'text-left':'text-right'} font-semibold`}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {riesgoData.map((r,i)=>{
                      const perdida = r.base - r.conRiesgo;
                      const pct = r.base>0 ? (perdida/r.base)*100 : 0;
                      return (
                        <tr key={i} className={i%2?'bg-slate-50':'bg-white'}>
                          <td className="px-3 py-2 font-semibold max-w-xs truncate" title={r.nombreCompleto}>{r.nombreCompleto}</td>
                          <td className="px-3 py-2 text-right">{fmtCOP(r.base*1e6)}</td>
                          <td className="px-3 py-2 text-right font-bold text-red-600">{fmtCOP(r.conRiesgo*1e6)}</td>
                          <td className="px-3 py-2 text-right text-red-500">{fmtCOP(perdida*1e6)}</td>
                          <td className="px-3 py-2 text-right font-bold" style={{color: pct>15?'#dc2626':pct>5?'#f59e0b':'#16a34a'}}>-{pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}