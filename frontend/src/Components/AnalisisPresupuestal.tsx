import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import AnomaliasCRP from './AnomaliasCRP';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import { Upload, Filter, X, TrendingUp, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

interface DataRow { [key: string]: string | number; }

const COLORS = ['#5dade2','#1abc9c','#e74c3c','#e67e22','#9b59b6','#f1c40f','#3498db','#2ecc71','#e91e63','#ff5722'];

const fmtCOP = (v: number) => {
  if (v >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v/1e3).toFixed(0) + 'K';
  return '$' + v.toLocaleString('es-CO');
};

const fmtFull = (v: number) =>
  new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);

// Convierte cualquier valor a número
const toNum = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

// Busca el valor de una columna probando múltiples nombres posibles
const gc = (row: DataRow, variants: string[]): any => {
  for (const k of variants) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return '';
};

// Definición de columnas con múltiples variantes para manejar diferencias SAP/Excel
const COLS = {
  valorCRP:     ['Valor CRP'],
  valorNeto:    ['Valor Neto'],
  giro:         ['Autorizacion giro', 'Autorización giro', 'Autorizacion Giro', 'Autorización Giro', 'Autorizacion_giro'],
  sinGiro:      ['Com.Sin.Aut.Giro', 'Com. Sin. Aut. Giro', 'ComSinAutGiro', 'Com Sin Aut Giro'],
  anulaciones:  ['Anulaciones'],
  reintegros:   ['Reintegros'],
  ejecucion:    ['EJECUCION %', 'Ejecucion %', 'EJECUCIÓN %', 'Ejecución %', 'Ejecucion%', 'EJECUCION%'],
  tipo:         ['Tipo de compromiso', 'Tipo de Compromiso', 'Tipo Compromiso'],
  modalidad:    ['Descripcion Mod. Selec', 'Descripción Mod. Selec', 'Descripcion Mod Selec', 'Descripción Mod Selec', 'Modalidad de selección', 'Modalidad'],
  beneficiario: ['Nombre BP Beneficiario', 'Nombre Beneficiario', 'NombreBP', 'Nombre BP'],
  rubro:        ['Descripción del Rubro', 'Descripcion del Rubro', 'Descripción Rubro', 'Descripcion Rubro'],
  noComp:       ['No. Compromiso', 'No.Compromiso', 'Numero Compromiso', 'N° Compromiso'],
};

const AnalisisPresupuestal: React.FC = () => {
  const [data, setData]           = useState<DataRow[]>([]);
  const [fileName, setFileName]   = useState('');
  const [filters, setFilters]     = useState<Record<string,string>>({});
  const [busqueda, setBusqueda]   = useState('');
  const [activeTab, setActiveTab] = useState<'resumen'|'graficas'|'detalle'|'anomalias'>('resumen');
  const [pagina, setPagina]       = useState(1);
  const POR_PAGINA = 12;

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws) as DataRow[];
      // Debug: ver columnas reales en consola del navegador
      if (json.length > 0) console.log('COLUMNAS CRP:', Object.keys(json[0]));
      setData(json);
      setFilters({});
      setBusqueda('');
      setPagina(1);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const uniq = (variants: string[]) =>
    Array.from(new Set(data.map(r => String(gc(r, variants)||'')).filter(Boolean))).sort();

  const filtrado = useMemo(() => {
    let f = data;
    if (filters['tipo'] && filters['tipo'] !== 'Todos')
      f = f.filter(r => String(gc(r, COLS.tipo)||'') === filters['tipo']);
    if (filters['modalidad'] && filters['modalidad'] !== 'Todos')
      f = f.filter(r => String(gc(r, COLS.modalidad)||'') === filters['modalidad']);
    if (filters['rubro'] && filters['rubro'] !== 'Todos')
      f = f.filter(r => String(gc(r, COLS.rubro)||'') === filters['rubro']);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      f = f.filter(r =>
        String(gc(r, COLS.beneficiario)||'').toLowerCase().includes(q) ||
        String(gc(r, COLS.noComp)||'').toLowerCase().includes(q) ||
        String(gc(r, COLS.rubro)||'').toLowerCase().includes(q) ||
        String(gc(r, COLS.modalidad)||'').toLowerCase().includes(q)
      );
    }
    return f;
  }, [data, filters, busqueda]);

  const kpis = useMemo(() => {
    const valorCRP    = filtrado.reduce((s,r) => s + toNum(gc(r, COLS.valorCRP)), 0);
    const valorNeto   = filtrado.reduce((s,r) => s + toNum(gc(r, COLS.valorNeto)), 0);
    const giro        = filtrado.reduce((s,r) => s + toNum(gc(r, COLS.giro)), 0);
    const sinGiro     = filtrado.reduce((s,r) => s + toNum(gc(r, COLS.sinGiro)), 0);
    const anulaciones = filtrado.reduce((s,r) => s + toNum(gc(r, COLS.anulaciones)), 0);
    const pctEjec     = valorCRP > 0 ? (giro/valorCRP)*100 : 0;
    return { valorCRP, valorNeto, giro, sinGiro, anulaciones, pctEjec, total: filtrado.length };
  }, [filtrado]);

  const byTipo = useMemo(() => {
    const g: Record<string,number> = {};
    filtrado.forEach(r => {
      const k = String(gc(r, COLS.tipo)||'Sin clasificar');
      g[k] = (g[k]||0) + toNum(gc(r, COLS.valorNeto));
    });
    return Object.entries(g).map(([name,value])=>({name:name.length>22?name.slice(0,22)+'…':name,value}))
      .sort((a,b)=>b.value-a.value).slice(0,7);
  }, [filtrado]);

  const byModalidad = useMemo(() => {
    const g: Record<string,number> = {};
    filtrado.forEach(r => {
      const k = String(gc(r, COLS.modalidad)||'Sin clasificar');
      g[k] = (g[k]||0) + toNum(gc(r, COLS.valorNeto));
    });
    return Object.entries(g).map(([name,value])=>({name:name.length>22?name.slice(0,22)+'…':name,value}))
      .sort((a,b)=>b.value-a.value).slice(0,6);
  }, [filtrado]);

  const byBeneficiario = useMemo(() => {
    const g: Record<string,number> = {};
    filtrado.forEach(r => {
      const k = String(gc(r, COLS.beneficiario)||'Sin clasificar');
      g[k] = (g[k]||0) + toNum(gc(r, COLS.valorNeto));
    });
    return Object.entries(g).map(([name,value])=>({name:name.length>24?name.slice(0,24)+'…':name,value}))
      .sort((a,b)=>b.value-a.value).slice(0,8);
  }, [filtrado]);

  const byRubro = useMemo(() => {
    const g: Record<string,{valor:number,ejec:number,cnt:number}> = {};
    filtrado.forEach(r => {
      const k = String(gc(r, COLS.rubro)||'Sin clasificar');
      if (!g[k]) g[k] = {valor:0, ejec:0, cnt:0};
      g[k].valor += toNum(gc(r, COLS.valorNeto));
      g[k].ejec  += toNum(gc(r, COLS.ejecucion));
      g[k].cnt   += 1;
    });
    return Object.entries(g).map(([name,d])=>({
      name: name.length>28?name.slice(0,28)+'…':name,
      valor: d.valor,
      ejec: parseFloat(((d.ejec/d.cnt)*100).toFixed(1))
    })).sort((a,b)=>b.valor-a.valor).slice(0,8);
  }, [filtrado]);

  const totalPag = Math.ceil(filtrado.length/POR_PAGINA);
  const pageData = filtrado.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA);

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-6">
      <div className="bg-gradient-to-br from-slate-700 to-blue-900 rounded-2xl p-10 text-center text-white max-w-md shadow-2xl">
        <div className="text-6xl mb-4">📂</div>
        <h2 className="text-2xl font-bold mb-2">Análisis Presupuestal CRP</h2>
        <p className="text-slate-300 text-sm mb-6">Carga el reporte Excel exportado de SAP para visualizar el análisis completo con filtros dinámicos y gráficas interactivas.</p>
        <label className="inline-flex items-center gap-3 bg-blue-500 hover:bg-blue-400 transition-colors px-6 py-3 rounded-xl cursor-pointer font-semibold text-sm shadow-lg">
          <Upload className="w-5 h-5" />
          Cargar archivo Excel (.xlsx)
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        </label>
        <p className="text-slate-400 text-xs mt-3">Formatos: .xlsx, .xls</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl p-4 text-white flex items-center justify-between shadow-lg">
        <div>
          <h2 className="text-lg font-bold">📊 Reporte CRP — FDL Usme 2026</h2>
          <p className="text-slate-300 text-xs mt-1">📁 {fileName} · {data.length} registros · {filtrado.length} filtrados</p>
        </div>
        <label className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-colors">
          <Upload className="w-4 h-4" /> Cambiar archivo
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {([
          { label:'Valor CRP Total',   val:kpis.valorCRP,    color:'#5dade2', icon:<DollarSign className="w-4 h-4"/> },
          { label:'Valor Neto',        val:kpis.valorNeto,   color:'#1abc9c', icon:<TrendingUp className="w-4 h-4"/> },
          { label:'Autorización Giro', val:kpis.giro,        color:'#27ae60', icon:<CheckCircle className="w-4 h-4"/> },
          { label:'Sin Autorizar',     val:kpis.sinGiro,     color:'#e74c3c', icon:<AlertCircle className="w-4 h-4"/> },
          { label:'Anulaciones',       val:kpis.anulaciones, color:'#e67e22', icon:<X className="w-4 h-4"/> },
        ] as any[]).map((k:any) => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm" style={{borderTop:`3px solid ${k.color}`}}>
            <div className="flex items-center gap-2 mb-1" style={{color:k.color}}>{k.icon}<span className="text-xs text-slate-500">{k.label}</span></div>
            <div className="text-lg font-bold" style={{color:k.color}}>{fmtCOP(k.val)}</div>
            <div className="mt-2 bg-slate-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full" style={{background:k.color,width:Math.min((k.val/(kpis.valorCRP||1))*100,100)+'%'}}/>
            </div>
          </div>
        ))}
      </div>

      {/* BARRA EJECUCIÓN */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-slate-700 text-sm">Nivel de Ejecución — Giro / CRP Total</span>
          <span className="text-2xl font-black" style={{color:kpis.pctEjec>=70?'#1abc9c':kpis.pctEjec>=40?'#e67e22':'#e74c3c'}}>
            {kpis.pctEjec.toFixed(1)}%
          </span>
        </div>
        <div className="bg-slate-100 rounded-full h-4">
          <div className="h-4 rounded-full transition-all duration-700"
            style={{background:kpis.pctEjec>=70?'#1abc9c':kpis.pctEjec>=40?'#e67e22':'#e74c3c',width:Math.min(kpis.pctEjec,100)+'%'}}/>
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>Girado: {fmtFull(kpis.giro)}</span>
          <span>CRP Total: {fmtFull(kpis.valorCRP)}</span>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-slate-700 flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-500"/>Filtros
          </span>
          {(Object.values(filters).some(v=>v&&v!=='Todos')||busqueda) && (
            <button onClick={()=>{setFilters({});setBusqueda('');}}
              className="text-xs flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-lg hover:bg-red-100">
              <X className="w-3 h-3"/>Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)}
            placeholder="🔍 Buscar beneficiario, contrato..."
            className="col-span-2 lg:col-span-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"/>
          {([
            { key:'tipo',      label:'Tipo Compromiso', variants:COLS.tipo },
            { key:'modalidad', label:'Modalidad',       variants:COLS.modalidad },
            { key:'rubro',     label:'Rubro',           variants:COLS.rubro },
          ] as any[]).map((fc:any) => (
            <select key={fc.key} value={filters[fc.key]||'Todos'}
              onChange={e=>setFilters(p=>({...p,[fc.key]:e.target.value}))}
              className="border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white">
              <option value="Todos">{fc.label}: Todos</option>
              {uniq(fc.variants).slice(0,80).map((v:string)=>(
                <option key={v} value={v}>{v.length>35?v.slice(0,35)+'…':v}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {([['resumen','📈 Resumen'],['graficas','📊 Gráficas'],['detalle','📋 Detalle'],['anomalias','🚨 Anomalías']] as const).map(([k,l])=>(
            <button key={k} onClick={()=>setActiveTab(k)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab===k?'text-blue-600 border-b-2 border-blue-600 bg-blue-50':'text-slate-500 hover:text-slate-700'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* RESUMEN */}
          {activeTab==='resumen' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-3">Distribución por Tipo de Compromiso</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={byTipo} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={2}>
                      {byTipo.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v:any)=>fmtFull(v)}/>
                    <Legend iconSize={10} wrapperStyle={{fontSize:11}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-3">Valor por Modalidad de Selección</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byModalidad} layout="vertical" margin={{left:10}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis type="number" tickFormatter={fmtCOP} tick={{fontSize:10}}/>
                    <YAxis dataKey="name" type="category" width={140} tick={{fontSize:10}}/>
                    <Tooltip formatter={(v:any)=>fmtFull(v)}/>
                    <Bar dataKey="value" radius={[0,4,4,0]}>
                      {byModalidad.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="lg:col-span-2">
                <h4 className="font-bold text-slate-700 text-sm mb-3">Top Rubros — Valor Neto vs % Ejecución</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byRubro} margin={{bottom:20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{fontSize:10}} height={60}/>
                    <YAxis yAxisId="left" tickFormatter={fmtCOP} tick={{fontSize:10}}/>
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v=>v+'%'} tick={{fontSize:10}}/>
                    <Tooltip formatter={(v:any,n:any)=>n==='ejec'?v+'%':fmtFull(v)}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Bar yAxisId="left" dataKey="valor" name="Valor Neto" fill="#5dade2" radius={[4,4,0,0]}/>
                    <Bar yAxisId="right" dataKey="ejec" name="Ejec%" fill="#1abc9c" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* GRÁFICAS */}
          {activeTab==='graficas' && (
            <div className="grid grid-cols-1 gap-5">
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-3">Top 8 Beneficiarios por Valor Neto</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byBeneficiario} layout="vertical" margin={{left:20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis type="number" tickFormatter={fmtCOP} tick={{fontSize:10}}/>
                    <YAxis dataKey="name" type="category" width={190} tick={{fontSize:10}}/>
                    <Tooltip formatter={(v:any)=>fmtFull(v)}/>
                    <Bar dataKey="value" radius={[0,4,4,0]}>
                      {byBeneficiario.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-3">% Ejecución por Rubro</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={byRubro} margin={{bottom:20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{fontSize:10}} height={60}/>
                    <YAxis tickFormatter={v=>v+'%'} tick={{fontSize:10}}/>
                    <Tooltip formatter={(v:any)=>v+'%'}/>
                    <Line type="monotone" dataKey="ejec" stroke="#1abc9c" strokeWidth={2}
                      dot={{fill:'#1abc9c',r:4}} name="Ejecución %"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* DETALLE */}
          {activeTab==='detalle' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-slate-700 text-sm">
                  {filtrado.length} registros · Página {pagina} de {totalPag||1}
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      {['No. Compromiso','Beneficiario','Tipo','Modalidad','Rubro','Valor CRP','Valor Neto','Giro','Ejec%'].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                     
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((r,i)=>{
                      const ejec = toNum(gc(r, COLS.ejecucion))*100;
                      const ec = ejec>=100?'#1abc9c':ejec>0?'#e67e22':'#e74c3c';
                      const mod = String(gc(r, COLS.modalidad)||'');
                      const modColor = mod.includes('LICITACIÓN')||mod.includes('LICITACION')
                        ? {bg:'#fde8e8',tx:'#c0392b'}
                        : mod.includes('DIRECTA')
                        ? {bg:'#dbeafe',tx:'#1d4ed8'}
                        : {bg:'#d1fae5',tx:'#065f46'};
                      return (
                        <tr key={i} className={i%2===0?'bg-white':'bg-slate-50'}>
                          <td className="px-3 py-2 font-semibold text-blue-600 whitespace-nowrap">
                            {String(gc(r, COLS.noComp)||'')}
                          </td>
                          <td className="px-3 py-2 max-w-36 truncate" title={String(gc(r, COLS.beneficiario)||'')}>
                            {String(gc(r, COLS.beneficiario)||'')}
                          </td>
                          <td className="px-3 py-2 max-w-28 truncate text-slate-600">
                            {String(gc(r, COLS.tipo)||'')}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                              style={{background:modColor.bg,color:modColor.tx}}>
                              {mod.slice(0,16)}
                            </span>
                          </td>
                          <td className="px-3 py-2 max-w-32 truncate text-slate-500 text-xs">
                            {String(gc(r, COLS.rubro)||'').slice(0,28)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                            {fmtCOP(toNum(gc(r, COLS.valorCRP)))}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-green-600">
                            {fmtCOP(toNum(gc(r, COLS.valorNeto)))}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {fmtCOP(toNum(gc(r, COLS.giro)))}
                          </td>
                          <td className="px-3 py-2 min-w-20">
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full"
                                  style={{background:ec,width:Math.min(ejec,100)+'%'}}/>
                              </div>
                              <span className="text-xs font-bold whitespace-nowrap" style={{color:ec}}>
                                {ejec.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {pageData.length===0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-slate-400">
                          No hay registros con los filtros aplicados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPag > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={()=>setPagina(1)} disabled={pagina===1}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50">«</button>
                  <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagina===1}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50">‹</button>
                  {Array.from({length:Math.min(5,totalPag)},(_,i)=>{
                    const p = Math.max(1,Math.min(pagina-2+i,totalPag));
                    return (
                      <button key={p} onClick={()=>setPagina(p)}
                        className={`px-3 py-1.5 border rounded-lg text-sm font-semibold ${pagina===p?'bg-slate-800 text-white border-slate-800':'hover:bg-slate-50'}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={()=>setPagina(p=>Math.min(totalPag,p+1))} disabled={pagina===totalPag}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50">›</button>
                  <button onClick={()=>setPagina(totalPag)} disabled={pagina===totalPag}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50">»</button>
                </div>
              )}
            </div>
          )} 
          {activeTab==='anomalias' && <AnomaliasCRP data={filtrado ?? []} />}
        </div>
      </div>
    </div>
  );
};

export default AnalisisPresupuestal;
