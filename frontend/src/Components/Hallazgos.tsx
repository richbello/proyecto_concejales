import React, { useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

const C = {
  navy:"#1B3A6B", cyan:"#00AEEF", verde:"#10b981", amar:"#f59e0b",
  rojo:"#ef4444", muted:"#64748b", bg:"#f1f5f9", border:"#e2e8f0",
  violet:"#8b5cf6", teal:"#14b8a6", orange:"#f97316"
};
const PAL = [C.rojo,C.orange,C.amar,C.cyan,C.verde,C.violet,C.teal,"#0984e3","#00b894","#6366f1"];

interface DataRow { [key: string]: any; }
interface Props { data?: DataRow[]; }

const fmtMxx = (v:number):string => '$'+(v/1e6).toLocaleString('es-CO',{minimumFractionDigits:1,maximumFractionDigits:1})+'M';
const fmtFull = (v:number):string => '$'+Math.round(v).toLocaleString('es-CO');

// Extrae año del No. Compromiso (XXX-2021 → 2021). Solo acepta años 2010-2026.
const extraerVigencia = (noComp:string):number => {
  const s = String(noComp).trim();
  // Buscar patrón -AAAA donde AAAA es un año válido
  const matches = s.match(/(20[0-2]\d)/g);
  if (matches) {
    // Tomar el primer año válido entre 2010 y 2026
    for (const m of matches) {
      const año = parseInt(m);
      if (año >= 2010 && año <= 2026) return año;
    }
  }
  return 0; // No se pudo extraer → usar fallback (columna Vigencia del reporte)
};

const gc = (r:DataRow, nombres:string[]):any => {
  for (const n of nombres) {
    const nk = n.toLowerCase().replace(/[^a-z0-9]/g,'');
    for (const k of Object.keys(r)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g,'') === nk) return r[k];
    }
  }
  return '';
};
const toNum = (v:any):number => {
  if (v==null||v==='') return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g,''));
  return isNaN(n)?0:n;
};


// Tooltip para gráfica de Vigencia (muestra año + antigüedad + CRP + saldo)
const TTVigencia = ({active, payload}: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{background:'#fff',border:`2px solid ${C.navy}`,borderRadius:8,padding:'10px 14px',fontSize:12,boxShadow:'0 8px 24px rgba(27,58,107,.2)'}}>
      <div style={{fontWeight:800,color:C.navy,marginBottom:4,fontSize:14}}>Vigencia {d.vig}</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:6}}>Antigüedad: {d.años} {d.años===1?'año':'años'}</div>
      <div style={{color:C.rojo,fontWeight:700}}>{d.count} CRP sin girar</div>
      <div style={{color:C.navy,fontWeight:700}}>{fmtMxx(d.saldo)}</div>
    </div>
  );
};

// Tooltip para banda de riesgo
const TTBanda = ({active, payload}: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{background:'#fff',border:`2px solid ${d.color}`,borderRadius:8,padding:'10px 14px',fontSize:12,boxShadow:'0 8px 24px rgba(27,58,107,.2)'}}>
      <div style={{fontWeight:800,color:d.color,marginBottom:4,fontSize:13}}>{d.label}</div>
      <div style={{color:C.navy,fontWeight:700}}>{d.count} CRP · {fmtMxx(d.saldo)}</div>
    </div>
  );
};

// Tooltip para modalidad
const TTModalidad = ({active, payload}: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{background:'#fff',border:`2px solid ${C.navy}`,borderRadius:8,padding:'10px 14px',fontSize:12,boxShadow:'0 8px 24px rgba(27,58,107,.2)',maxWidth:280}}>
      <div style={{fontWeight:700,color:C.navy,marginBottom:4,fontSize:12}}>{d.modal}</div>
      <div style={{color:C.rojo,fontWeight:700}}>{d.count} CRP</div>
      <div style={{color:C.navy,fontWeight:700}}>{fmtMxx(d.saldo)}</div>
    </div>
  );
};

// Tooltip para beneficiarios (muestra los contratos específicos)
const TTBenef = ({active, payload}: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const contratos = d.contratos || [];
  return (
    <div style={{background:'#fff',border:`2px solid ${C.cyan}`,borderRadius:8,padding:'10px 14px',fontSize:12,boxShadow:'0 8px 24px rgba(27,58,107,.2)',maxWidth:340}}>
      <div style={{fontWeight:700,color:C.navy,marginBottom:4,fontSize:11}}>{d.benef}</div>
      <div style={{color:C.rojo,fontWeight:700,marginBottom:2}}>{d.count} CRP · {fmtMxx(d.saldo)}</div>
      <div style={{borderTop:`1px solid ${C.border}`,marginTop:6,paddingTop:6}}>
        <div style={{fontSize:9,color:C.muted,marginBottom:3,fontWeight:600}}>CONTRATOS:</div>
        {contratos.slice(0,8).map((c:any,i:number)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',gap:12,fontSize:10,padding:'1px 0'}}>
            <span style={{fontWeight:600,color:C.navy}}>{c.noComp} <span style={{color:C.muted,fontWeight:400}}>({c.vigencia})</span></span>
            <span style={{color:C.cyan,fontWeight:600}}>{fmtMxx(c.saldo)}</span>
          </div>
        ))}
        {contratos.length>8 && <div style={{fontSize:9,color:C.muted,marginTop:2}}>+{contratos.length-8} más...</div>}
      </div>
    </div>
  );
};

export default function Hallazgos({ data = [] }: Props) {
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState<'saldo'|'vigencia'>('vigencia');
  const [fBusqueda, setFBusqueda] = useState('');
  const [fVigencia, setFVigencia] = useState('Todas');
  const [fDoc, setFDoc] = useState('Todos');
  const [fRiesgo, setFRiesgo] = useState('Todos');
  const POR_PAG = 30;

  const crpCero = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((r:DataRow) => {
      const noComp = gc(r,['No. Compromiso','No Compromiso']);
      const valorCRP = toNum(gc(r,['Valor CRP']));
      const sinGiro = toNum(gc(r,['Com.Sin.Aut.Giro','Com Sin Aut Giro','Saldo sin girar']));
      const giro = toNum(gc(r,['Autorizacion giro','Autorización giro']));
      const saldo = sinGiro > 0 ? sinGiro : valorCRP;
      // Vigencia: 1° del No. Compromiso; 2° columna Vigencia; 3° año de Fecha Registro
      let vig = extraerVigencia(noComp);
      if (vig === 0) {
        const vigCol = toNum(gc(r,['Vigencia']));
        if (vigCol >= 2010 && vigCol <= 2026) vig = vigCol;
      }
      if (vig === 0) {
        const fechaStr = String(gc(r,['Fecha Registro']));
        const fm = fechaStr.match(/(20[0-2]\d)/);
        if (fm) vig = parseInt(fm[1]);
      }
      if (vig === 0) vig = 2026; // último recurso: asumir año actual (bajo riesgo)
      return {
        noComp,
        vigencia: vig,
        beneficiario: String(gc(r,['Nombre BP Beneficiario','Nombre Beneficiario'])),
        modalidad: String(gc(r,['Descripcion Mod. Selec','Descripción Mod. Selec'])),
        tipoDoc: String(gc(r,['Tipo Doc. BP Beneficiario','Tipo doc'])),
        fecha: String(gc(r,['Fecha Registro'])),
        valorCRP, saldo, giro
      };
    }).filter((r:any) => r.saldo > 0 && r.giro === 0)
      .sort((a:any,b:any) => a.vigencia - b.vigencia || b.saldo - a.saldo);
  }, [data]);

  // Clasificación por antigüedad del contrato (año del No. Compromiso)
  // Entre más antiguo el contrato sin girar, mayor el riesgo de fenecimiento/caducidad
  const getRiesgo = (a:number) => {
    if (a>=6) return {color:C.rojo,label:'CRÍTICO',bg:'#fef2f2'};    // 6+ años (2020 y antes)
    if (a>=4) return {color:C.orange,label:'ALTO',bg:'#fff7ed'};     // 4-5 años (2021-2022)
    if (a>=2) return {color:C.amar,label:'MEDIO',bg:'#fffbeb'};      // 2-3 años (2023-2024)
    if (a>=1) return {color:C.cyan,label:'BAJO',bg:'#f0f9ff'};       // 1 año (2025)
    return {color:C.verde,label:'VIGENTE',bg:'#f0fdf4'};             // 0 años (2026, este año)
  };

  const porVigencia = useMemo(() => {
    const g:any = {};
    crpCero.forEach((r:any) => {
      if(!g[r.vigencia]) g[r.vigencia]={vig:r.vigencia,count:0,saldo:0,años:2026-r.vigencia};
      g[r.vigencia].count++; g[r.vigencia].saldo+=r.saldo;
    });
    return Object.values(g).sort((a:any,b:any)=>a.vig-b.vig);
  }, [crpCero]);

  const porBanda = useMemo(() => {
    const bandas = [
      {label:'Crítico 6+ años',min:6,max:99,color:C.rojo},
      {label:'Alto 4-5 años',min:4,max:5,color:C.orange},
      {label:'Medio 2-3 años',min:2,max:3,color:C.amar},
      {label:'Reciente 1 año',min:1,max:1,color:C.cyan},
      {label:'Actual 0 años',min:0,max:0,color:C.verde},
    ];
    return bandas.map(b => {
      const items = crpCero.filter((r:any)=>{const a=2026-r.vigencia; return a>=b.min&&a<=b.max;});
      return {...b, count:items.length, saldo:items.reduce((s:number,r:any)=>s+r.saldo,0)};
    }).filter(b=>b.count>0);
  }, [crpCero]);

  const porModalidad = useMemo(() => {
    const g:any = {};
    crpCero.forEach((r:any) => {
      const m = r.modalidad || 'Sin dato';
      if(!g[m]) g[m]={modal:m,count:0,saldo:0};
      g[m].count++; g[m].saldo+=r.saldo;
    });
    return Object.values(g).sort((a:any,b:any)=>b.saldo-a.saldo);
  }, [crpCero]);

  const porTipoDoc = useMemo(() => {
    const g:any = {};
    crpCero.forEach((r:any) => {
      const t = r.tipoDoc || 'N/A';
      if(!g[t]) g[t]={tipo:t,count:0,saldo:0};
      g[t].count++; g[t].saldo+=r.saldo;
    });
    return Object.values(g).sort((a:any,b:any)=>b.saldo-a.saldo);
  }, [crpCero]);

  const topBenef = useMemo(() => {
    const g:any = {};
    crpCero.forEach((r:any) => {
      const b = r.beneficiario || 'Sin nombre';
      if(!g[b]) g[b]={benef:b,count:0,saldo:0,contratos:[]};
      g[b].count++; g[b].saldo+=r.saldo;
      g[b].contratos.push({noComp:r.noComp, vigencia:r.vigencia, saldo:r.saldo});
    });
    // Ordenar contratos de cada beneficiario por saldo desc
    Object.values(g).forEach((x:any)=>x.contratos.sort((a:any,b:any)=>b.saldo-a.saldo));
    return Object.values(g).sort((a:any,b:any)=>b.saldo-a.saldo).slice(0,10);
  }, [crpCero]);

  if (data.length === 0) {
    return <div style={{padding:40,textAlign:'center',color:C.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>📤</div>
      Carga un archivo CRP en <strong>1.1 Análisis Presupuestal</strong> para ver los hallazgos.
    </div>;
  }

  const totalSaldo = crpCero.reduce((s:number,r:any)=>s+r.saldo,0);
  const criticos = crpCero.filter((r:any)=>(2026-r.vigencia)>=6);
  const rezago2mas = crpCero.filter((r:any)=>(2026-r.vigencia)>=2);
  const criticoSaldo = criticos.reduce((s:number,r:any)=>s+r.saldo,0);
  const rezagoSaldo = rezago2mas.reduce((s:number,r:any)=>s+r.saldo,0);

  // Opciones únicas para los filtros
  const vigenciasUnicas = Array.from(new Set(crpCero.map((r:any)=>r.vigencia))).sort((a:any,b:any)=>a-b);
  const docsUnicos = Array.from(new Set(crpCero.map((r:any)=>r.tipoDoc).filter(Boolean)));

  // Aplicar filtros
  const filtrado = crpCero.filter((r:any) => {
    const años = 2026 - r.vigencia;
    const rg = getRiesgo(años).label;
    if (fVigencia !== 'Todas' && String(r.vigencia) !== fVigencia) return false;
    if (fDoc !== 'Todos' && r.tipoDoc !== fDoc) return false;
    if (fRiesgo !== 'Todos' && rg !== fRiesgo) return false;
    if (fBusqueda.trim()) {
      const q = fBusqueda.toLowerCase();
      const match = String(r.noComp).toLowerCase().includes(q) ||
                    String(r.beneficiario).toLowerCase().includes(q) ||
                    String(r.modalidad).toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const sortData = [...filtrado].sort((a:any,b:any) =>
    orden==='saldo' ? b.saldo-a.saldo : (a.vigencia-b.vigencia || b.saldo-a.saldo));
  const totalPag = Math.ceil(sortData.length/POR_PAG) || 1;
  const pageData = sortData.slice((pagina-1)*POR_PAG, pagina*POR_PAG);

  const hayFiltros = fBusqueda || fVigencia!=='Todas' || fDoc!=='Todos' || fRiesgo!=='Todos';
  const limpiarFiltros = () => { setFBusqueda(''); setFVigencia('Todas'); setFDoc('Todos'); setFRiesgo('Todos'); setPagina(1); };
  const saldoFiltrado = sortData.reduce((s:number,r:any)=>s+r.saldo,0);

  return (
    <div style={{padding:20,maxWidth:1440,margin:'0 auto',fontFamily:'Arial'}}>
      <h1 style={{color:C.navy,fontSize:22,margin:'0 0 4px 0'}}>📍 Hallazgos: CRP con 0% de Ejecución</h1>
      <p style={{color:C.muted,fontSize:12,margin:'0 0 20px 0'}}>
        <strong style={{color:C.rojo}}>{crpCero.length}</strong> compromisos sin girar · <strong style={{color:C.rojo}}>{fmtMxx(totalSaldo)}</strong> congelados sin autorización de giro
      </p>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        <div style={{background:C.rojo,color:'#fff',borderRadius:10,padding:14}}>
          <div style={{fontSize:11,opacity:.9}}>🔴 Crítico (6+ años)</div>
          <div style={{fontSize:24,fontWeight:800}}>{criticos.length}</div>
          <div style={{fontSize:12,fontWeight:600}}>{fmtMxx(criticoSaldo)}</div>
        </div>
        <div style={{background:C.orange,color:'#fff',borderRadius:10,padding:14}}>
          <div style={{fontSize:11,opacity:.9}}>⚠️ Rezago (2+ años)</div>
          <div style={{fontSize:24,fontWeight:800}}>{rezago2mas.length}</div>
          <div style={{fontSize:12,fontWeight:600}}>{fmtMxx(rezagoSaldo)}</div>
        </div>
        <div style={{background:C.cyan,color:'#fff',borderRadius:10,padding:14}}>
          <div style={{fontSize:11,opacity:.9}}>Mayor rezago antiguo</div>
          <div style={{fontSize:15,fontWeight:800}}>{crpCero[0]?.noComp}</div>
          <div style={{fontSize:12,fontWeight:600}}>{fmtMxx(crpCero[0]?.saldo||0)}</div>
        </div>
        <div style={{background:C.navy,color:'#fff',borderRadius:10,padding:14}}>
          <div style={{fontSize:11,opacity:.9}}>Total sin girar</div>
          <div style={{fontSize:20,fontWeight:800}}>{fmtMxx(totalSaldo)}</div>
          <div style={{fontSize:12,fontWeight:600}}>{crpCero.length} CRP</div>
        </div>
      </div>

      {/* Fila gráficas 1 */}
      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:16,marginBottom:16}}>
        <div style={{background:'#fff',borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>
          <h3 style={{color:C.navy,fontSize:13,fontWeight:700,margin:'0 0 12px 0'}}>Saldo sin girar por Vigencia</h3>
          <ResponsiveContainer width="99%" height={300}>
            <BarChart data={porVigencia} margin={{top:24,right:10,left:10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="vig" tick={{fontSize:11}}/>
              <YAxis tickFormatter={(v)=>'$'+(v/1e6).toFixed(0)+'M'} tick={{fontSize:10}} width={60}/>
              <Tooltip content={<TTVigencia/>} cursor={{fill:"rgba(0,174,239,.08)"}}/>
              <Bar dataKey="saldo" radius={[4,4,0,0]}>
                {porVigencia.map((d:any,i)=><Cell key={i} fill={getRiesgo(d.años).color}/>)}
                <LabelList dataKey="count" position="top" style={{fontSize:11,fill:C.navy,fontWeight:700}}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#fff',borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>
          <h3 style={{color:C.navy,fontSize:13,fontWeight:700,margin:'0 0 12px 0'}}>Distribución por Banda de Riesgo</h3>
          <ResponsiveContainer width="99%" height={300}>
            <PieChart>
              <Pie data={porBanda} dataKey="saldo" nameKey="label" cx="50%" cy="50%" outerRadius={95} innerRadius={50} label={({percent}:any)=>`${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {porBanda.map((b:any,i)=><Cell key={i} fill={b.color}/>)}
              </Pie>
              <Tooltip content={<TTBanda/>}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fila gráficas 2 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <div style={{background:'#fff',borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>
          <h3 style={{color:C.navy,fontSize:13,fontWeight:700,margin:'0 0 12px 0'}}>Por Modalidad de Selección</h3>
          <ResponsiveContainer width="99%" height={280}>
            <BarChart data={porModalidad} layout="vertical" margin={{top:4,right:60,left:4,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
              <XAxis type="number" tickFormatter={(v)=>'$'+(v/1e6).toFixed(0)+'M'} tick={{fontSize:9}}/>
              <YAxis type="category" dataKey="modal" width={150} tick={{fontSize:9}}/>
              <Tooltip content={<TTModalidad/>} cursor={{fill:"rgba(0,174,239,.08)"}}/>
              <Bar dataKey="saldo" radius={[0,4,4,0]}>
                {porModalidad.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                <LabelList dataKey="count" position="right" style={{fontSize:9,fill:C.muted,fontWeight:600}}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#fff',borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>
          <h3 style={{color:C.navy,fontSize:13,fontWeight:700,margin:'0 0 12px 0'}}>Top 10 Beneficiarios (saldo sin girar)</h3>
          <ResponsiveContainer width="99%" height={280}>
            <BarChart data={topBenef} layout="vertical" margin={{top:4,right:60,left:4,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
              <XAxis type="number" tickFormatter={(v)=>'$'+(v/1e6).toFixed(0)+'M'} tick={{fontSize:9}}/>
              <YAxis type="category" dataKey="benef" width={140} tick={{fontSize:8}} tickFormatter={(v)=>String(v).substring(0,24)}/>
              <Tooltip content={<TTBenef/>} cursor={{fill:"rgba(0,174,239,.08)"}}/>
              <Bar dataKey="saldo" fill={C.cyan} radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLA COMPLETA */}
      <div style={{background:'#fff',borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <h3 style={{color:C.navy,fontSize:13,fontWeight:700,margin:0}}>
            Detalle · <span style={{color:C.cyan}}>{sortData.length}</span> de {crpCero.length} CRP {hayFiltros && <span style={{color:C.muted,fontWeight:400,fontSize:11}}>({fmtMxx(saldoFiltrado)})</span>}
          </h3>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:11,color:C.muted}}>Ordenar:</span>
            <button onClick={()=>{setOrden('vigencia');setPagina(1);}} style={{fontSize:10,padding:'4px 10px',borderRadius:6,border:`1px solid ${orden==='vigencia'?C.cyan:C.border}`,background:orden==='vigencia'?C.cyan:'#fff',color:orden==='vigencia'?'#fff':C.navy,cursor:'pointer',fontWeight:600}}>Antigüedad</button>
            <button onClick={()=>{setOrden('saldo');setPagina(1);}} style={{fontSize:10,padding:'4px 10px',borderRadius:6,border:`1px solid ${orden==='saldo'?C.cyan:C.border}`,background:orden==='saldo'?C.cyan:'#fff',color:orden==='saldo'?'#fff':C.navy,cursor:'pointer',fontWeight:600}}>Mayor saldo</button>
          </div>
        </div>

        {/* FILTROS */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1.3fr auto',gap:8,marginBottom:14,padding:12,background:C.bg,borderRadius:8}}>
          <input value={fBusqueda} onChange={e=>{setFBusqueda(e.target.value);setPagina(1);}}
            placeholder="🔎 No. Compromiso, beneficiario, modalidad..."
            style={{fontSize:11,padding:'8px 12px',borderRadius:6,border:`1.5px solid ${fBusqueda?C.cyan:C.border}`,outline:'none',color:C.navy}}/>
          <select value={fVigencia} onChange={e=>{setFVigencia(e.target.value);setPagina(1);}}
            style={{fontSize:11,padding:'8px 10px',borderRadius:6,border:`1.5px solid ${fVigencia!=='Todas'?C.amar:C.border}`,background:'#fff',color:C.navy}}>
            <option value="Todas">Vigencia: Todas</option>
            {vigenciasUnicas.map((v:any)=><option key={v} value={String(v)}>{v} ({2026-v} años)</option>)}
          </select>
          <select value={fDoc} onChange={e=>{setFDoc(e.target.value);setPagina(1);}}
            style={{fontSize:11,padding:'8px 10px',borderRadius:6,border:`1.5px solid ${fDoc!=='Todos'?C.amar:C.border}`,background:'#fff',color:C.navy}}>
            <option value="Todos">Doc: Todos</option>
            {docsUnicos.map((d:any)=><option key={d} value={d}>{d}</option>)}
          </select>
          <select value={fRiesgo} onChange={e=>{setFRiesgo(e.target.value);setPagina(1);}}
            style={{fontSize:11,padding:'8px 10px',borderRadius:6,border:`1.5px solid ${fRiesgo!=='Todos'?C.amar:C.border}`,background:'#fff',color:C.navy}}>
            <option value="Todos">Riesgo: Todos</option>
            <option value="CRÍTICO">🔴 Crítico (6+ años)</option>
            <option value="ALTO">🟠 Alto (4-5 años)</option>
            <option value="MEDIO">🟡 Medio (2-3 años)</option>
            <option value="BAJO">🔵 Bajo (2025)</option>
            <option value="VIGENTE">🟢 Vigente (2026)</option>
          </select>
          {hayFiltros ? (
            <button onClick={limpiarFiltros} style={{fontSize:10,padding:'8px 14px',borderRadius:6,border:'none',background:'#fee2e2',color:C.rojo,cursor:'pointer',fontWeight:700,whiteSpace:'nowrap'}}>✕ Limpiar</button>
          ) : <div/>}
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',fontSize:10,borderCollapse:'collapse'}}>
            <thead>
              <tr style={{backgroundColor:C.navy,color:'#fff'}}>
                <th style={{padding:'8px',textAlign:'left'}}>No. Compromiso</th>
                <th style={{padding:'8px',textAlign:'center'}}>Vig.</th>
                <th style={{padding:'8px',textAlign:'center'}}>Años</th>
                <th style={{padding:'8px',textAlign:'left'}}>Beneficiario</th>
                <th style={{padding:'8px',textAlign:'left'}}>Modalidad</th>
                <th style={{padding:'8px',textAlign:'center'}}>Doc</th>
                <th style={{padding:'8px',textAlign:'right'}}>Saldo sin girar</th>
                <th style={{padding:'8px',textAlign:'center'}}>Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r:any,i:number) => {
                const años = 2026-r.vigencia;
                const rg = getRiesgo(años);
                return (
                  <tr key={i} style={{borderBottom:`1px solid ${C.border}`,backgroundColor:rg.bg}}>
                    <td style={{padding:'7px 8px',fontWeight:700,color:rg.color}}>{r.noComp}</td>
                    <td style={{padding:'7px 8px',textAlign:'center',fontWeight:600}}>{r.vigencia}</td>
                    <td style={{padding:'7px 8px',textAlign:'center',fontWeight:700,color:rg.color}}>{años}</td>
                    <td style={{padding:'7px 8px',fontSize:9}} title={r.beneficiario}>{r.beneficiario.substring(0,34)}</td>
                    <td style={{padding:'7px 8px',fontSize:8,color:C.muted}} title={r.modalidad}>{r.modalidad.substring(0,20)}</td>
                    <td style={{padding:'7px 8px',textAlign:'center',fontSize:9}}>{r.tipoDoc}</td>
                    <td style={{padding:'7px 8px',textAlign:'right',fontWeight:700,color:C.navy}}>{fmtFull(r.saldo)}</td>
                    <td style={{padding:'7px 8px',textAlign:'center'}}>
                      <span style={{fontSize:8,fontWeight:700,color:'#fff',background:rg.color,padding:'2px 6px',borderRadius:10,whiteSpace:'nowrap'}}>{rg.label}</span>
                    </td>
                  </tr>
                );
              })}
              {pageData.length===0 && (
                <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:C.muted}}>
                  No hay CRP con esta combinación de filtros.
                  {fVigencia!=='Todas' && fRiesgo!=='Todos' && (
                    <div style={{fontSize:10,marginTop:6,color:C.amar}}>
                      ⚠️ La vigencia {fVigencia} corresponde a riesgo <strong>{getRiesgo(2026-Number(fVigencia)).label}</strong>, no a "{fRiesgo}". Prueba dejar solo uno de los dos.
                    </div>
                  )}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPag>1 && (
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:14,alignItems:'center'}}>
            <button onClick={()=>setPagina(1)} disabled={pagina===1} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:'#fff',cursor:pagina===1?'default':'pointer',opacity:pagina===1?.4:1}}>«</button>
            <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagina===1} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer'}}>‹</button>
            <span style={{fontSize:12,fontWeight:600,color:C.navy,padding:'0 12px'}}>Página {pagina} de {totalPag} · {sortData.length} registros</span>
            <button onClick={()=>setPagina(p=>Math.min(totalPag,p+1))} disabled={pagina===totalPag} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer'}}>›</button>
            <button onClick={()=>setPagina(totalPag)} disabled={pagina===totalPag} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:'#fff',cursor:pagina===totalPag?'default':'pointer',opacity:pagina===totalPag?.4:1}}>»</button>
          </div>
        )}
      </div>

      {/* Resúmenes */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#fff',borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>
          <h3 style={{color:C.navy,fontSize:13,fontWeight:700,margin:'0 0 12px 0'}}>Resumen por Vigencia</h3>
          <table style={{width:'100%',fontSize:11,borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`2px solid ${C.border}`,color:C.muted}}>
              <th style={{padding:'6px',textAlign:'left'}}>Vigencia</th>
              <th style={{padding:'6px',textAlign:'center'}}>CRP</th>
              <th style={{padding:'6px',textAlign:'right'}}>Saldo</th>
              <th style={{padding:'6px',textAlign:'center'}}>Riesgo</th>
            </tr></thead>
            <tbody>
              {porVigencia.map((v:any,i) => {
                const rg = getRiesgo(v.años);
                return <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:'6px',fontWeight:600}}>{v.vig} <span style={{color:C.muted,fontSize:9}}>({v.años}a)</span></td>
                  <td style={{padding:'6px',textAlign:'center'}}>{v.count}</td>
                  <td style={{padding:'6px',textAlign:'right',fontWeight:600,color:C.navy}}>{fmtMxx(v.saldo)}</td>
                  <td style={{padding:'6px',textAlign:'center'}}><span style={{fontSize:8,fontWeight:700,color:'#fff',background:rg.color,padding:'2px 6px',borderRadius:10}}>{rg.label}</span></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div style={{background:'#fff',borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>
          <h3 style={{color:C.navy,fontSize:13,fontWeight:700,margin:'0 0 12px 0'}}>Por Tipo de Documento (NIT vs CC)</h3>
          <table style={{width:'100%',fontSize:11,borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`2px solid ${C.border}`,color:C.muted}}>
              <th style={{padding:'6px',textAlign:'left'}}>Tipo</th>
              <th style={{padding:'6px',textAlign:'center'}}>CRP</th>
              <th style={{padding:'6px',textAlign:'right'}}>Saldo</th>
              <th style={{padding:'6px',textAlign:'right'}}>Promedio</th>
            </tr></thead>
            <tbody>
              {porTipoDoc.map((t:any,i) => (
                <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:'6px',fontWeight:600}}>{t.tipo}</td>
                  <td style={{padding:'6px',textAlign:'center'}}>{t.count}</td>
                  <td style={{padding:'6px',textAlign:'right',fontWeight:600,color:C.cyan}}>{fmtMxx(t.saldo)}</td>
                  <td style={{padding:'6px',textAlign:'right',color:C.muted}}>{fmtMxx(t.saldo/t.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{marginTop:12,padding:10,background:C.bg,borderRadius:6,fontSize:10,color:C.muted}}>
            💡 NIT concentra el mayor valor (contratos grandes); CC son contratos de personas naturales (menor cuantía).
          </div>
        </div>
      </div>
    </div>
  );
}
