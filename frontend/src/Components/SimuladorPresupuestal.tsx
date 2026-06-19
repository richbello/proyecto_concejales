import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer
} from 'recharts';
import { AlertTriangle, GraduationCap, HeartPulse, Construction, Palette, Trophy, Shield, Download } from 'lucide-react';

interface DataRow { [key: string]: string | number; }
interface Props { data?: DataRow[]; }

const fmtCOP = (v: number) => {
  if (v >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v/1e3).toFixed(0) + 'K';
  return '$' + v.toLocaleString('es-CO');
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

// Paleta fija idéntica a la referencia
const PALETA = [
  { color:'#16a34a', icon:GraduationCap, key:'educacion' },     // verde
  { color:'#2563eb', icon:HeartPulse,    key:'salud' },          // azul
  { color:'#ec4899', icon:Construction,  key:'infraestructura' },// rosa
  { color:'#f59e0b', icon:Palette,       key:'cultura' },        // naranja
  { color:'#8b5cf6', icon:Trophy,        key:'deporte' },        // morado
  { color:'#0ea5e9', icon:Shield,        key:'seguridad' },      // cyan
];

const rubroIcono = (nombre: string) => {
  const n = nombre.toLowerCase();
  if (n.includes('educ')) return PALETA[0];
  if (n.includes('salud')) return PALETA[1];
  if (n.includes('vía')||n.includes('via')||n.includes('infraestruc')||n.includes('obra')) return PALETA[2];
  if (n.includes('cultura')) return PALETA[3];
  if (n.includes('deporte')) return PALETA[4];
  if (n.includes('seguridad')) return PALETA[5];
  return PALETA[0];
};

const TABS = [
  { key:'reasignacion', label:'Reasignación de Recursos' },
  { key:'proyeccion',   label:'Proyección a Largo Plazo' },
  { key:'impacto',      label:'Impacto Social' },
  { key:'riesgo',       label:'Escenarios de Riesgo' },
];

export default function SimuladorPresupuestal({ data = [] }: Props) {
  const [tab, setTab] = useState('reasignacion');
  const [ajustes, setAjustes] = useState<Record<string, number>>({});

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
        const ic = rubroIcono(nombre);
        return {
          key: `s${i}`,
          nombre: nombre.length > 22 ? nombre.slice(0,22)+'…' : nombre,
          nombreCompleto: nombre,
          base: Math.round(d.valor / 1e6),
          ejecucion: d.valor > 0 ? (d.giro/d.valor)*100 : 0,
          color: ic.color,
          Icon: ic.icon,
        };
      })
      .filter(s => s.base > 0)
      .sort((a,b) => b.base - a.base)
      .slice(0, 4); // top 4 como en la referencia
  }, [data]);

  const ajustesActuales = useMemo(() => {
    const d: Record<string, number> = {};
    sectoresBase.forEach(s => { d[s.key] = ajustes[s.key] ?? 0; });
    return d;
  }, [sectoresBase, ajustes]);

  const simulado = useMemo(() => sectoresBase.map(s => ({
    ...s,
    simulado: Math.round(s.base * (1 + (ajustesActuales[s.key]||0)/100))
  })), [sectoresBase, ajustesActuales]);

  const totalBase     = sectoresBase.reduce((s,sec)=>s+sec.base,0);
  const totalSimulado = simulado.reduce((s,sec)=>s+sec.simulado,0);
  const totalReasignado = totalBase > 0 ? (((totalSimulado-totalBase)/totalBase)*100) : 0;

  // Proyección 3 escenarios
  const proyeccion = [0,1,2,3].map(i => {
    const año = 2023 + i;
    return {
      año,
      'Escenario Actual':    Math.round(totalBase * Math.pow(1.04, i)),
      'Escenario Simulado':  Math.round(totalSimulado * Math.pow(1.02, i) * (i===2?0.92: i===3?0.95:1)),
      'Escenario Pesimista': Math.round(totalBase * Math.pow(0.97, i) * (i>=1?1.05:1)),
    };
  });

  // Comparativa barras (ejecución simulada por escenario ficticio sobre estructura visual)
  const comparativa = simulado.slice(0,3).map(s => ({
    name: s.nombre,
    Actual: Math.min(96, 90 + (s.ejecucion/10)),
    Simulado: Math.min(95, 86 + (s.ejecucion/12)),
    Oposicion: Math.min(94, 84),
    Base: Math.min(93, 82),
  }));

  // Alertas dinámicas según ajustes negativos
  const alertas = simulado
    .filter(s => (ajustesActuales[s.key]||0) < -3)
    .map(s => ({
      titulo: `Déficit en ${s.nombreCompleto}`,
      detalle: `Reducción del ${Math.abs(ajustesActuales[s.key]||0)}% — riesgo de afectar metas del sector`,
      color: (ajustesActuales[s.key]||0) <= -10 ? '#dc2626' : '#f59e0b'
    }));

  const resetear = () => setAjustes({});

  const exportarPDF = () => {
    const fecha = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });
    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>Simulador Presupuestal — FDL Usme</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',sans-serif; color:#1e293b; padding:40px; }
h1 { font-size:22px; font-weight:800; color:#0f172a; margin-bottom:4px; }
.sub { font-size:12px; color:#64748b; margin-bottom:24px; }
.kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:24px; }
.kpi { border-radius:12px; padding:16px; text-align:center; }
table { width:100%; border-collapse:collapse; margin-bottom:24px; font-size:12px; }
th { background:#0f172a; color:white; padding:9px 12px; text-align:left; }
td { padding:9px 12px; border-bottom:1px solid #f1f5f9; }
tr:nth-child(even) { background:#f8fafc; }
.badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; }
.alert { border-radius:10px; padding:12px 14px; margin-bottom:8px; color:white; }
.impact-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:24px; }
.impact { background:#f8fafc; border-radius:10px; padding:14px; text-align:center; }
.footer { margin-top:32px; text-align:center; font-size:10px; color:#94a3b8; padding-top:10px; border-top:1px solid #e2e8f0; }
@media print { body { padding:20px; } }
</style></head><body>
<h1>🧮 Simulador Presupuestal — FDL Usme</h1>
<div class="sub">Generado el ${fecha} · Datos reales del CRP · XBOG Technologies</div>

<div class="kpi-grid">
  <div class="kpi" style="background:#eff6ff;border:2px solid #bfdbfe">
    <div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:6px">PRESUPUESTO BASE</div>
    <div style="font-size:20px;font-weight:900;color:#1d4ed8">${fmtCOP(totalBase*1e6)}</div>
  </div>
  <div class="kpi" style="background:${totalReasignado>=0?'#f0fdf4':'#fef2f2'};border:2px solid ${totalReasignado>=0?'#bbf7d0':'#fecaca'}">
    <div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:6px">FONDO ACTUALIZADO</div>
    <div style="font-size:20px;font-weight:900;color:${totalReasignado>=0?'#16a34a':'#dc2626'}">${fmtCOP(totalSimulado*1e6)}</div>
  </div>
  <div class="kpi" style="background:${totalReasignado>=0?'#f0fdf4':'#fef2f2'};border:2px solid ${totalReasignado>=0?'#bbf7d0':'#fecaca'}">
    <div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:6px">TOTAL REASIGNADO</div>
    <div style="font-size:20px;font-weight:900;color:${totalReasignado>=0?'#16a34a':'#dc2626'}">${totalReasignado>=0?'+':''}${totalReasignado.toFixed(1)}%</div>
  </div>
</div>

${alertas.length > 0 ? `
<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">⚠️ Alertas de Riesgo</h3>
${alertas.map(a => `<div class="alert" style="background:${a.color}">
  <strong>${a.titulo}</strong><br/><span style="font-size:11px;opacity:.9">${a.detalle}</span>
</div>`).join('')}
<div style="margin-bottom:20px"></div>` : ''}

<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">Ajustes por Rubro</h3>
<table><thead><tr><th>Rubro</th><th>Ejec. Real</th><th>Base</th><th>Simulado</th><th>Ajuste</th></tr></thead>
<tbody>
${simulado.map(s => {
  const val = ajustesActuales[s.key] || 0;
  return `<tr>
    <td><strong>${s.nombreCompleto}</strong></td>
    <td>${s.ejecucion.toFixed(1)}%</td>
    <td>${fmtCOP(s.base*1e6)}</td>
    <td style="font-weight:700;color:${val>=0?'#16a34a':'#dc2626'}">${fmtCOP(s.simulado*1e6)}</td>
    <td><span class="badge" style="background:${val>=0?'#d1fae5':'#fee2e2'};color:${val>=0?'#065f46':'#991b1b'}">${val>=0?'+':''}${val}%</span></td>
  </tr>`;
}).join('')}
<tr style="background:#f1f5f9;font-weight:700">
  <td colspan="2">TOTAL</td>
  <td>${fmtCOP(totalBase*1e6)}</td>
  <td style="color:${totalReasignado>=0?'#16a34a':'#dc2626'}">${fmtCOP(totalSimulado*1e6)}</td>
  <td><span class="badge" style="background:${totalReasignado>=0?'#d1fae5':'#fee2e2'};color:${totalReasignado>=0?'#065f46':'#991b1b'}">${totalReasignado>=0?'+':''}${totalReasignado.toFixed(1)}%</span></td>
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

<h3 style="font-size:13px;font-weight:700;margin-bottom:10px">Impacto Social Estimado</h3>
<div class="impact-grid">
  <div class="impact"><div style="font-size:24px">🏠</div><div style="font-size:11px;color:#64748b;margin-top:4px">Nuevas Aulas</div><div style="font-size:20px;font-weight:900;color:#2563eb">+${Math.max(0, Math.round(((ajustesActuales[sectoresBase.find(s=>s.nombreCompleto.toLowerCase().includes('educ'))?.key||'']||0)+5)*1.5))}</div></div>
  <div class="impact"><div style="font-size:24px">🏥</div><div style="font-size:11px;color:#64748b;margin-top:4px">Camas Hospitalarias</div><div style="font-size:20px;font-weight:900;color:#0ea5e9">+${Math.max(0, Math.round(((ajustesActuales[sectoresBase.find(s=>s.nombreCompleto.toLowerCase().includes('salud'))?.key||'']||0)+8)*6.25))}</div></div>
  <div class="impact"><div style="font-size:24px">🎭</div><div style="font-size:11px;color:#64748b;margin-top:4px">Eventos Culturales</div><div style="font-size:20px;font-weight:900;color:#dc2626">+${Math.max(0, Math.round(((ajustesActuales[sectoresBase.find(s=>s.nombreCompleto.toLowerCase().includes('cultura'))?.key||'']||0)+6)*1.3))}</div></div>
</div>

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
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 via-blue-400 to-pink-400 flex items-center justify-center text-xl">
              🧮
            </div>
            <h2 className="text-white font-extrabold text-lg tracking-wide">SIMULADOR PRESUPUESTAL</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={resetear} className="text-xs text-blue-200 hover:text-white border border-white/20 rounded-lg px-3 py-1.5">
              Resetear
            </button>
            <button onClick={exportarPDF} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors">
              <Download className="w-3.5 h-3.5"/> Exportar PDF
            </button>
          </div>
        </div>
        <div className="flex border-t border-white/10 px-5">
          {TABS.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${tab===t.key?'text-white border-blue-400':'text-blue-200/60 border-transparent hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: REASIGNACIÓN */}
      {tab === 'reasignacion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AJUSTE DE PRESUPUESTO */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4">Ajuste de Presupuesto</h3>
            <div className="space-y-5">
              {sectoresBase.map(sector => {
                const val = ajustesActuales[sector.key] || 0;
                const Icon = sector.Icon;
                return (
                  <div key={sector.key} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{background: sector.color}}>
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
                    <div className="w-16 text-right font-extrabold text-sm flex-shrink-0"
                      style={{color: val>0?'#16a34a':val<0?'#dc2626':'#64748b'}}>
                      {val>0?'+':''}{val}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RESUMEN */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base mb-4">Resumen</h3>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Total Reasignado:</span>
                <span className="text-xl font-extrabold" style={{color: totalReasignado>=0?'#16a34a':'#dc2626'}}>
                  {totalReasignado>=0?'+':''}{totalReasignado.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-500">Fondo Actualizado:</span>
                <span className="text-xl font-extrabold text-blue-700">{fmtCOP(totalSimulado * 1e6)}</span>
              </div>
              <button className="w-full mt-2 bg-gradient-to-r from-blue-700 to-blue-900 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
                Simular Cambio
              </button>
            </div>

            {/* ALERTAS */}
            <div className="bg-white rounded-xl p-5 shadow-sm flex-1">
              <h3 className="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500"/> Alertas de Riesgo
              </h3>
              <div className="space-y-2">
                {alertas.length === 0 && (
                  <div className="text-sm text-slate-400 py-4 text-center">Sin alertas — los ajustes están dentro de rangos seguros</div>
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
      {(tab === 'proyeccion' || tab === 'reasignacion') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4">Proyección Financiera a 3 Años</h3>
            <ResponsiveContainer width="100%" height={260}>
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
            <h3 className="font-bold text-slate-800 text-base mb-4">Comparativa de Escenarios</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comparativa}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{fontSize:10}}/>
                <YAxis domain={[80,100]} tickFormatter={v=>v+'%'} tick={{fontSize:10}}/>
                <Tooltip formatter={(v:any)=>(v as number).toFixed(1)+'%'}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="Actual" fill="#2563eb" radius={[3,3,0,0]}/>
                <Bar dataKey="Simulado" fill="#16a34a" radius={[3,3,0,0]}/>
                <Bar dataKey="Oposicion" fill="#f59e0b" radius={[3,3,0,0]} name="Oposición"/>
                <Bar dataKey="Base" fill="#8b5cf6" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* IMPACTO SOCIAL - siempre visible al final como en la referencia */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 text-base mb-4">Impacto Social Estimado</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon:'🏠', label:'Nuevas Aulas',        val: Math.max(0, Math.round(((ajustesActuales[sectoresBase.find(s=>s.nombreCompleto.toLowerCase().includes('educ'))?.key||'']||0)+5)*1.5)), color:'#2563eb' },
            { icon:'🏥', label:'Camas Hospitalarias',  val: Math.max(0, Math.round(((ajustesActuales[sectoresBase.find(s=>s.nombreCompleto.toLowerCase().includes('salud'))?.key||'']||0)+8)*6.25)), color:'#0ea5e9' },
            { icon:'🎭', label:'Eventos Culturales',   val: Math.max(0, Math.round(((ajustesActuales[sectoresBase.find(s=>s.nombreCompleto.toLowerCase().includes('cultura'))?.key||'']||0)+6)*1.3)), color:'#dc2626' },
          ].map((m,i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{background:m.color+'22'}}>
                {m.icon}
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold">{m.label}</div>
                <div className="text-2xl font-extrabold" style={{color:m.color}}>+{m.val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
