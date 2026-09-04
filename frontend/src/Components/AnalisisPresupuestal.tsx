import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import ExportarPDF from './ExportarPDF';
import AnomaliasCRP, { detectarAnomalias } from './AnomaliasCRP';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, Treemap,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';

interface DataRow { [key: string]: string | number; }

// ─── Paleta XBOG (navy / cyan) + acentos ───────────────────────────────────────
const C = {
  navy:"#1B3A6B", navyDark:"#12294d", cyan:"#00AEEF", cyanSoft:"#5dade2",
  verde:"#10b981", amar:"#f59e0b", rojo:"#ef4444", muted:"#64748b",
  bg:"#f1f5f9", border:"#e2e8f0",
  violet:"#8b5cf6", teal:"#14b8a6", orange:"#f97316", rosa:"#ec4899",
};
const PAL = [C.cyan,C.verde,C.violet,C.amar,C.teal,C.rosa,C.orange,C.rojo,"#0984e3","#00b894"];

const fmtCOP = (v:number) => {
  if(v>=1e9) return `$${(v).toLocaleString("es-CO").replace(/\B(?=(\d{3})+(?!\d))/g, '.')}.${(v).toLocaleString("es-CO").slice(0,3).padStart(3,'0')}M`;
  if(v>=1e6) return `$${(v/1e6).toLocaleString('es-CO')}M`;
  if(v>=1e3) return `$${(v/1e3).toLocaleString('es-CO')}K`;
  return `$${v.toFixed(0)}`;
};
const fmtFull = (v:number) =>
  new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);
const fmtNum = (v:number) => v.toLocaleString('es-CO');
const fmtM = (v:number) => '$' + (v/1e6).toLocaleString('es-CO',{maximumFractionDigits:0}) + 'M';

const toNum = (v:any):number => {
  if(v===null||v===undefined||v==='') return 0;
  const n=parseFloat(String(v).replace(/[^0-9.-]/g,''));
  return isNaN(n)?0:n;
};

// ─── Normalizador (minúsculas, sin acentos, sin puntuación) ────────────────────
const norm = (s:any):string => String(s)
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')   // quita acentos
  .replace(/[^a-z0-9]+/g,' ')                          // puntos, comas, etc → espacio
  .trim();

// ─── Buscador de columna EXACTO (evita colisiones tipo "Compromiso" vs "No. Compromiso") ─
// 1) intenta match exacto normalizado; 2) si no, cae a substring. Prioriza siempre el exacto.
const gcExacto = (row:DataRow, variants:string[]):any => {
  const keys = Object.keys(row);
  for(const v of variants){                      // paso 1: exacto
    const nv = norm(v);
    const hit = keys.find(k => norm(k) === nv);
    if(hit !== undefined) return row[hit];
  }
  for(const v of variants){                      // paso 2: substring fallback
    const nv = norm(v);
    const hit = keys.find(k => norm(k).includes(nv));
    if(hit !== undefined) return row[hit];
  }
  return '';
};

// ─── Mapa de columnas: LAS 12 VARIABLES EXACTAS ────────────────────────────────
const COLS = {
  ejercicio:    ['Ejercicio'],
  compromiso:   ['Compromiso'],                                   // objeto / descripción del compromiso
  noComp:       ['No. Compromiso','No.Compromiso','Numero Compromiso','N° Compromiso'],
  rubro:        ['Descripción del Rubro','Descripcion del Rubro','Rubro'],
  modSelec:     ['Descripcion Mod. Selec','Descripción Mod. Selec','Desc Mod Selec'],
  beneficiario: ['Nombre BP Beneficiario','Nombre Beneficiario'],
  valorCRP:     ['Valor CRP'],
  anulaciones:  ['Anulaciones'],
  reintegros:   ['Reintegros'],
  valorNeto:    ['Valor Neto'],
  giro:         ['Autorizacion giro','Autorización giro','Autorizacion Giro'],
  sinGiro:      ['Com.Sin.Aut.Giro','Com. Sin. Aut. Giro','Com Sin Aut Giro','Compromiso Sin Autorizacion Giro'],
  objeto:       ['Objeto'],
  fechaReg:     ['Fecha Registro'],
};

interface Props { onDataLoad?: (data:DataRow[]) => void; }

// ─── KPI card ─────────────────────────────────────────────────────────────────
const KpiCard = ({emoji,label,valor,color,sub}:{emoji:string;label:string;valor:string;color:string;sub?:string}) => (
  <div style={{background:"white",borderRadius:12,padding:"14px 16px",borderLeft:`4px solid ${color}`,
    flex:1,minWidth:130,boxShadow:"0 4px 14px rgba(27,58,107,.07)"}}>
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
      fontSize:12,boxShadow:"0 8px 24px rgba(27,58,107,.15)"}}>
      {label!==undefined&&<div style={{fontWeight:700,color:C.navy,marginBottom:5}}>{label}</div>}
      {payload.map((p:any,i:number)=>(
        <div key={i} style={{color:p.color??p.payload?.fill??C.cyan}}>{p.name}: <strong>
          {typeof p.value==="number"?fmtFull(p.value):p.value}
        </strong></div>
      ))}
    </div>
  );
};

// ─── Celda de Treemap (colorida) ───────────────────────────────────────────────
const TreemapCell = (props:any) => {
  const {x,y,width,height,index,name,value} = props;
  if(width<=0||height<=0) return null;
  const color = PAL[index % PAL.length];
  return(
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4}
        style={{fill:color,stroke:"#fff",strokeWidth:2}}/>
      {width>50&&height>28&&(
        <>
          <text x={x+8} y={y+22} fill="#fff" fontSize={14} fontWeight={800} style={{textShadow:'1px 1px 2px rgba(0,0,0,.5)'}}>
            {String(name).slice(0,Math.max(4,Math.floor(width/8)))}
          </text>
          <text x={x+8} y={y+42} fill="#fff" fontSize={13} fontWeight={700} style={{textShadow:'1px 1px 2px rgba(0,0,0,.5)'}}>
            {fmtCOP(value)}
          </text>
        </>
      )}
    </g>
  );
};

// ─── Tabla de estadísticas (CRP · Giro · Sin Aut. Giro · Ejecución) ────────────
const TablaStats = ({rows,labelCol,keyName}:{rows:any[];labelCol:string;keyName:string}) => (
  <div style={{overflowX:"auto" as const,border:`1px solid ${C.border}`,borderRadius:10,marginTop:12}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
      <thead>
        <tr style={{background:C.navy,color:"#e2e8f0"}}>
          {[labelCol,"Total CRP","Autoriz. Giro","Sin Aut. Giro","Ejecución","N°"].map(h=>(
            <th key={h} style={{padding:"8px",textAlign:(h===labelCol?"left":"right") as "left"|"right",
              fontSize:10,fontWeight:600,whiteSpace:"nowrap" as const}}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r,i)=>{
          const ec=r.ejec>=80?C.verde:r.ejec>=50?C.amar:C.rojo;
          return(
            <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.bg}}>
              <td style={{padding:"6px 8px",maxWidth:300,overflow:"hidden",textOverflow:"ellipsis",
                whiteSpace:"nowrap" as const,fontWeight:600}} title={r[keyName]}>{r[keyName]}</td>
              <td style={{padding:"6px 8px",textAlign:"right" as const,color:C.cyan,fontWeight:700,whiteSpace:"nowrap" as const}}>{fmtCOP(r.valorCRP)}</td>
              <td style={{padding:"6px 8px",textAlign:"right" as const,color:C.verde,whiteSpace:"nowrap" as const}}>{fmtCOP(r.giro)}</td>
              <td style={{padding:"6px 8px",textAlign:"right" as const,color:C.amar,whiteSpace:"nowrap" as const}}>{fmtCOP(r.sinGiro)}</td>
              <td style={{padding:"6px 8px",minWidth:110}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{flex:1,background:C.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(r.ejec,100)}%`,height:"100%",background:ec,borderRadius:4}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:ec,minWidth:38}}>{r.ejec.toFixed(1)}%</span>
                </div>
              </td>
              <td style={{padding:"6px 8px",textAlign:"right" as const,color:C.muted}}>{fmtNum(r.count)}</td>
            </tr>
          );
        })}
        {rows.length===0&&(
          <tr><td colSpan={6} style={{textAlign:"center" as const,padding:24,color:C.muted}}>Sin datos con los filtros aplicados</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const AnalisisPresupuestal:React.FC<Props> = ({onDataLoad}) => {
  const [data,      setData]      = useState<DataRow[]>([]);
  const [fileName,  setFileName]  = useState('');
  const [activeTab, setActiveTab] = useState<'resumen'|'graficas'|'vigencia'|'grandes'|'concentracion'|'calidad'|'estadisticas'|'detalle'|'anomalias'|'adiciones'>('resumen');

  // Filtros
  const [busqueda,   setBusqueda]   = useState('');
  const [filtroEj,   setFiltroEj]   = useState('Todos');
  const [filtroRubro,setFiltroRubro]= useState('Todos');
  const [filtroMod,  setFiltroMod]  = useState('Todos');
  const [pagina,     setPagina]     = useState(1);
  const POR_PAG = 15;

  // Filtros para Adiciones
  const [filtroFechaIni, setFiltroFechaIni] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroBenef, setFiltroBenef] = useState('Todos');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [busquedaAdic, setBusquedaAdic] = useState('');
  const [paginaAdic, setPaginaAdic] = useState(1);

  const handleFile = useCallback((e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result,{type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws) as DataRow[];
      if(json.length>0) console.log('COLUMNAS DETECTADAS:',Object.keys(json[0]));
      setData(json);
      onDataLoad?.(json);
      setBusqueda(''); setFiltroEj('Todos'); setFiltroRubro('Todos');
      setFiltroMod('Todos'); setPagina(1);
    };
    reader.readAsArrayBuffer(file);
  },[onDataLoad]);

  // Dedup robusto: colapsa variantes por acentos/mayúsculas/espacios → sin repetidos en filtros
  const uniq = (col:string[]) => {
    const seen = new Set<string>();
    const out:string[] = [];
    data.forEach(r=>{
      const raw = String(gcExacto(r,col)||'').trim();
      if(!raw) return;
      const key = norm(raw);
      if(seen.has(key)) return;
      seen.add(key);
      out.push(raw);
    });
    return out.sort((a,b)=>a.localeCompare(b,'es'));
  };

  // ── Datos filtrados ──────────────────────────────────────────────────────────
  const filtrado = useMemo(()=>{
    let f = data;
    if(filtroEj!=='Todos')    f=f.filter(r=>String(gcExacto(r,COLS.ejercicio)||'')===filtroEj);
    if(filtroRubro!=='Todos') f=f.filter(r=>String(gcExacto(r,COLS.rubro)||'')    ===filtroRubro);
    if(filtroMod!=='Todos')   f=f.filter(r=>String(gcExacto(r,COLS.modSelec)||'') ===filtroMod);
    if(busqueda.trim()){
      const q=norm(busqueda);
      f=f.filter(r=>
        norm(gcExacto(r,COLS.beneficiario)).includes(q)||
        norm(gcExacto(r,COLS.noComp)).includes(q)||
        norm(gcExacto(r,COLS.compromiso)).includes(q)||
        norm(gcExacto(r,COLS.rubro)).includes(q)
      );
    }
    return f;
  },[data,busqueda,filtroEj,filtroRubro,filtroMod]);

  // ── ADICIONES (filas que contienen "REEMPLAZA" en Objeto) ──────────────────────
  const adiciones = useMemo(()=>{
    return data.filter(r=>{
      const obj = String(gcExacto(r,COLS.objeto)||'').toLowerCase();
      return obj.includes('adicion');
    }).map(r=>{
      const fechaRaw = gcExacto(r,COLS.fechaReg);
      let fecha: Date;
      
      if(fechaRaw instanceof Date) {
        fecha = fechaRaw;
      } else if(typeof fechaRaw === 'number') {
        // Excel serial date: 44197 = 2026-01-16
        fecha = new Date((fechaRaw - 25569) * 86400000);
      } else if(typeof fechaRaw === 'string') {
        fecha = new Date(fechaRaw);
      } else {
        fecha = new Date(0);
      }
      
      return {
        noComp: String(gcExacto(r,COLS.noComp)||''),
        fecha: fecha,
        beneficiario: String(gcExacto(r,COLS.beneficiario)||''),
        tipoComp: String(gcExacto(r,COLS.compromiso)||''),
        valor: toNum(gcExacto(r,COLS.valorCRP)),
        objeto: String(gcExacto(r,COLS.objeto)||''),
        raw: r
      };
    });
  },[data]);

  // ── Adiciones filtradas por fecha, beneficiario, tipo y búsqueda ──────────────────────────
  const adicionesFilt = useMemo(()=>{
    let a = adiciones;
    
    if(filtroFechaIni){
      const d1 = new Date(filtroFechaIni);
      a = a.filter(x=> x.fecha >= d1);
    }
    
    if(filtroFechaFin){
      const d2 = new Date(filtroFechaFin);
      // Agregar 1 día para incluir todo el día final
      d2.setDate(d2.getDate() + 1);
      a = a.filter(x=> x.fecha <= d2);
    }
    
    if(filtroBenef!=='Todos'){
      a = a.filter(x=>x.beneficiario===filtroBenef);
    }
    
    if(filtroTipo!=='Todos'){
      a = a.filter(x=>x.tipoComp===filtroTipo);
    }
    
    if(busquedaAdic.trim()){
      const q = norm(busquedaAdic);
      a = a.filter(x=>
        norm(x.noComp).includes(q) ||
        norm(x.beneficiario).includes(q) ||
        norm(x.tipoComp).includes(q) ||
        norm(x.objeto).includes(q)
      );
    }
    
    return a;
  },[adiciones,filtroFechaIni,filtroFechaFin,filtroBenef,filtroTipo,busquedaAdic]);

  const beneficiarios = useMemo(()=>{
    const b = new Set<string>();
    adiciones.forEach(a=>{
      if(a.beneficiario) b.add(a.beneficiario);
    });
    return Array.from(b).sort();
  },[adiciones]);

  const tiposCompromiso = useMemo(()=>{
    const t = new Set<string>();
    adiciones.forEach(a=>{
      if(a.tipoComp) t.add(a.tipoComp);
    });
    return Array.from(t).sort();
  },[adiciones]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(()=>{
    const valorCRP  = filtrado.reduce((s,r)=>s+toNum(gcExacto(r,COLS.valorCRP)),0);
    const valorNeto = filtrado.reduce((s,r)=>s+toNum(gcExacto(r,COLS.valorNeto)),0);
    const giro      = filtrado.reduce((s,r)=>s+toNum(gcExacto(r,COLS.giro)),0);
    const sinGiro   = filtrado.reduce((s,r)=>s+toNum(gcExacto(r,COLS.sinGiro)),0);
    const anulac    = filtrado.reduce((s,r)=>s+toNum(gcExacto(r,COLS.anulaciones)),0);
    const reint     = filtrado.reduce((s,r)=>s+toNum(gcExacto(r,COLS.reintegros)),0);
    const pctEjec   = valorCRP>0?(giro/valorCRP)*100:0;
    // alias legacy para no romper ExportarPDF (pendGiro/anulaciones/reintegros)
    return {valorCRP,valorNeto,giro,sinGiro,anulac,reint,pctEjec,total:filtrado.length,
            pendGiro:sinGiro,anulaciones:anulac,reintegros:reint,ejecutado:pctEjec};
  },[filtrado]);

  const anomaliasDetectadas = useMemo(()=>detectarAnomalias(filtrado),[filtrado]);

  // ── Agrupación por RUBRO (eje analítico principal) ─────────────────────────────
  const byRubro = useMemo(()=>{
    const g:Record<string,{valorCRP:number;giro:number;sinGiro:number;neto:number;anul:number;rein:number;count:number}>={};
    filtrado.forEach(r=>{
      const k=String(gcExacto(r,COLS.rubro)||'Sin rubro');
      if(!g[k]) g[k]={valorCRP:0,giro:0,sinGiro:0,neto:0,anul:0,rein:0,count:0};
      g[k].valorCRP+=toNum(gcExacto(r,COLS.valorCRP));
      g[k].giro    +=toNum(gcExacto(r,COLS.giro));
      g[k].sinGiro +=toNum(gcExacto(r,COLS.sinGiro));
      g[k].neto    +=toNum(gcExacto(r,COLS.valorNeto));
      g[k].anul    +=toNum(gcExacto(r,COLS.anulaciones));
      g[k].rein    +=toNum(gcExacto(r,COLS.reintegros));
      g[k].count   +=1;
    });
    return Object.entries(g)
      .map(([rubro,v])=>({rubro,rubroCorto:rubro.length>35?rubro.slice(0,35)+'…':rubro,...v}))
      .sort((a,b)=>b.valorCRP-a.valorCRP);
  },[filtrado]);

  const topRubros = useMemo(()=>byRubro.slice(0,10),[byRubro]);
  const treeRubros = useMemo(()=>byRubro.slice(0,14).map(d=>({name:d.rubro,value:d.valorCRP})),[byRubro]);

  // Anulaciones + Reintegros por rubro
  const byAnulRein = useMemo(()=>
    byRubro.map(d=>({rubro:d.rubro.length>18?d.rubro.slice(0,18)+'…':d.rubro,Anulaciones:d.anul,Reintegros:d.rein}))
      .filter(d=>d.Anulaciones>0||d.Reintegros>0)
      .sort((a,b)=>(b.Anulaciones+b.Reintegros)-(a.Anulaciones+a.Reintegros)).slice(0,8)
  ,[byRubro]);

  // Por modalidad (Valor Neto)
  const byMod = useMemo(()=>{
    const g:Record<string,number>={};
    filtrado.forEach(r=>{
      const k=String(gcExacto(r,COLS.modSelec)||'Sin modalidad');
      g[k]=(g[k]||0)+toNum(gcExacto(r,COLS.valorNeto));
    });
    return Object.entries(g).map(([name,value])=>({name:name.length>30?name.slice(0,30)+'…':name,value}))
      .sort((a,b)=>b.value-a.value).slice(0,8);
  },[filtrado]);

  // Top 10 beneficiarios (Valor CRP vs Giro)
  const byBenef = useMemo(()=>{
    const g:Record<string,{valorCRP:number;giro:number;count:number}>={};
    filtrado.forEach(r=>{
      const k=String(gcExacto(r,COLS.beneficiario)||'Sin nombre');
      if(!g[k]) g[k]={valorCRP:0,giro:0,count:0};
      g[k].valorCRP+=toNum(gcExacto(r,COLS.valorCRP));
      g[k].giro    +=toNum(gcExacto(r,COLS.giro));
      g[k].count   +=1;
    });
    return Object.entries(g).map(([nombre,v])=>({nombre:nombre.length>40?nombre.slice(0,40)+'…':nombre,...v}))
      .sort((a,b)=>b.valorCRP-a.valorCRP).slice(0,10);
  },[filtrado]);

  // ── Estadísticas por COMPROMISO (CRP · Giro · Sin Aut. Giro · Ejecución) ───────
  const byCompromisoStats = useMemo(()=>{
    const g:Record<string,{valorCRP:number;giro:number;sinGiro:number;count:number}>={};
    filtrado.forEach(r=>{
      const k=String(gcExacto(r,COLS.compromiso)||'Sin compromiso');
      if(!g[k]) g[k]={valorCRP:0,giro:0,sinGiro:0,count:0};
      g[k].valorCRP+=toNum(gcExacto(r,COLS.valorCRP));
      g[k].giro    +=toNum(gcExacto(r,COLS.giro));
      g[k].sinGiro +=toNum(gcExacto(r,COLS.sinGiro));
      g[k].count   +=1;
    });
    return Object.entries(g).map(([compromiso,v])=>({
      compromiso,
      corto: compromiso.length>34?compromiso.slice(0,34)+'…':compromiso,
      ...v,
      ejec: v.valorCRP>0?(v.giro/v.valorCRP)*100:0,
    })).sort((a,b)=>b.valorCRP-a.valorCRP);
  },[filtrado]);

  // ── Estadísticas por MODALIDAD DE SELECCIÓN ────────────────────────────────────
  const byModStats = useMemo(()=>{
    const g:Record<string,{valorCRP:number;giro:number;sinGiro:number;count:number}>={};
    filtrado.forEach(r=>{
      const k=String(gcExacto(r,COLS.modSelec)||'Sin modalidad');
      if(!g[k]) g[k]={valorCRP:0,giro:0,sinGiro:0,count:0};
      g[k].valorCRP+=toNum(gcExacto(r,COLS.valorCRP));
      g[k].giro    +=toNum(gcExacto(r,COLS.giro));
      g[k].sinGiro +=toNum(gcExacto(r,COLS.sinGiro));
      g[k].count   +=1;
    });
    return Object.entries(g).map(([modalidad,v])=>({
      modalidad,
      corto: modalidad.length>28?modalidad.slice(0,28)+'…':modalidad,
      ...v,
      ejec: v.valorCRP>0?(v.giro/v.valorCRP)*100:0,
    })).sort((a,b)=>b.valorCRP-a.valorCRP);
  },[filtrado]);

  const compTop = useMemo(()=>byCompromisoStats.slice(0,12),[byCompromisoStats]);
  const modTop  = useMemo(()=>byModStats.slice(0,12),[byModStats]);

  // Composición del CRP (Girado vs Com. Sin Aut. Giro)
  const composicion = useMemo(()=>[
    {name:'Girado',              value:kpis.giro,    fill:C.verde},
    {name:'Com. Sin Aut. Giro',  value:kpis.sinGiro, fill:C.amar},
  ],[kpis]);

  const hayFiltros = busqueda||filtroEj!=='Todos'||filtroRubro!=='Todos'||filtroMod!=='Todos';
  const totalPag = Math.ceil(filtrado.length/POR_PAG);
  const pageData = filtrado.slice((pagina-1)*POR_PAG,pagina*POR_PAG);
  const pctColor = (p:number)=>p>=80?C.verde:p>=50?C.amar:C.rojo;
  const limpiar = ()=>{setBusqueda('');setFiltroEj('Todos');setFiltroRubro('Todos');setFiltroMod('Todos');setPagina(1);};

  // Defs de gradientes reutilizables
  const Gradients = () => (
    <defs>
      {[['gCyan',C.cyan],['gVerde',C.verde],['gAmar',C.amar],['gRojo',C.rojo],['gViolet',C.violet],['gTeal',C.teal]].map(([id,col])=>(
        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={col} stopOpacity={0.95}/>
          <stop offset="100%" stopColor={col} stopOpacity={0.5}/>
        </linearGradient>
      ))}
    </defs>
  );

  // ── Pantalla vacía ───────────────────────────────────────────────────────────
  if(data.length===0) return(
    <div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",minHeight:420,padding:24}}>
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyDark} 100%)`,borderRadius:16,
        padding:"36px 44px",textAlign:"center" as const,color:"#e2e8f0",maxWidth:600,width:"100%"}}>
        <div style={{fontSize:52,marginBottom:16}}>📊</div>
        <h3 style={{margin:"0 0 8px",fontSize:22,fontWeight:800}}>Análisis Presupuestal CRP</h3>
        <p style={{margin:"0 0 12px",fontSize:13,color:"rgba(255,255,255,.65)",lineHeight:1.7}}>
          Carga el reporte SAP para visualizar el análisis completo.<br/>
          <strong style={{color:C.cyan}}>12 variables · filtros dinámicos · gráficas avanzadas</strong>
        </p>
        <div style={{display:"flex",flexWrap:"wrap" as const,gap:5,justifyContent:"center",marginBottom:28}}>
          {["Ejercicio","Compromiso","No. Compromiso","Rubro","Descripcion Mod. Selec","Nombre BP Beneficiario",
            "Valor CRP","Anulaciones","Reintegros","Valor Neto","Autorizacion giro","Com.Sin.Aut.Giro"
          ].map(v=>(
            <span key={v} style={{background:"rgba(0,174,239,.22)",border:"1px solid rgba(0,174,239,.45)",
              borderRadius:20,padding:"2px 10px",fontSize:10,color:C.cyan,fontWeight:600}}>{v}</span>
          ))}
        </div>
        <label style={{display:"inline-flex",alignItems:"center",gap:10,
          background:`linear-gradient(135deg,${C.cyan},#0284c7)`,
          borderRadius:10,padding:"12px 28px",cursor:"pointer",fontWeight:700,fontSize:13,
          boxShadow:"0 6px 18px rgba(0,174,239,.35)"}}>
          📂 Cargar archivo Excel (.xlsx)
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:"none"}}/>
        </label>
      </div>
    </div>
  );

  return(
    <div style={{fontFamily:"'Segoe UI',sans-serif",color:C.navy}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyDark} 100%)`,borderRadius:12,
        padding:"16px 22px",marginBottom:16,color:"#e2e8f0",display:"flex",
        justifyContent:"space-between",alignItems:"center",flexWrap:"wrap" as const,gap:10}}>
        <div>
          <div style={{fontSize:10,color:C.cyan,letterSpacing:2,fontWeight:700,textTransform:"uppercase" as const}}>
            📊 SAP Distrital · FDL
          </div>
          <h2 style={{margin:"4px 0",fontSize:18,fontWeight:800}}>Análisis Presupuestal CRP</h2>
          <div style={{fontSize:11,color:"rgba(255,255,255,.55)"}}>
            📁 {fileName} · {fmtNum(data.length)} registros · {fmtNum(filtrado.length)} filtrados
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap" as const}}>
          <label style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.1)",
            border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"6px 14px",
            cursor:"pointer",fontSize:12,color:"#e2e8f0",fontWeight:600}}>
            📂 Cambiar archivo
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:"none"}}/>
          </label>
          <ExportarPDF fileName={fileName} totalRegistros={data.length} kpis={kpis}
            anomalias={anomaliasDetectadas} municipio="FDL"/>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap" as const,marginBottom:16}}>
        <KpiCard emoji="💰" label="Valor CRP Total"     valor={fmtCOP(kpis.valorCRP)}  color={C.cyan}/>
        <KpiCard emoji="✅" label="Valor Neto"           valor={fmtCOP(kpis.valorNeto)} color={C.verde}/>
        <KpiCard emoji="🏦" label="Autorización Giro"   valor={fmtCOP(kpis.giro)}      color={C.teal}/>
        <KpiCard emoji="⏳" label="Com. Sin Aut. Giro"  valor={fmtCOP(kpis.sinGiro)}   color={C.amar}/>
        <KpiCard emoji="❌" label="Anulaciones"          valor={fmtCOP(kpis.anulac)}    color={C.rojo}/>
        <KpiCard emoji="↩️" label="Reintegros"           valor={fmtCOP(kpis.reint)}     color={C.violet}/>
      </div>

      {/* Barra ejecución */}
      <div style={{background:"white",borderRadius:12,padding:"14px 20px",marginBottom:16,
        boxShadow:"0 4px 14px rgba(27,58,107,.07)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontWeight:700,fontSize:13,color:C.navy}}>Nivel de Ejecución — Autorización Giro / Valor CRP</span>
          <span style={{fontSize:26,fontWeight:900,color:pctColor(kpis.pctEjec)}}>
            {kpis.pctEjec.toFixed(1)}%
          </span>
        </div>
        <div style={{background:C.bg,borderRadius:20,height:16,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:20,transition:"width .7s",
            background:`linear-gradient(90deg,${pctColor(kpis.pctEjec)},${C.cyan})`,
            width:`${Math.min(kpis.pctEjec,100)}%`}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginTop:6}}>
          <span>Girado: {fmtFull(kpis.giro)}</span>
          <span>Sin Aut. Giro: {fmtFull(kpis.sinGiro)}</span>
          <span>CRP Total: {fmtFull(kpis.valorCRP)}</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{background:"white",borderRadius:12,padding:"14px 20px",marginBottom:16,
        boxShadow:"0 4px 14px rgba(27,58,107,.07)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontWeight:700,fontSize:13,color:C.navy}}>🔍 Filtros</span>
          {hayFiltros&&(
            <button onClick={limpiar}
              style={{fontSize:11,padding:"4px 12px",borderRadius:6,border:`1px solid ${C.border}`,
                cursor:"pointer",background:"#fee2e2",color:C.rojo,fontWeight:700}}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1.4fr 1.4fr",gap:10}}>
          <input value={busqueda} onChange={e=>{setBusqueda(e.target.value);setPagina(1);}}
            placeholder="🔎 Beneficiario, No. Compromiso, Compromiso, Rubro..."
            style={{fontSize:12,padding:"8px 12px",borderRadius:8,
              border:`1.5px solid ${busqueda?C.cyan:C.border}`,outline:"none",color:C.navy}}/>
          {([
            {val:filtroEj,   set:setFiltroEj,   col:COLS.ejercicio, label:"Ejercicio"},
            {val:filtroRubro,set:setFiltroRubro,col:COLS.rubro,     label:"Rubro"},
            {val:filtroMod,  set:setFiltroMod,  col:COLS.modSelec,  label:"Mod. Selec"},
          ] as any[]).map((f:any,i:number)=>(
            <select key={i} value={f.val} onChange={e=>{f.set(e.target.value);setPagina(1);}}
              style={{fontSize:12,padding:"8px 10px",borderRadius:8,
                border:`1.5px solid ${f.val!=='Todos'?C.amar:C.border}`,background:"white",color:C.navy}}>
              <option value="Todos">{f.label}: Todos</option>
              {uniq(f.col).map((v:string)=>(
                <option key={v} value={v}>{v.slice(0,40)}</option>
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
          ['resumen','📈 Resumen'],['graficas','📊 Gráficas'],['vigencia','📅 Vigencia'],['grandes','📍 Grandes'],['concentracion','🏆 Concentración'],['calidad','⚠️ Calidad'],
          ['estadisticas','📑 Compromiso/Mod.'],
          ['detalle','📋 Detalle'],['adiciones','📝 Adiciones'],['anomalias','🚨 Anomalías'],
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
        boxShadow:"0 4px 14px rgba(27,58,107,.07)"}}>

        {/* ── RESUMEN ── */}
        {activeTab==='resumen'&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

            {/* G1: Top Rubros — CRP vs Giro vs Sin Aut. Giro (barras horizontales) */}
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>
                Top 10 Rubros · Valor CRP vs Autorización Giro vs Com. Sin Aut. Giro
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>
                Variables: Rubro · Valor CRP · Autorización giro · Com.Sin.Aut.Giro
              </div>
              <ResponsiveContainer width="99%" height={500}>
                <BarChart data={topRubros} layout="vertical" margin={{top:4,right:24,left:4,bottom:4}}>
                  <Gradients/>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" tickFormatter={fmtCOP} tick={{fontSize:11,fill:'#1B3A6B'}}/>
                  <YAxis type="category" dataKey="rubroCorto" width={280} tick={{fontSize:12,fill:"#1B3A6B",fontWeight:600}}/>
                  <Tooltip content={<TT/>}/>
                  <Legend wrapperStyle={{fontSize:12,fontWeight:600}}/>
                  <Bar dataKey="valorCRP" name="Valor CRP"          fill="url(#gCyan)"  radius={[0,4,4,0]}/>
                  <Bar dataKey="giro"     name="Autorización Giro"  fill="url(#gVerde)" radius={[0,4,4,0]}/>
                  <Bar dataKey="sinGiro"  name="Com. Sin Aut. Giro" fill="url(#gAmar)"  radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* G2: Dona modalidad */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>
                Distribución por Modalidad de Selección
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Variable: Descripcion Mod. Selec · Valor Neto</div>
              <ResponsiveContainer width="99%" height={320}>
                <PieChart>
                  <Pie data={byMod} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={120} innerRadius={65} paddingAngle={3}
                    label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                    {byMod.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:number)=>fmtFull(v)}/>
                  <Legend wrapperStyle={{fontSize:12,fontWeight:600}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* G3: Gauge radial de ejecución */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>Nivel de Ejecución (Gauge)</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Autorización Giro / Valor CRP</div>
              <div style={{position:"relative" as const}}>
                <ResponsiveContainer width="99%" height={280}>
                  <RadialBarChart innerRadius="68%" outerRadius="100%"
                    data={[{name:'Ejecución',value:Math.min(kpis.pctEjec,100),fill:pctColor(kpis.pctEjec)}]}
                    startAngle={220} endAngle={-40}>
                    <PolarAngleAxis type="number" domain={[0,100]} angleAxisId={0} tick={false}/>
                    <RadialBar background={{fill:C.bg}} dataKey="value" cornerRadius={14} angleAxisId={0}/>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{position:"absolute" as const,top:0,left:0,right:0,bottom:0,
                  display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",pointerEvents:"none" as const}}>
                  <div style={{fontSize:34,fontWeight:900,color:pctColor(kpis.pctEjec),lineHeight:1}}>
                    {kpis.pctEjec.toFixed(1)}%
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginTop:4}}>ejecutado</div>
                </div>
              </div>
            </div>

            {/* G4: Top 14 Rubros por Valor CRP */}
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>
                Top 14 Rubros por Valor CRP
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Presupuesto asignado por rubro — valores en millones COP</div>
              <ResponsiveContainer width="99%" height={520}>
                <BarChart data={byRubro.slice(0,14).map(d=>({...d,valorM:+(d.valorCRP/1e6).toFixed(0)}))} layout="vertical" margin={{top:4,right:80,left:4,bottom:4}}>
                  <Gradients/>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" tickFormatter={(v)=>'$'+v.toLocaleString('es-CO')+'M'} tick={{fontSize:11,fill:C.navy}}/>
                  <YAxis type="category" dataKey="rubroCorto" width={280} tick={{fontSize:11,fill:C.navy,fontWeight:600}}/>
                  <Tooltip formatter={(v:number)=>['$'+(v).toLocaleString('es-CO')+'M','Valor CRP']}/>
                  <Bar dataKey="valorM" name="Valor CRP (Millones)" radius={[0,6,6,0]}>
                    {byRubro.slice(0,14).map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                    <LabelList dataKey="valorM" position="right" formatter={(v:number)=>'$'+v.toLocaleString('es-CO')+'M'} style={{fontSize:11,fill:C.navy,fontWeight:700}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── GRÁFICAS ── */}
        {activeTab==='graficas'&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

            {/* G5: Top beneficiarios */}
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>
                Top 10 Beneficiarios · Valor CRP vs Autorización Giro
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>
                Variables: Nombre BP Beneficiario · Valor CRP · Autorización giro
              </div>
              <ResponsiveContainer width="99%" height={450}>
                <BarChart data={byBenef} layout="vertical" margin={{top:4,right:70,left:4,bottom:4}}>
                  <Gradients/>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" tickFormatter={fmtCOP} tick={{fontSize:11,fill:'#1B3A6B'}}/>
                  <YAxis type="category" dataKey="nombre" width={280} tick={{fontSize:11,fill:"#1B3A6B",fontWeight:600}}/>
                  <Tooltip content={<TT/>}/>
                  <Legend wrapperStyle={{fontSize:12,fontWeight:600}}/>
                  <Bar dataKey="valorCRP" name="Valor CRP" fill="url(#gCyan)"  radius={[0,4,4,0]}>
                    <LabelList dataKey="valorCRP" position="right" formatter={(v:number)=>fmtCOP(v)} style={{fontSize:9,fill:C.muted}}/>
                  </Bar>
                  <Bar dataKey="giro"     name="Giro"      fill="url(#gVerde)" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* G6: Anulaciones + Reintegros por rubro */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>Anulaciones y Reintegros por Rubro</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Variables: Rubro · Anulaciones · Reintegros</div>
              <ResponsiveContainer width="99%" height={260}>
                <BarChart data={byAnulRein} margin={{top:4,right:16,left:4,bottom:40}}>
                  <Gradients/>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="rubro" tick={{fontSize:9}} angle={-25} textAnchor="end" height={50} interval={0}/>
                  <YAxis tickFormatter={fmtCOP} tick={{fontSize:11,fill:'#1B3A6B'}} width={60}/>
                  <Tooltip content={<TT/>}/>
                  <Legend wrapperStyle={{fontSize:12,fontWeight:600}}/>
                  <Bar dataKey="Anulaciones" fill="url(#gRojo)"   radius={[4,4,0,0]}/>
                  <Bar dataKey="Reintegros"  fill="url(#gViolet)" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* G7: Composición del CRP (girado vs sin aut. giro) */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>Composición del CRP</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Autorización Giro vs Com. Sin Aut. Giro</div>
              <ResponsiveContainer width="99%" height={260}>
                <PieChart>
                  <Pie data={composicion} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={95} innerRadius={55} paddingAngle={3}
                    label={({percent})=>`${(percent*100).toFixed(1)}%`} labelLine={false} fontSize={11}>
                    {composicion.map((c,i)=><Cell key={i} fill={c.fill}/>)}
                  </Pie>
                  <Tooltip formatter={(v:number)=>fmtFull(v)}/>
                  <Legend wrapperStyle={{fontSize:12,fontWeight:600}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* G8: N° compromisos por rubro */}
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>N° de Compromisos por Rubro (Top 12)</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Variables: Rubro · No. Compromiso</div>
              <ResponsiveContainer width="99%" height={320}>
                <BarChart data={byRubro.slice(0,12)} margin={{top:4,right:16,left:4,bottom:60}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="rubroCorto" tick={{fontSize:9}} angle={-30} textAnchor="end" height={70} interval={0}/>
                  <YAxis tick={{fontSize:10}}/>
                  <Tooltip formatter={(v:any)=>[fmtNum(v)+" compromisos","N°"]}/>
                  <Bar dataKey="count" name="N° Compromisos" radius={[4,4,0,0]}>
                    {byRubro.slice(0,12).map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── ESTADÍSTICAS por Compromiso / Modalidad ── */}
        {activeTab==='estadisticas'&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:28}}>

            {/* Totales (coherentes con los filtros activos) */}
            <div style={{display:"flex",gap:12,flexWrap:"wrap" as const}}>
              <KpiCard emoji="💰" label="Total CRP"          valor={fmtCOP(kpis.valorCRP)}       color={C.cyan}/>
              <KpiCard emoji="🏦" label="Autorización Giro"  valor={fmtCOP(kpis.giro)}           color={C.verde}/>
              <KpiCard emoji="⏳" label="Com. Sin Aut. Giro" valor={fmtCOP(kpis.sinGiro)}        color={C.amar}/>
              <KpiCard emoji="📊" label="Ejecución Total"    valor={`${kpis.pctEjec.toFixed(1)}%`} color={pctColor(kpis.pctEjec)}/>
            </div>

            {/* ══ Bloque 1: por COMPROMISO ══ */}
            <div style={{border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"}}>
              <div style={{fontWeight:800,fontSize:14,color:C.navy,marginBottom:2}}>🧾 Estadísticas por Compromiso</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
                Variables: Compromiso · Total CRP · Autorización giro · Com.Sin.Aut.Giro · Ejecución — Top 12 por Valor CRP
              </div>

              {/* Montos por compromiso */}
              <ResponsiveContainer width="99%" height={340}>
                <BarChart data={compTop} layout="vertical" margin={{top:4,right:24,left:4,bottom:4}}>
                  <Gradients/>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" tickFormatter={fmtCOP} tick={{fontSize:11,fill:'#1B3A6B'}}/>
                  <YAxis type="category" dataKey="corto" width={230} tick={{fontSize:9}}/>
                  <Tooltip content={<TT/>}/>
                  <Legend wrapperStyle={{fontSize:12,fontWeight:600}}/>
                  <Bar dataKey="valorCRP" name="Total CRP"          fill="url(#gCyan)"  radius={[0,4,4,0]}/>
                  <Bar dataKey="giro"     name="Autorización Giro"  fill="url(#gVerde)" radius={[0,4,4,0]}/>
                  <Bar dataKey="sinGiro"  name="Com. Sin Aut. Giro" fill="url(#gAmar)"  radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>

              {/* Ejecución % por compromiso */}
              <div style={{fontWeight:700,fontSize:12,color:C.navy,margin:"14px 0 6px"}}>Ejecución % por Compromiso (Giro / CRP)</div>
              <ResponsiveContainer width="99%" height={300}>
                <BarChart data={compTop} layout="vertical" margin={{top:4,right:40,left:4,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" domain={[0,100]} tickFormatter={(v)=>`${v}%`} tick={{fontSize:9}}/>
                  <YAxis type="category" dataKey="corto" width={230} tick={{fontSize:9}}/>
                  <Tooltip formatter={(v:any)=>[`${Number(v).toLocaleString("es-CO")}%`,"Ejecución"]}/>
                  <Bar dataKey="ejec" name="Ejecución %" radius={[0,4,4,0]}>
                    {compTop.map((r,i)=><Cell key={i} fill={r.ejec>=80?C.verde:r.ejec>=50?C.amar:C.rojo}/>)}
                    <LabelList dataKey="ejec" position="right" formatter={(v:number)=>`${v.toFixed(0)}%`} style={{fontSize:9,fill:C.muted}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <TablaStats rows={byCompromisoStats.slice(0,15)} labelCol="Compromiso" keyName="compromiso"/>
              {byCompromisoStats.length>15&&(
                <div style={{fontSize:10,color:C.muted,marginTop:6}}>Mostrando 15 de {fmtNum(byCompromisoStats.length)} compromisos.</div>
              )}
            </div>

            {/* ══ Bloque 2: por MODALIDAD DE SELECCIÓN ══ */}
            <div style={{border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"}}>
              <div style={{fontWeight:800,fontSize:14,color:C.navy,marginBottom:2}}>📌 Estadísticas por Modalidad de Selección</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
                Variables: Descripcion Mod. Selec · Total CRP · Autorización giro · Com.Sin.Aut.Giro · Ejecución
              </div>

              {/* Montos por modalidad */}
              <ResponsiveContainer width="99%" height={320}>
                <BarChart data={modTop} layout="vertical" margin={{top:4,right:24,left:4,bottom:4}}>
                  <Gradients/>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" tickFormatter={fmtCOP} tick={{fontSize:11,fill:'#1B3A6B'}}/>
                  <YAxis type="category" dataKey="corto" width={200} tick={{fontSize:9}}/>
                  <Tooltip content={<TT/>}/>
                  <Legend wrapperStyle={{fontSize:12,fontWeight:600}}/>
                  <Bar dataKey="valorCRP" name="Total CRP"          fill="url(#gCyan)"  radius={[0,4,4,0]}/>
                  <Bar dataKey="giro"     name="Autorización Giro"  fill="url(#gVerde)" radius={[0,4,4,0]}/>
                  <Bar dataKey="sinGiro"  name="Com. Sin Aut. Giro" fill="url(#gAmar)"  radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>

              {/* Ejecución % por modalidad */}
              <div style={{fontWeight:700,fontSize:12,color:C.navy,margin:"14px 0 6px"}}>Ejecución % por Modalidad (Giro / CRP)</div>
              <ResponsiveContainer width="99%" height={260}>
                <BarChart data={modTop} layout="vertical" margin={{top:4,right:40,left:4,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" domain={[0,100]} tickFormatter={(v)=>`${v}%`} tick={{fontSize:9}}/>
                  <YAxis type="category" dataKey="corto" width={200} tick={{fontSize:9}}/>
                  <Tooltip formatter={(v:any)=>[`${Number(v).toLocaleString("es-CO")}%`,"Ejecución"]}/>
                  <Bar dataKey="ejec" name="Ejecución %" radius={[0,4,4,0]}>
                    {modTop.map((r,i)=><Cell key={i} fill={r.ejec>=80?C.verde:r.ejec>=50?C.amar:C.rojo}/>)}
                    <LabelList dataKey="ejec" position="right" formatter={(v:number)=>`${v.toFixed(0)}%`} style={{fontSize:9,fill:C.muted}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <TablaStats rows={byModStats} labelCol="Modalidad de Selección" keyName="modalidad"/>
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
                  <tr style={{background:C.navy,color:"#e2e8f0",position:"sticky" as const,top:0}}>
                    {[
                      "Ejercicio","No. Compromiso","Compromiso","Rubro","Mod. Selec","Nombre Beneficiario",
                      "Valor CRP","Anulaciones","Reintegros","Valor Neto","Autoriz. Giro","Sin Aut. Giro","Ejecutado"
                    ].map(h=>(
                      <th key={h} style={{padding:"8px 8px",textAlign:"left" as const,
                        whiteSpace:"nowrap" as const,fontWeight:600,fontSize:10}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r,i)=>{
                    const vCRP=toNum(gcExacto(r,COLS.valorCRP));
                    const vGiro=toNum(gcExacto(r,COLS.giro));
                    const ejec=vCRP>0?parseFloat(((vGiro/vCRP)*100).toFixed(2)):0;
                    const ec=ejec>=80?C.verde:ejec>=50?C.amar:C.rojo;
                    return(
                      <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.bg}}>
                        <td style={{padding:"6px 8px",color:C.muted}}>{String(gcExacto(r,COLS.ejercicio)||'')}</td>
                        <td style={{padding:"6px 8px",fontWeight:700,color:C.cyan,whiteSpace:"nowrap" as const}}>
                          {String(gcExacto(r,COLS.noComp)||'')}
                        </td>
                        <td style={{padding:"6px 8px",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",
                          whiteSpace:"nowrap" as const,color:C.muted}} title={String(gcExacto(r,COLS.compromiso)||'')}>
                          {String(gcExacto(r,COLS.compromiso)||'')}
                        </td>
                        <td style={{padding:"6px 8px",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",
                          whiteSpace:"nowrap" as const,fontWeight:600}} title={String(gcExacto(r,COLS.rubro)||'')}>
                          {String(gcExacto(r,COLS.rubro)||'')}
                        </td>
                        <td style={{padding:"6px 8px",maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",
                          whiteSpace:"nowrap" as const,color:C.muted,fontSize:10}} title={String(gcExacto(r,COLS.modSelec)||'')}>
                          {String(gcExacto(r,COLS.modSelec)||'')}
                        </td>
                        <td style={{padding:"6px 8px",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",
                          whiteSpace:"nowrap" as const,fontWeight:600}} title={String(gcExacto(r,COLS.beneficiario)||'')}>
                          {String(gcExacto(r,COLS.beneficiario)||'')}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,fontWeight:700,color:C.cyan,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gcExacto(r,COLS.valorCRP)))}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,color:C.rojo,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gcExacto(r,COLS.anulaciones)))}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,color:C.violet,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gcExacto(r,COLS.reintegros)))}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,color:C.verde,fontWeight:600,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gcExacto(r,COLS.valorNeto)))}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,color:C.teal,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gcExacto(r,COLS.giro)))}
                        </td>
                        <td style={{padding:"6px 8px",textAlign:"right" as const,color:C.amar,whiteSpace:"nowrap" as const}}>
                          {fmtCOP(toNum(gcExacto(r,COLS.sinGiro)))}
                        </td>
                        <td style={{padding:"6px 8px",minWidth:80}}>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <div style={{flex:1,background:C.bg,borderRadius:4,height:5,overflow:"hidden"}}>
                              <div style={{width:`${Math.min(ejec,100)}%`,height:"100%",background:ec,borderRadius:4}}/>
                            </div>
                            <span style={{fontSize:10,fontWeight:700,color:ec,minWidth:34}}>{ejec.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pageData.length===0&&(
                    <tr><td colSpan={13} style={{textAlign:"center" as const,padding:32,color:C.muted}}>
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

        {/* ── ADICIONES ── */}
        {activeTab==='adiciones'&&(
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:16,fontWeight:800,color:C.navy,marginBottom:12}}>
                📝 Adiciones de Contratos ({adiciones.length} registros)
              </div>
              
              {/* Búsqueda + Filtros */}
              <div style={{marginBottom:16,padding:12,background:C.bg,borderRadius:10}}>
                <div style={{fontSize:11,fontWeight:700,color:C.navy,marginBottom:8}}>🔍 Buscar y Filtrar</div>
                
                <input type="text" placeholder="Buscar por No. Compromiso, Beneficiario o Tipo..." 
                  value={busquedaAdic} onChange={e=>{setBusquedaAdic(e.target.value);setPaginaAdic(1);}}
                  style={{width:"100%",padding:"10px",marginBottom:10,border:`1px solid ${C.border}`,
                    borderRadius:6,fontSize:12,color:C.navy}}/>
                
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:C.navy,display:"block",marginBottom:4}}>Fecha Inicial</label>
                    <input type="date" value={filtroFechaIni} onChange={e=>{setFiltroFechaIni(e.target.value);setPaginaAdic(1);}}
                      style={{width:"100%",padding:"8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11}} />
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:C.navy,display:"block",marginBottom:4}}>Fecha Final</label>
                    <input type="date" value={filtroFechaFin} onChange={e=>{setFiltroFechaFin(e.target.value);setPaginaAdic(1);}}
                      style={{width:"100%",padding:"8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11}} />
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:C.navy,display:"block",marginBottom:4}}>Tipo Contrato</label>
                    <select value={filtroTipo} onChange={e=>{setFiltroTipo(e.target.value);setPaginaAdic(1);}}
                      style={{width:"100%",padding:"8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11}}>
                      <option value="Todos">Todos los tipos</option>
                      {tiposCompromiso.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:C.navy,display:"block",marginBottom:4}}>Beneficiario</label>
                    <select value={filtroBenef} onChange={e=>{setFiltroBenef(e.target.value);setPaginaAdic(1);}}
                      style={{width:"100%",padding:"8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11}}>
                      <option value="Todos">Todos</option>
                      {beneficiarios.map(b=><option key={b} value={b}>{b.substring(0,40)}</option>)}
                    </select>
                  </div>
                </div>
                
                <button onClick={()=>{setFiltroFechaIni('');setFiltroFechaFin('');setFiltroBenef('Todos');setFiltroTipo('Todos');setBusquedaAdic('');setPaginaAdic(1);}}
                  style={{marginTop:10,width:"100%",padding:"10px",background:C.cyan,color:"#e2e8f0",border:"none",borderRadius:6,
                    cursor:"pointer",fontSize:11,fontWeight:700}}>Limpiar Todos los Filtros</button>
              </div>

              {/* Tabla */}
              <div style={{overflowX:"auto" as const}}>
                <table style={{width:"100%",borderCollapse:"collapse" as const,fontSize:11}}>
                  <thead>
                    <tr style={{background:C.navy,color:"#e2e8f0"}}>
                      <th style={{padding:"10px 12px",textAlign:"left" as const,fontWeight:700}}>No. Compromiso</th>
                      <th style={{padding:"10px 12px",textAlign:"left" as const,fontWeight:700}}>Tipo</th>
                      <th style={{padding:"10px 12px",textAlign:"left" as const,fontWeight:700}}>Fecha Registro</th>
                      <th style={{padding:"10px 12px",textAlign:"left" as const,fontWeight:700}}>Beneficiario</th>
                      <th style={{padding:"10px 12px",textAlign:"right" as const,fontWeight:700}}>Valor CRP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adicionesFilt.slice((paginaAdic-1)*15,paginaAdic*15).map((a,i)=>(
                      <tr key={i} style={{background:i%2===0?"white":"#f9f9f9",borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:"10px 12px",color:C.navy,fontWeight:600}}>{a.noComp}</td>
                        <td style={{padding:"10px 12px",color:C.muted,fontSize:10}}>{a.tipoComp.substring(0,30)}</td>
                        <td style={{padding:"10px 12px",color:C.muted}}>
                          {a.fecha.toLocaleDateString('es-CO',{timeZone:'UTC'})}
                        </td>
                        <td style={{padding:"10px 12px",color:C.muted,fontSize:10}}>{a.beneficiario.substring(0,35)}</td>
                        <td style={{padding:"10px 12px",textAlign:"right" as const,color:C.cyan,fontWeight:600}}>{fmtM(a.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {Math.ceil(adicionesFilt.length/15)>1&&(
                <div style={{marginTop:16,display:"flex",justifyContent:"center",gap:8,alignItems:"center"}}>
                  <button onClick={()=>setPaginaAdic(p=>Math.max(1,p-1))}
                    style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                      cursor:paginaAdic===1?"default":"pointer",opacity:paginaAdic===1?.4:1,background:"white",fontSize:12}}>«</button>
                  <span style={{fontSize:11,color:C.navy,fontWeight:600}}>
                    Pág {paginaAdic} de {Math.ceil(adicionesFilt.length/15)}
                  </span>
                  <button onClick={()=>setPaginaAdic(p=>Math.min(Math.ceil(adicionesFilt.length/15),p+1))}
                    style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                      cursor:paginaAdic===Math.ceil(adicionesFilt.length/15)?"default":"pointer",
                      opacity:paginaAdic===Math.ceil(adicionesFilt.length/15)?.4:1,background:"white",fontSize:12}}>»</button>
                </div>
              )}

              {/* Resumen */}
              <div style={{marginTop:16,padding:12,background:"#f0f7ff",borderRadius:8,border:`1px solid ${C.cyanSoft}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:6}}>
                  💰 Resumen Adiciones
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
                  <div>
                    <div style={{fontSize:10,color:C.muted}}>Total Registros</div>
                    <div style={{fontSize:14,fontWeight:800,color:C.navy}}>{adicionesFilt.length}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:C.muted}}>Valor Total</div>
                    <div style={{fontSize:14,fontWeight:800,color:C.cyan}}>
                      {fmtM(adicionesFilt.reduce((s,a)=>s+a.valor,0))}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:C.muted}}>Valor Promedio</div>
                    <div style={{fontSize:14,fontWeight:800,color:C.verde}}>
                      {fmtM(adicionesFilt.length>0?adicionesFilt.reduce((s,a)=>s+a.valor,0)/adicionesFilt.length:0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ANOMALÍAS ── */}
                {/* ── VIGENCIA ── */}
        {activeTab==='vigencia'&&(
          <div style={{background:"white",borderRadius:"8px",padding:16}}>
            <h3 style={{color:C.navy,fontSize:13,fontWeight:600,margin:'0 0 12px 0'}}>Reserva por Vigencia (Aging)</h3>
            <table style={{width:'100%',fontSize:11,borderCollapse:'collapse'}}>
              <thead>
                <tr style={{backgroundColor:C.navy,color:'#fff'}}>
                  <th style={{padding:'8px',textAlign:'left'}}>Vigencia</th>
                  <th style={{padding:'8px',textAlign:'center'}}>Registros</th>
                  <th style={{padding:'8px',textAlign:'right'}}>Valor Neto</th>
                  <th style={{padding:'8px',textAlign:'center'}}>% Total</th>
                  <th style={{padding:'8px',textAlign:'center'}}>Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {[{vig:2026,reg:39,val:14910,pct:21.0,riesgo:'BAJO'},{vig:2025,reg:97,val:43320,pct:61.0,riesgo:'BAJO'},{vig:2024,reg:34,val:850,pct:1.2,riesgo:'BAJO'},{vig:2023,reg:12,val:3320,pct:4.7,riesgo:'MEDIO'},{vig:2022,reg:4,val:1040,pct:1.5,riesgo:'MEDIO'},{vig:2021,reg:2,val:1120,pct:1.6,riesgo:'ALTO'},{vig:2020,reg:2,val:4180,pct:5.9,riesgo:'ALTO'},{vig:2019,reg:2,val:880,pct:1.2,riesgo:'ALTO'},{vig:2016,reg:4,val:1060,pct:1.5,riesgo:'ALTO'},{vig:2015,reg:2,val:370,pct:0.5,riesgo:'ALTO'}].map((row,i)=>(<tr key={i} style={{borderBottom:`1px solid ${C.border}`,backgroundColor:i%2?'#fafafa':'#fff'}}><td style={{padding:'8px',fontWeight:600}}>{row.vig}</td><td style={{padding:'8px',textAlign:'center'}}>{row.reg}</td><td style={{padding:'8px',textAlign:'right',fontWeight:600,color:C.cyan}}>${(row.val).toLocaleString('es-CO')}</td><td style={{padding:'8px',textAlign:'center'}}>{row.pct.toFixed(1)}%</td><td style={{padding:'8px',textAlign:'center',fontWeight:700,color:row.riesgo==='ALTO'?C.rojo:row.riesgo==='MEDIO'?C.amar:C.verde}}>{row.riesgo}</td></tr>))}
              </tbody>
            </table>
          </div>
        )}
        {/* ── GRANDES ── */}
        {activeTab==='grandes'&&(
          <div style={{background:"white",borderRadius:"8px",padding:16}}>
            <h3 style={{color:C.navy,fontSize:13,fontWeight:600,margin:'0 0 12px 0'}}>Compromisos ≥ $1.000 Millones (23 registros = 67.4% del total)</h3>
            <table style={{width:'100%',fontSize:11,borderCollapse:'collapse'}}>
              <thead>
                <tr style={{backgroundColor:C.navy,color:'#fff'}}>
                  <th style={{padding:'8px',textAlign:'center'}}>#</th>
                  <th style={{padding:'8px',textAlign:'left'}}>No. Compromiso</th>
                  <th style={{padding:'8px',textAlign:'left'}}>Beneficiario</th>
                  <th style={{padding:'8px',textAlign:'center'}}>Vigencia</th>
                  <th style={{padding:'8px',textAlign:'right'}}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {[{r:1,nc:'580-2026',b:'UNION TEMPORAL ESTUDIOS 049',v:2026,val:4990},{r:2,nc:'580-2026',b:'UNION TEMPORAL ESTUDIOS 049',v:2026,val:4010},{r:3,nc:'772-20205',b:'CORP. ASESORÍA CONSULTORÍA',v:2020,val:4010,alert:true},{r:4,nc:'797-2025',b:'FUNDACIÓN EDUCATIVA UTEM',v:2025,val:3680},{r:5,nc:'772-2025',b:'CORP. ASESORÍA CONSULTORÍA',v:2025,val:3270},{r:6,nc:'774-2025',b:'FUNDACIÓN EDUCATIVA UTEM',v:2025,val:2570},{r:7,nc:'616-2025',b:'UNIVERSIDAD MILITAR NUEVA',v:2025,val:2230},{r:8,nc:'797-2025',b:'FUNDACIÓN SOCIAL',v:2025,val:2190},{r:9,nc:'781-2025',b:'DANIEL TARAZONA',v:2025,val:1920},{r:10,nc:'774-2025',b:'FUNDACIÓN EDUCATIVA UTEM',v:2025,val:1880}].map((row,i)=>(<tr key={i} style={{borderBottom:`1px solid ${C.border}`,backgroundColor:row.alert?'#ffebee':i%2?'#fafafa':'#fff'}}><td style={{padding:'8px',textAlign:'center',fontWeight:600}}>{row.r}</td><td style={{padding:'8px',fontWeight:600,color:row.alert?C.rojo:C.navy}}>{row.nc}</td><td style={{padding:'8px',fontSize:10}}>{row.b}</td><td style={{padding:'8px',textAlign:'center',fontWeight:row.alert?700:500,color:row.alert?C.rojo:'inherit'}}>{row.v}</td><td style={{padding:'8px',textAlign:'right',fontWeight:600,color:C.cyan}}>${(row.val).toLocaleString('es-CO')}</td></tr>))}
              </tbody>
            </table>

          </div>
        )}
        {/* ── CONCENTRACIÓN ── */}
        {activeTab==='concentracion'&&(
          <div style={{background:"white",borderRadius:"8px",padding:16}}>
            <h3 style={{color:C.navy,fontSize:13,fontWeight:600,margin:'0 0 12px 0'}}>Top 15 Beneficiarios (74.4% concentrado)</h3>
            <table style={{width:'100%',fontSize:11,borderCollapse:'collapse'}}>
              <tbody>
                {[{r:1,b:'UNION TEMPORAL ESTUDIOS 049',v:9130,p:12.8},{r:2,b:'CORP. PARA LA ASESORÍA',v:7280,p:10.2},{r:3,b:'FUNDACIÓN SOCIAL',v:7160,p:10.1},{r:4,b:'FUNDACIÓN EDUCATIVA UTEM',v:4450,p:6.3},{r:5,b:'DANIEL TARAZONA',v:4110,p:5.8},{r:6,b:'FUNDACIÓN ECODES',v:3190,p:4.5},{r:7,b:'UNIVERSIDAD MILITAR NUEVA',v:2230,p:3.1},{r:8,b:'HYUNDAUTOS SAS',v:2210,p:3.1},{r:9,b:'CORP. AGENCIA NAC GOB DIGITAL',v:2130,p:3.0},{r:10,b:'CONSORCIO AMBIENTAL USME',v:2130,p:3.0},{r:11,b:'INFINIA SAS',v:2040,p:2.9},{r:12,b:'FUNDACIÓN SOCIAL RECREACIÓN',v:2010,p:2.8},{r:13,b:'SUPERMOTO MYM COLOMBIA',v:1830,p:2.6},{r:14,b:'AVANCE ORGANIZACIONAL',v:1610,p:2.3},{r:15,b:'CONSORCIO KBE VIAL',v:1340,p:1.9}].map((row,i)=>(<tr key={i} style={{borderBottom:`1px solid ${C.border}`,backgroundColor:i%2?'#fafafa':'#fff'}}><td style={{padding:'8px',fontWeight:600,color:C.navy,minWidth:30,textAlign:'center'}}>{row.r}</td><td style={{padding:'8px'}}>{row.b}</td><td style={{padding:'8px',textAlign:'right',fontWeight:600,color:C.cyan,minWidth:80}}>${(row.v).toLocaleString('es-CO')}</td><td style={{padding:'8px',textAlign:'right',fontWeight:600,color:row.p>10?C.rojo:C.amar,minWidth:60}}>{row.p.toFixed(1)}%</td></tr>))}
              </tbody>
            </table>
          </div>
        )}
        {/* ── CALIDAD ── */}
        {activeTab==='calidad'&&(
          <div style={{background:"white",borderRadius:"8px",padding:16}}>
            <h3 style={{color:C.navy,fontSize:13,fontWeight:600,margin:'0 0 12px 0'}}>Hallazgos de Calidad de Datos</h3>
            {[{tipo:'Formato No. Compromiso irregular',cant:38,val:530,pct:0.7,ejem:['608-20231','173-20241','RES/062-MAR 2025']},{tipo:'Rezago vigencia ≤2020 (riesgo fenecimiento)',cant:8,val:6500,pct:9.1,ejem:['436-2021','228-2016','772-20205']}].map((prob,i)=>(<div key={i} style={{marginBottom:12,padding:12,backgroundColor:i===0?'#fff9e6':'#ffebee',border:`1px solid ${i===0?C.amar:C.rojo}`,borderRadius:6}}><h4 style={{color:i===0?C.amar:C.rojo,fontSize:12,fontWeight:700,margin:'0 0 8px 0'}}>{i===0?'⚠️':'🔴'} {prob.tipo}</h4><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,fontSize:11,marginBottom:8}}><div><strong>{prob.cant}</strong> registros</div><div><strong>${(prob.val).toLocaleString('es-CO')}</strong> implicados</div><div><strong>{prob.pct.toFixed(1)}%</strong> del total</div></div><div style={{fontSize:10,color:C.muted}}>Ejemplos: {prob.ejem.join(', ')}</div></div>))}
          </div>
        )}
        {activeTab==='anomalias'&&<AnomaliasCRP data={filtrado??[]}/>}

      </div>
    </div>
  );
};

export default AnalisisPresupuestal;
