import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import ExportarPDF from './ExportarPDF';
import AnomaliasCRP, { detectarAnomalias } from './AnomaliasCRP';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, LabelList, ComposedChart, Area,
} from 'recharts';

interface DataRow { [key: string]: string | number; }

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  navy:"#1a2742", cyan:"#5dade2", verde:"#27ae60", amar:"#f39c12",
  rojo:"#e74c3c", muted:"#7f8c8d", bg:"#f0f2f5", border:"#e8edf2",
  violet:"#8e44ad", teal:"#1abc9c", orange:"#e67e22",
};
const PAL = [C.cyan,C.verde,C.amar,C.rojo,C.violet,C.teal,C.orange,"#d63031","#0984e3","#e84393"];

const fmtCOP = (v:number) =>
  v>=1e9?`$${(v/1e9).toFixed(2)}B`:v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${v.toFixed(0)}`;
const fmtFull = (v:number) =>
  new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);
const fmtNum = (v:number) => v.toLocaleString('es-CO');

const toNum = (v:any):number => {
  if(v===null||v===undefined||v==='') return 0;
  const n=parseFloat(String(v).replace(/[^0-9.-]/g,''));
  return isNaN(n)?0:n;
};

// ─── Buscador de columna flexible ─────────────────────────────────────────────
const gc = (row:DataRow, variants:string[]):any => {
  for(const k of variants){
    if(row[k]!==undefined&&row[k]!==null&&row[k]!=='') return row[k];
  }
  return '';
};

// ─── Mapa de columnas con las 20 variables exactas ───────────────────────────
const COLS = {
  ejercicio:    ['Ejercicio','EJERCICIO'],
  periodo:      ['Período','Periodo','PERÍODO','PERIODO'],
  fechaReg:     ['Fecha Registro','Fecha de Registro','FECHA REGISTRO','FechaRegistro'],
  compromiso:   ['Compromiso','COMPROMISO'],
  noComp:       ['No. Compromiso','No.Compromiso','Numero Compromiso','N° Compromiso','NO. COMPROMISO'],
  noCDP:        ['Número de CDP','Numero de CDP','No. CDP','N° CDP','NumeroCDP'],
  noCRP:        ['Número de CRP','Numero de CRP','No. CRP','N° CRP','NumeroCRP'],
  objeto:       ['Objeto','OBJETO'],
  descripcion:  ['Descripcion','Descripción','DESCRIPCION','DESCRIPCIÓN'],
  modSelec:     ['Mod. Selec','Descripcion Mod. Selec','Descripción Mod. Selec','Modalidad','Mod Selec'],
  tipoDoc:      ['Tipo Doc.','Tipo de Documento','Tipo Doc','TIPO DOC'],
  tipoDocBP:    ['BP Beneficiario','Tipo Doc. BP Beneficiario','Tipo Doc BP'],
  beneficiario: ['Nombre BP Beneficiario','Nombre Beneficiario','NombreBP','Nombre BP'],
  valorCRP:     ['Valor CRP','VALOR CRP'],
  anulaciones:  ['Anulaciones','ANULACIONES'],
  reintegros:   ['Reintegros','REINTEGROS'],
  valorNeto:    ['Valor Neto','VALOR NETO'],
  giro:         ['Autorizacion giro','Autorización giro','Autorizacion Giro','AUTORIZACION GIRO'],
  pendGiro:     ['Pendiente de Giro','Pendiente Giro','PENDIENTE DE GIRO','PendienteGiro'],
  ejecutado:    ['Ejecutado','EJECUTADO','Ejecucion %','EJECUCION %','Ejecución %'],
};

interface Props { onDataLoad?: (data:DataRow[]) => void; }

// ─── KPI card ─────────────────────────────────────────────────────────────────
const KpiCard = ({emoji,label,valor,color,sub}:{emoji:string;label:string;valor:string;color:string;sub?:string}) => (
  <div style={{background:"white",borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${color}`,
    flex:1,minWidth:120,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
    <div style={{fontSize:20}}>{emoji}</div>
    <div style={{fontSize:18,fontWeight:800,color,lineHeight:1,marginTop:4}}>{valor}</div>
    <div style={{fontSize:11,fontWeight:600,color:C.navy,marginTop:3}}>{label}</div>
    {sub&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>{sub}</div>}
  </div>
);

const TT = ({active,payload,label}:any) => {
  if(!active||!payload?.length) return null;
  return(
    <div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",
      fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,.12)"}}>
      <div style={{fontWeight:700,color:C.navy,marginBottom:5}}>{label}</div>
      {payload.map((p:any,i:number)=>(
        <div key={i} style={{color:p.color??C.cyan}}>{p.name}: <strong>
          {typeof p.value==="number"?fmtCOP(p.value):p.value}
        </strong></div>
      ))}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const AnalisisPresupuestal:React.FC<Props> = ({onDataLoad}) => {
  const [data,      setData]      = useState<DataRow[]>([]);
  const [fileName,  setFileName]  = useState('');
  const [activeTab, setActiveTab] = useState<'resumen'|'graficas'|'detalle'|'anomalias'>('resumen');

  // Filtros
  const [busqueda,    setBusqueda]    = useState('');
  const [filtroEj,    setFiltroEj]    = useState('Todos');
  const [filtroPer,   setFiltroPer]   = useState('Todos');
  const [filtroMod,   setFiltroMod]   = useState('Todos');
  const [filtroTipo,  setFiltroTipo]  = useState('Todos');
  const [pagina,      setPagina]      = useState(1);
  const POR_PAG = 15;

  const handleFile = useCallback((e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result,{type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws) as DataRow[];
      if(json.length>0) console.log('COLUMNAS CRP:',Object.keys(json[0]));
      setData(json);
      onDataLoad?.(json);
      setBusqueda(''); setFiltroEj('Todos'); setFiltroPer('Todos');
      setFiltroMod('Todos'); setFiltroTipo('Todos'); setPagina(1);
    };
    reader.readAsArrayBuffer(file);
  },[onDataLoad]);

  const uniq = (col:string[]) =>
    Array.from(new Set(data.map(r=>String(gc(r,col)||'')).filter(Boolean))).sort();

  // ── Datos filtrados ──────────────────────────────────────────────────────────
  const filtrado = useMemo(()=>{
    let f = data;
    if(filtroEj!=='Todos')  f=f.filter(r=>String(gc(r,COLS.ejercicio)||'')=== filtroEj);
    if(filtroPer!=='Todos') f=f.filter(r=>String(gc(r,COLS.periodo)||'')  === filtroPer);
    if(filtroMod!=='Todos') f=f.filter(r=>String(gc(r,COLS.modSelec)||'')=== filtroMod);
    if(filtroTipo!=='Todos')f=f.filter(r=>String(gc(r,COLS.tipoDoc)||'') === filtroTipo);
    if(busqueda.trim()){
      const q=busqueda.toLowerCase();
      f=f.filter(r=>
        String(gc(r,COLS.beneficiario)||'').toLowerCase().includes(q)||
        String(gc(r,COLS.noComp)||'').toLowerCase().includes(q)||
        String(gc(r,COLS.noCDP)||'').toLowerCase().includes(q)||
        String(gc(r,COLS.noCRP)||'').toLowerCase().includes(q)||
        String(gc(r,COLS.objeto)||'').toLowerCase().includes(q)||
        String(gc(r,COLS.descripcion)||'').toLowerCase().includes(q)
      );
    }
    return f;
  },[data,busqueda,filtroEj,filtroPer,filtroMod,filtroTipo]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(()=>{
    const valorCRP   = filtrado.reduce((s,r)=>s+toNum(gc(r,COLS.valorCRP)),0);
    const valorNeto  = filtrado.reduce((s,r)=>s+toNum(gc(r,COLS.valorNeto)),0);
    const giro       = filtrado.reduce((s,r)=>s+toNum(gc(r,COLS.giro)),0);
    const pendGiro   = filtrado.reduce((s,r)=>s+toNum(gc(r,COLS.pendGiro)),0);
    const anulac     = filtrado.reduce((s,r)=>s+toNum(gc(r,COLS.anulaciones)),0);
    const reint      = filtrado.reduce((s,r)=>s+toNum(gc(r,COLS.reintegros)),0);
    const ejecutado  = valorCRP>0?(giro/valorCRP)*100:0;
    const pctEjec    = valorCRP>0?(giro/valorCRP)*100:0;
    return {valorCRP,valorNeto,giro,pendGiro,anulac,reint,ejecutado,pctEjec,total:filtrado.length,sinGiro:pendGiro,anulaciones:anulac};
  },[filtrado]);

  const anomaliasDetectadas = useMemo(()=>detectarAnomalias(filtrado),[filtrado]);

  // ── Agrupaciones para gráficas ───────────────────────────────────────────────
  // Por período
  const byPeriodo = useMemo(()=>{
    const g:Record<string,{valorCRP:number;giro:number;pendGiro:number;count:number}>={};
    filtrado.forEach(r=>{
      const k=String(gc(r,COLS.periodo)||'Sin período');
      if(!g[k]) g[k]={valorCRP:0,giro:0,pendGiro:0,count:0};
      g[k].valorCRP +=toNum(gc(r,COLS.valorCRP));
      g[k].giro     +=toNum(gc(r,COLS.giro));
      g[k].pendGiro +=toNum(gc(r,COLS.pendGiro));
      g[k].count    +=1;
    });
    return Object.entries(g).map(([periodo,v])=>({periodo,...v})).sort((a,b)=>a.periodo.localeCompare(b.periodo));
  },[filtrado]);

  // Por modalidad
  const byMod = useMemo(()=>{
    const g:Record<string,number>={};
    filtrado.forEach(r=>{
      const k=String(gc(r,COLS.modSelec)||'Sin modalidad');
      g[k]=(g[k]||0)+toNum(gc(r,COLS.valorNeto));
    });
    return Object.entries(g).map(([name,value])=>({name:name.slice(0,24),value}))
      .sort((a,b)=>b.value-a.value).slice(0,8);
  },[filtrado]);

  // Por beneficiario top 10
  const byBenef = useMemo(()=>{
    const g:Record<string,{valorCRP:number;giro:number;count:number}>={};
    filtrado.forEach(r=>{
      const k=String(gc(r,COLS.beneficiario)||'Sin nombre');
      if(!g[k]) g[k]={valorCRP:0,giro:0,count:0};
      g[k].valorCRP+=toNum(gc(r,COLS.valorCRP));
      g[k].giro    +=toNum(gc(r,COLS.giro));
      g[k].count   +=1;
    });
    return Object.entries(g).map(([nombre,v])=>({nombre:nombre.slice(0,28),...v}))
      .sort((a,b)=>b.valorCRP-a.valorCRP).slice(0,10);
  },[filtrado]);

  // Valor CRP vs Giro vs Pendiente por período (líneas)
  const evolucion = useMemo(()=>byPeriodo.map(d=>({
    periodo:d.periodo,
    'Valor CRP':d.valorCRP,
    'Giro':d.giro,
    'Pendiente Giro':d.pendGiro,
  })),[byPeriodo]);

  // Por tipo doc
  const byTipoDoc = useMemo(()=>{
    const g:Record<string,number>={};
    filtrado.forEach(r=>{
      const k=String(gc(r,COLS.tipoDoc)||'Sin tipo');
      g[k]=(g[k]||0)+toNum(gc(r,COLS.valorCRP));
    });
    return Object.entries(g).map(([name,value])=>({name:name.slice(0,20),value}))
      .sort((a,b)=>b.value-a.value);
  },[filtrado]);

  // Anulaciones + Reintegros por período
  const byAnulRein = useMemo(()=>byPeriodo.map(d=>{
    const anul=filtrado.filter(r=>String(gc(r,COLS.periodo)||'')===d.periodo).reduce((s,r)=>s+toNum(gc(r,COLS.anulaciones)),0);
    const rein=filtrado.filter(r=>String(gc(r,COLS.periodo)||'')===d.periodo).reduce((s,r)=>s+toNum(gc(r,COLS.reintegros)),0);
    return {periodo:d.periodo,Anulaciones:anul,Reintegros:rein};
  }),[byPeriodo,filtrado]);

  const hayFiltros=busqueda||filtroEj!=='Todos'||filtroPer!=='Todos'||filtroMod!=='Todos'||filtroTipo!=='Todos';
  const totalPag=Math.ceil(filtrado.length/POR_PAG);
  const pageData=filtrado.slice((pagina-1)*POR_PAG,pagina*POR_PAG);
  const pctColor=(p:number)=>p>=80?C.verde:p>=50?C.amar:C.rojo;

  // ── Pantalla vacía ───────────────────────────────────────────────────────────
  if(data.length===0) return(
    <div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",minHeight:420,padding:24}}>
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1e3a6e 100%)`,borderRadius:16,
        padding:"36px 44px",textAlign:"center" as const,color:"white",maxWidth:560,width:"100%"}}>
        <div style={{fontSize:52,marginBottom:16}}>📊</div>
        <h3 style={{margin:"0 0 8px",fontSize:22,fontWeight:800}}>Análisis Presupuestal CRP</h3>
        <p style={{margin:"0 0 12px",fontSize:13,color:"rgba(255,255,255,.65)",lineHeight:1.7}}>
          Carga el reporte SAP para visualizar análisis completo.<br/>
          <strong style={{color:"#85c1e9"}}>20 variables · filtros dinámicos · 6 gráficas</strong>
        </p>
        <div style={{display:"flex",flexWrap:"wrap" as const,gap:5,justifyContent:"center",marginBottom:28}}>
          {["Ejercicio","Período","Fecha Registro","Compromiso","No. Compromiso","No. CDP","No. CRP",
            "Objeto","Descripción","Mod. Selec","Tipo Doc.","BP Beneficiario","Nombre BP",
            "Valor CRP","Anulaciones","Reintegros","Valor Neto","Autorización Giro","Pendiente Giro","Ejecutado"
          ].map(v=>(
            <span key={v} style={{background:"rgba(93,173,226,.25)",border:"1px solid rgba(93,173,226,.4)",
              borderRadius:20,padding:"2px 10px",fontSize:10,color:"#85c1e9",fontWeight:600}}>{v}</span>
          ))}
        </div>
        <label style={{display:"inline-flex",alignItems:"center",gap:10,background:C.cyan,
          borderRadius:10,padding:"12px 28px",cursor:"pointer",fontWeight:700,fontSize:13}}>
          📂 Cargar archivo Excel (.xlsx)
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:"none"}}/>
        </label>
      </div>
    </div>
  );

  return(
    <div style={{fontFamily:"'Segoe UI',sans-serif",color:C.navy}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1e3a6e 100%)`,borderRadius:12,
        padding:"16px 22px",marginBottom:16,color:"white",display:"flex",
        justifyContent:"space-between",alignItems:"center",flexWrap:"wrap" as const,gap:10}}>
        <div>
          <div style={{fontSize:10,color:C.cyan,letterSpacing:2,fontWeight:700,textTransform:"uppercase" as const}}>
            📊 SAP Distrital · FDL Usme
          </div>
          <h2 style={{margin:"4px 0",fontSize:18,fontWeight:800}}>Análisis Presupuestal CRP</h2>
          <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>
            📁 {fileName} · {fmtNum(data.length)} registros · {fmtNum(filtrado.length)} filtrados
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap" as const}}>
          <label style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.1)",
            border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"6px 14px",
            cursor:"pointer",fontSize:12,color:"white",fontWeight:600}}>
            📂 Cambiar archivo
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:"none"}}/>
          </label>
          <ExportarPDF fileName={fileName} totalRegistros={data.length} kpis={kpis}
            anomalias={anomaliasDetectadas} municipio="Usme"/>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap" as const,marginBottom:16}}>
        <KpiCard emoji="💰" label="Valor CRP Total"    valor={fmtCOP(kpis.valorCRP)}   color={C.cyan}/>
        <KpiCard emoji="✅" label="Valor Neto"          valor={fmtCOP(kpis.valorNeto)}  color={C.verde}/>
        <KpiCard emoji="🏦" label="Autorización Giro"  valor={fmtCOP(kpis.giro)}       color={C.teal}/>
        <KpiCard emoji="⏳" label="Pendiente de Giro"  valor={fmtCOP(kpis.pendGiro)}   color={C.amar}/>
        <KpiCard emoji="❌" label="Anulaciones"         valor={fmtCOP(kpis.anulac)}     color={C.rojo}/>
        <KpiCard emoji="↩️" label="Reintegros"          valor={fmtCOP(kpis.reint)}      color={C.violet}/>
      </div>

      {/* Barra ejecución */}
      <div style={{background:"white",borderRadius:12,padding:"14px 20px",marginBottom:16,
        boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontWeight:700,fontSize:13,color:C.navy}}>Nivel de Ejecución — Giro / Valor CRP</span>
          <span style={{fontSize:26,fontWeight:900,color:pctColor(kpis.pctEjec)}}>
            {kpis.pctEjec.toFixed(1)}%
          </span>
        </div>
        <div style={{background:C.bg,borderRadius:20,height:16,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:20,transition:"width .7s",
            background:pctColor(kpis.pctEjec),width:`${Math.min(kpis.pctEjec,100)}%`}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginTop:6}}>
          <span>Girado: {fmtFull(kpis.giro)}</span>
          <span>Pendiente: {fmtFull(kpis.pendGiro)}</span>
          <span>CRP Total: {fmtFull(kpis.valorCRP)}</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{background:"white",borderRadius:12,padding:"14px 20px",marginBottom:16,
        boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontWeight:700,fontSize:13,color:C.navy}}>🔍 Filtros</span>
          {hayFiltros&&(
            <button onClick={()=>{setBusqueda('');setFiltroEj('Todos');setFiltroPer('Todos');
              setFiltroMod('Todos');setFiltroTipo('Todos');setPagina(1);}}
              style={{fontSize:11,padding:"4px 12px",borderRadius:6,border:`1px solid ${C.border}`,
                cursor:"pointer",background:"#fadbd8",color:C.rojo,fontWeight:700}}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:10,flexWrap:"wrap" as const}}>
          <input value={busqueda} onChange={e=>{setBusqueda(e.target.value);setPagina(1);}}
            placeholder="🔎 Beneficiario, No. Compromiso, CDP, CRP, objeto..."
            style={{fontSize:12,padding:"8px 12px",borderRadius:8,
              border:`1.5px solid ${busqueda?C.cyan:C.border}`,outline:"none",color:C.navy}}/>
          {([
            {val:filtroEj,  set:setFiltroEj,  col:COLS.ejercicio, label:"Ejercicio"},
            {val:filtroPer, set:setFiltroPer, col:COLS.periodo,    label:"Período"},
            {val:filtroMod, set:setFiltroMod, col:COLS.modSelec,   label:"Mod. Selec"},
            {val:filtroTipo,set:setFiltroTipo,col:COLS.tipoDoc,    label:"Tipo Doc."},
          ] as any[]).map((f:any,i:number)=>(
            <select key={i} value={f.val} onChange={e=>{f.set(e.target.value);setPagina(1);}}
              style={{fontSize:12,padding:"8px 10px",borderRadius:8,
                border:`1.5px solid ${f.val!=='Todos'?C.amar:C.border}`,background:"white",color:C.navy}}>
              <option value="Todos">{f.label}: Todos</option>
              {uniq(f.col).map((v:string)=>(
                <option key={v} value={v}>{v.slice(0,30)}</option>
              ))}
            </select>
          ))}
        </div>
        {hayFiltros&&(
          <div style={{marginTop:8,fontSize:11,color:C.muted}}>
            <strong style={{color:C.navy}}>{fmtNum(filtrado.length)}</strong> registros ·{' '}
            <strong style={{color:C.cyan}}>{fmtCOP(kpis.valorCRP)}</strong> Valor CRP ·{' '}
            <strong style={{color:C.verde}}>{fmtCOP(kpis.giro)}</strong> Girado
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{background:"white",borderRadius:"10px 10px 0 0",borderBottom:`2px solid ${C.border}`,
        display:"flex",padding:"0 12px",overflowX:"auto" as const}}>
        {([
          ['resumen','📈 Resumen'],['graficas','📊 Gráficas'],
          ['detalle','📋 Detalle'],['anomalias','🚨 Anomalías'],
        ] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setActiveTab(k)} style={{
            padding:"11px 16px",background:"transparent",border:"none",
            borderBottom:activeTab===k?`2px solid ${C.cyan}`:"2px solid transparent",
            color:activeTab===k?C.cyan:C.muted,cursor:"pointer",fontSize:12,
            fontWeight:activeTab===k?700:500,whiteSpace:"nowrap" as const}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{background:"white",borderRadius:"0 0 10px 10px",padding:"20px",
        boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>

        {/* ── RESUMEN ── */}
        {activeTab==='resumen'&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

            {/* G1: CRP vs Giro vs Pendiente por período */}
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>
                Valor CRP vs Giro vs Pendiente de Giro · por Período
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>
                Variables: Período · Valor CRP · Autorización Giro · Pendiente de Giro
              </div>
              <ResponsiveContainer width="99%" height={260}>
                <ComposedChart data={evolucion} margin={{top:4,right:16,left:4,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="periodo" tick={{fontSize:10}}/>
                  <YAxis tickFormatter={fmtCOP} tick={{fontSize:9}} width={68}/>
                  <Tooltip content={<TT/>}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Area type="monotone" dataKey="Valor CRP"      fill={C.cyan+"33"}    stroke={C.cyan}   strokeWidth={2} fillOpacity={1}/>
                  <Area type="monotone" dataKey="Giro"           fill={C.verde+"33"}   stroke={C.verde}  strokeWidth={2} fillOpacity={1}/>
                  <Area type="monotone" dataKey="Pendiente Giro" fill={C.amar+"33"}    stroke={C.amar}   strokeWidth={2} fillOpacity={1}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* G2: Dona modalidad */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>
                Distribución por Modalidad de Selección
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Variable: Mod. Selec · Valor Neto</div>
              <ResponsiveContainer width="99%" height={260}>
                <PieChart>
                  <Pie data={byMod} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={95} innerRadius={48}
                    label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                    {byMod.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:number)=>fmtCOP(v)}/>
                  <Legend wrapperStyle={{fontSize:10}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* G3: Anulaciones + Reintegros por período */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>
                Anulaciones y Reintegros · por Período
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Variables: Período · Anulaciones · Reintegros</div>
              <ResponsiveContainer width="99%" height={260}>
                <BarChart data={byAnulRein} margin={{top:4,right:16,left:4,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="periodo" tick={{fontSize:10}}/>
                  <YAxis tickFormatter={fmtCOP} tick={{fontSize:9}} width={64}/>
                  <Tooltip content={<TT/>}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="Anulaciones" fill={C.rojo}   radius={[4,4,0,0]}/>
                  <Bar dataKey="Reintegros"  fill={C.violet} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── GRÁFICAS ── */}
        {activeTab==='graficas'&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

            {/* G4: Top beneficiarios */}
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>
                Top 10 Beneficiarios · Valor CRP vs Giro
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>
                Variables: Nombre BP Beneficiario · Valor CRP · Autorización Giro
              </div>
              <ResponsiveContainer width="99%" height={280}>
                <BarChart data={byBenef} layout="vertical" margin={{top:4,right:70,left:4,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" tickFormatter={fmtCOP} tick={{fontSize:9}}/>
                  <YAxis type="category" dataKey="nombre" width={175} tick={{fontSize:9}}/>
                  <Tooltip content={<TT/>}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="valorCRP" name="Valor CRP" fill={C.cyan}  radius={[0,4,4,0]}
                    label={{position:"right",formatter:(v:number)=>fmtCOP(v),fontSize:9,fill:C.muted}}/>
                  <Bar dataKey="giro"     name="Giro"      fill={C.verde} radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* G5: Tipo Doc */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>Distribución por Tipo de Documento</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Variable: Tipo Doc. · Valor CRP</div>
              <ResponsiveContainer width="99%" height={240}>
                <PieChart>
                  <Pie data={byTipoDoc} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={90} innerRadius={44}
                    label={({name,percent})=>`${name}: ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                    {byTipoDoc.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:number)=>fmtCOP(v)}/>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* G6: N° compromisos por período */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>N° Compromisos por Período</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Variables: Período · No. Compromiso</div>
              <ResponsiveContainer width="99%" height={240}>
                <BarChart data={byPeriodo} margin={{top:4,right:16,left:4,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="periodo" tick={{fontSize:10}}/>
                  <YAxis tick={{fontSize:10}}/>
                  <Tooltip formatter={(v:any)=>[fmtNum(v)+" compromisos","N°"]}/>
                  <Bar dataKey="count" name="N° Compromisos" radius={[4,4,0,0]}>
                    {byPeriodo.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── DETALLE ── */}
        {activeTab==='detalle'&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontWeight:700,fontSize:13,color:C.navy}}>
                {fmtNum(filtrado.length)} registros · Página {pagina} de {totalPag||1}
              </span>
            </div>
            <div style={{overflowX:"auto" as const,border:`1px solid ${C.border}`,borderRadius:10}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                <thead>
                  <tr style={{background:C.navy,color:"white",position:"sticky" as const,top:0}}>
                    {[
                      "Ejercicio","Período","Fecha Reg.","No. Comp","No. CDP","No. CRP",
                      "BP Benef.","Nombre Beneficiario","Mod. Selec","Tipo Doc",
                      "Valor CRP","Anulaciones","Reintegros","Valor Neto","Giro","Pend. Giro","Ejecutado"
                    ].map(h=>(
                      <th key={h} style={{padding:"8px 8px",textAlign:"left" as const,
                        whiteSpace:"nowrap" as const,fontWeight:600,fontSize:10}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r,i)=>{
                    const vCRP=toNum(gc(r,COLS.valorCRP)); const vGiro=toNum(gc(r,COLS.giro)); const ejec=vCRP>0?parseFloat(((vGiro/vCRP)*100).toFixed(2)):0;
                    const ec=ejec>=80?C.verde:ejec>=50?C.amar:C.rojo;
                    return(
                      <tr key={i} style={{borderBottom:`1px solid ${C.border}`,
                        background:i%2===0?"white":C.bg}}>
                        <td style={{padding:"6px 8px",color:C.muted}}>{String(gc(r,COLS.ejercicio)||'')}</td>
                        <td style={{padding:"6px 8px",color:C.muted}}>{String(gc(r,COLS.periodo)||'')}</td>
                        <td style={{padding:"6px 8px",whiteSpace:"nowrap" as const,color:C.muted,fontSize:10}}>
                          {String(gc(r,COLS.fechaReg)||'').slice(0,10)}
                        </td>
                        <td style={{padding:"6px 8px",fontWeight:700,color:C.cyan,whiteSpace:"nowrap" as const}}>
                          {String(gc(r,COLS.noComp)||'')}
                        </td>
                        <td style={{padding:"6px 8px",color:C.muted,fontFamily:"monospace"}}>
                          {String(gc(r,COLS.noCDP)||'')}
                        </td>
                        <td style={{padding:"6px 8px",color:C.muted,fontFamily:"monospace"}}>
                          {String(gc(r,COLS.noCRP)||'')}
                        </td>
                        <td style={{padding:"6px 8px",color:C.muted}}>
                          {String(gc(r,COLS.tipoDocBP)||'')}
                        </td>
                        <td style={{padding:"6px 8px",maxWidth:160,overflow:"hidden",
                          textOverflow:"ellipsis",whiteSpace:"nowrap" as const,fontWeight:600}}
                          title={String(gc(r,COLS.beneficiario)||'')}>
                          {String(gc(r,COLS.beneficiario)||'')}
                        </td>
                        <td style={{padding:"6px 8px",maxWidth:100,overflow:"hidden",
                          textOverflow:"ellipsis",whiteSpace:"nowrap" as const,color:C.muted,fontSize:10}}>
                          {String(gc(r,COLS.modSelec)||'')}
                        </td>
                        <td style={{padding:"6px 8px",color:C.muted}}>
                          {String(gc(r,COLS.tipoDoc)||'')}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,fontWeight:700,
                          color:C.cyan,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gc(r,COLS.valorCRP)))}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,
                          color:C.rojo,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gc(r,COLS.anulaciones)))}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,
                          color:C.violet,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gc(r,COLS.reintegros)))}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,
                          color:C.verde,fontWeight:600,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gc(r,COLS.valorNeto)))}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,
                          color:C.teal,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gc(r,COLS.giro)))}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,
                          color:C.amar,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gc(r,COLS.pendGiro)))}
                        </td>
                        <td style={{padding:"6px 8px",minWidth:80}}>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <div style={{flex:1,background:C.bg,borderRadius:4,height:5,overflow:"hidden"}}>
                              <div style={{width:`${Math.min(ejec,100)}%`,height:"100%",
                                background:ec,borderRadius:4}}/>
                            </div>
                            <span style={{fontSize:10,fontWeight:700,color:ec,minWidth:32}}>
                              {ejec.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pageData.length===0&&(
                    <tr><td colSpan={17} style={{textAlign:"center" as const,padding:32,color:C.muted}}>
                      No hay registros con los filtros aplicados
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPag>1&&(
              <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:14}}>
                <button onClick={()=>setPagina(1)} disabled={pagina===1}
                  style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                    cursor:pagina===1?"default":"pointer",opacity:pagina===1?.4:1,background:"white",fontSize:12}}>«</button>
                <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagina===1}
                  style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                    cursor:pagina===1?"default":"pointer",opacity:pagina===1?.4:1,background:"white",fontSize:12}}>‹</button>
                {Array.from({length:Math.min(7,totalPag)},(_,i)=>{
                  const p=totalPag<=7?i+1:Math.max(1,Math.min(pagina-3,totalPag-6))+i;
                  return<button key={p} onClick={()=>setPagina(p)} style={{
                    padding:"5px 10px",borderRadius:6,
                    border:`1px solid ${p===pagina?C.cyan:C.border}`,
                    background:p===pagina?C.cyan:"white",
                    color:p===pagina?"white":C.navy,
                    cursor:"pointer",fontWeight:p===pagina?700:400,fontSize:12}}>{p}</button>;
                })}
                <button onClick={()=>setPagina(p=>Math.min(totalPag,p+1))} disabled={pagina===totalPag}
                  style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                    cursor:pagina===totalPag?"default":"pointer",opacity:pagina===totalPag?.4:1,background:"white",fontSize:12}}>›</button>
                <button onClick={()=>setPagina(totalPag)} disabled={pagina===totalPag}
                  style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                    cursor:pagina===totalPag?"default":"pointer",opacity:pagina===totalPag?.4:1,background:"white",fontSize:12}}>»</button>
              </div>
            )}
          </div>
        )}

        {/* ── ANOMALÍAS ── */}
        {activeTab==='anomalias'&&<AnomaliasCRP data={filtrado??[]}/>}

      </div>
    </div>
  );
};

export default AnalisisPresupuestal;
