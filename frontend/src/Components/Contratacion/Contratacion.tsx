import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area,
} from "recharts";
import { generarTotdasAlertas, Alerta } from "../../utils/alertas";
import { cargarSecopII, convertirSecopAFormato, obtenerLocalidades } from "../../utils/secopIntegracion";
import { consultarPolitiko, analizarContratista, analizarAlertas } from "../../utils/politikoIA";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  navy: "#1a2742", navyLt: "#1e3a5f", cyan: "#5dade2", cyanLt: "#85c1e9",
  verde: "#27ae60", verdeLt: "#a9dfbf", amar: "#f39c12", amarLt: "#fdebd0",
  rojo: "#e74c3c", rojoLt: "#fadbd8", texto: "#2c3e50", muted: "#7f8c8d",
  bg: "#f0f2f5", border: "#e8edf2", violet: "#8e44ad", teal: "#1abc9c",
};
const PAL = [C.cyan,C.verde,C.amar,C.rojo,C.violet,C.teal,"#e67e22","#d63031","#0984e3","#e84393"];

const fmtCOP = (v:number) =>
  v>=1e9?`$${(v/1e9).toFixed(2)}MM`:v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${v.toFixed(0)}`;
const fmtNum = (v:number) => v.toLocaleString("es-CO");

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Contrato {
  contrato: string;
  contratista: string;
  tipoId: string;
  fechaInicial: string;
  fechaTermInicial: string;
  valorInicial: number;
  valorFinal: number;
  fechaTermFinal: string;
  estado: string;
  variacion: number;
  pctVariacion: number;
  duracionDias: number;
}

interface Resumen {
  contratos: Contrato[];
  totalContratos: number;
  valorInicialTotal: number;
  valorFinalTotal: number;
  variacionTotal: number;
  pctVariacionGlobal: number;
  contratosSobrecosto: number;
  estadosUnicos: string[];
  tiposIdUnicos: string[];
  porEstado: {estado:string; count:number; valor:number}[];
  topContratistas: {nombre:string; valor:number; count:number; variacion:number}[];
  porMes: {mes:string; valor:number; count:number}[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function gc(headers:string[], terms:string[]) {
  return headers.findIndex(h => terms.some(t => h.toUpperCase().includes(t.toUpperCase())));
}

function parseFechaExcel(val:any):string {
  if(!val||val==="") return "";
  if(val instanceof Date){
    if(isNaN(val.getTime())) return "";
    const d=String(val.getDate()).padStart(2,"0");
    const m=String(val.getMonth()+1).padStart(2,"0");
    return `${d}/${m}/${val.getFullYear()}`;
  }
  if(typeof val==="number"){
    const dt=new Date(Math.round((val-25569)*86400*1000));
    if(isNaN(dt.getTime())) return "";
    return `${String(dt.getUTCDate()).padStart(2,"0")}/${String(dt.getUTCMonth()+1).padStart(2,"0")}/${dt.getUTCFullYear()}`;
  }
  const s=String(val).trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(s)){
    const[y,m,d]=s.slice(0,10).split("-");
    return `${d}/${m}/${y}`;
  }
  return s.slice(0,10);
}

function fechaToISO(f:string):string {
  if(!f||!f.includes("/")) return "";
  const[d,m,y]=f.split("/");
  return `${y}-${m}-${d}`;
}

function procesarContratos(raw:any[][]):Resumen {
  const headers = raw[0].map((h:any)=>String(h??"").trim().toUpperCase());
  const rows    = raw.slice(1);

  const iContrato   = gc(headers,["CONTRATO"]);
  const iNombre     = gc(headers,["NOMBRE DEL CONTRATISTA","NOMBRE DEL"]);
  const iTipoId     = gc(headers,["TIPO DE IDENTIFICACION","TIPO DE ID"]);
  const iFechaIni   = gc(headers,["FECHA INICIAL DE CONTRATO","FECHA INICIAL"]);
  const iFechaTermI = gc(headers,["FECHA DE TERMINACION INICIAL","TERMINACION INICIAL"]);
  const iValorIni   = gc(headers,["VALOR INICIAL DEL CONTRATO","VALOR INICIAL"]);
  const iValorFin   = gc(headers,["VALOR FINAL DEL CONTRATO","VALOR FINAL"]);
  const iFechaTermF = gc(headers,["FECHA DE TERMINACION FINAL","TERMINACION FINAL"]);
  const iEstado     = gc(headers,["ESTADO ACTUAL DEL CONTRATO","ESTADO ACTUAL","ESTADO"]);

  const contratos:Contrato[] = [];
  let totalValorIni=0, totalValorFin=0, totalVariacion=0;

  for(const row of rows){
    const contratoId = String(row[iContrato]??"").trim();
    if(!contratoId) continue;

    const valorIni = Number(String(row[iValorIni]??"").replace(/[^0-9.-]/g,""))||0;
    const valorFin = Number(String(row[iValorFin]??"").replace(/[^0-9.-]/g,""))||0;
    const variacion = valorFin - valorIni;
    const pctVar   = valorIni>0 ? (variacion/valorIni*100) : 0;

    const fIni  = fechaToISO(parseFechaExcel(row[iFechaIni]));
    const fFinF = fechaToISO(parseFechaExcel(row[iFechaTermF]));
    let duracionDias = 0;
    if(fIni&&fFinF){
      const d1=new Date(fIni).getTime();
      const d2=new Date(fFinF).getTime();
      if(d1>0&&d2>0) duracionDias=Math.max(0,Math.floor((d2-d1)/(1000*60*60*24)));
    }

    contratos.push({
      contrato:       contratoId,
      contratista:    String(row[iNombre]??"").trim()||"N/D",
      tipoId:         String(row[iTipoId]??"").trim(),
      fechaInicial:   parseFechaExcel(row[iFechaIni]),
      fechaTermInicial:parseFechaExcel(row[iFechaTermI]),
      valorInicial:   valorIni,
      valorFinal:     valorFin,
      fechaTermFinal: parseFechaExcel(row[iFechaTermF]),
      estado:         String(row[iEstado]??"").trim().toUpperCase()||"SIN ESTADO",
      variacion, pctVariacion:pctVar, duracionDias,
    });

    totalValorIni+=valorIni; totalValorFin+=valorFin; totalVariacion+=variacion;
  }

  // Por estado
  const mapaEst:Record<string,{count:number;valor:number}>={};
  for(const c of contratos){
    if(!mapaEst[c.estado]) mapaEst[c.estado]={count:0,valor:0};
    mapaEst[c.estado].count+=1; mapaEst[c.estado].valor+=c.valorFinal;
  }
  const porEstado=Object.entries(mapaEst).map(([estado,v])=>({estado:estado.slice(0,22),...v})).sort((a,b)=>b.valor-a.valor);

  // Top contratistas
  const mapaCont:Record<string,{valor:number;count:number;variacion:number}>={};
  for(const c of contratos){
    if(!mapaCont[c.contratista]) mapaCont[c.contratista]={valor:0,count:0,variacion:0};
    mapaCont[c.contratista].valor+=c.valorFinal;
    mapaCont[c.contratista].count+=1;
    mapaCont[c.contratista].variacion+=c.variacion;
  }
  const topContratistas=Object.entries(mapaCont)
    .map(([nombre,v])=>({nombre:nombre.slice(0,30),...v}))
    .sort((a,b)=>b.valor-a.valor).slice(0,12);

  // Por mes inicio
  const mapaMes:Record<string,{valor:number;count:number}>={};
  for(const c of contratos){
    if(!c.fechaInicial||!c.fechaInicial.includes("/")) continue;
    const[,m,y]=c.fechaInicial.split("/");
    const k=`${y}-${m}`;
    if(!mapaMes[k]) mapaMes[k]={valor:0,count:0};
    mapaMes[k].valor+=c.valorFinal; mapaMes[k].count+=1;
  }
  const porMes=Object.entries(mapaMes).sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([mes,v])=>({mes:mes,...v})).slice(-24);

  return {
    contratos: contratos.sort((a,b)=>b.valorFinal-a.valorFinal),
    totalContratos:contratos.length,
    valorInicialTotal:totalValorIni,
    valorFinalTotal:totalValorFin,
    variacionTotal:totalVariacion,
    pctVariacionGlobal:totalValorIni>0?(totalVariacion/totalValorIni*100):0,
    contratosSobrecosto:contratos.filter(c=>c.variacion>0).length,
    estadosUnicos:[...new Set(contratos.map(c=>c.estado))].sort(),
    tiposIdUnicos:[...new Set(contratos.map(c=>c.tipoId).filter(Boolean))].sort(),
    porEstado, topContratistas, porMes,
  };
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
const KpiCard=({emoji,label,valor,color,sub}:{emoji:string;label:string;valor:string|number;color:string;sub?:string})=>(
  <div style={{background:"white",borderRadius:10,padding:"14px 18px",borderLeft:`3px solid ${color}`,flex:1,minWidth:120,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
    <div style={{fontSize:22}}>{emoji}</div>
    <div style={{fontSize:22,fontWeight:800,color,lineHeight:1,marginTop:4}}>{valor}</div>
    <div style={{fontSize:11,fontWeight:600,color:C.texto,marginTop:3}}>{label}</div>
    {sub&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>{sub}</div>}
  </div>
);

const TT=({active,payload,label}:any)=>{
  if(!active||!payload?.length) return null;
  return(
    <div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,.12)"}}>
      <div style={{fontWeight:700,color:C.navy,marginBottom:5}}>{label}</div>
      {payload.map((p:any,i:number)=>(
        <div key={i} style={{color:p.color??C.cyan}}>{p.name}: <strong>{typeof p.value==="number"?fmtCOP(p.value):p.value}</strong></div>
      ))}
    </div>
  );
};

const ESTADO_COLOR:Record<string,string>={
  "LIQUIDADO":C.verde,"TERMINADO":C.teal,"EN EJECUCIÓN":C.cyan,"EN EJECUCION":C.cyan,
  "SUSPENDIDO":C.amar,"RESCINDIDO":C.rojo,"SIN ESTADO":C.muted,
};
const estadoColor=(e:string)=>ESTADO_COLOR[e]??C.violet;

const BadgeEstado=({estado}:{estado:string})=>(
  <span style={{background:estadoColor(estado)+"22",color:estadoColor(estado),border:`1px solid ${estadoColor(estado)}44`,borderRadius:20,padding:"2px 10px",fontSize:10,fontWeight:700,whiteSpace:"nowrap" as const}}>
    {estado.slice(0,18)}
  </span>
);

// ─── Componente principal ─────────────────────────────────────────────────────
interface Props { onDataLoad?: (data: Resumen) => void; }

export default function Contratacion({ onDataLoad }: Props) {
  const [tab,         setTab]         = useState<"resumen"|"contratos"|"contratistas"|"estado"|"tabla">("resumen");
  const [datos,       setDatos]       = useState<Resumen|null>(null);
  const [cargando,    setCargando]    = useState(false);
  // Filtros
  const [busqueda,    setBusqueda]    = useState("");
  const [filtroEst,   setFiltroEst]   = useState("TODOS");
  const [filtroTipoId,setFiltroTipoId]= useState("TODOS");
  const [fechaDesde,  setFechaDesde]  = useState("");
  const [fechaHasta,  setFechaHasta]  = useState("");
  const [pagina,      setPagina]      = useState(0);
  const [alertas,     setAlertas]     = useState<Alerta[]>([]);
  const [cargandoIA,  setCargandoIA]  = useState(false);
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [localidadSeleccionada, setLocalidadSeleccionada] = useState("Usme");
  const inputRef = useRef<HTMLInputElement>(null);
  const FILAS_PAG = 25;

  const procesar=useCallback((file:File)=>{
    setCargando(true);
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const wb=XLSX.read(e.target?.result,{type:"array",cellDates:true});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const raw=XLSX.utils.sheet_to_json<any[]>(ws,{header:1,defval:""});
        const resumen = procesarContratos(raw);
        setDatos(resumen);
        onDataLoad?.(resumen);
        setBusqueda(""); setFiltroEst("TODOS"); setFiltroTipoId("TODOS");
        setFechaDesde(""); setFechaHasta(""); setPagina(0);
      }catch(err){console.error(err);alert("Error leyendo archivo. Verifica columnas.");}
      finally{setCargando(false);}
    };
    reader.readAsArrayBuffer(file);
  },[]);

  // ── Cargar desde SECOP II ─────────────────────────────────────────────────
  const cargarSecopDirecto = useCallback(async (localidad: string) => {
    setCargando(true);
    try {
      const secopData = await cargarSecopII(localidad);
      if (secopData.length === 0) {
        alert(`No se encontraron contratos de ${localidad} en SECOP II`);
        setCargando(false);
        return;
      }
      const raw = convertirSecopAFormato(secopData);
      const resumen = procesarContratos(raw);
      setDatos(resumen);
      onDataLoad?.(resumen);
      
      // Generar alertas
      const alertasDetectadas = generarTotdasAlertas(resumen.contratos);
      setAlertas(alertasDetectadas);
      
      setBusqueda(""); setFiltroEst("TODOS"); setFiltroTipoId("TODOS");
      setFechaDesde(""); setFechaHasta(""); setPagina(0);
    } catch (err) {
      console.error(err);
      alert("Error cargando SECOP II. Verifica conexión.");
    } finally {
      setCargando(false);
    }
  }, []);

  // ── Generar Alertas cuando datos cambien ──────────────────────────────────
  const actualizarAlertas = useCallback(() => {
    if (datos) {
      const alertasDetectadas = generarTotdasAlertas(datos.contratos);
      setAlertas(alertasDetectadas);
    }
  }, [datos]);

  // ── Pantalla carga ───────────────────────────────────────────────────────────
  if(!datos){
    return(
      <div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",minHeight:420,padding:24}}>
        <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1e3a6e 100%)`,borderRadius:16,padding:"36px 44px",textAlign:"center" as const,color:"white",maxWidth:560,width:"100%"}}>
          <div style={{fontSize:52,marginBottom:16}}>📋</div>
          <h3 style={{margin:"0 0 8px",fontSize:22,fontWeight:800}}>Contratación — Análisis Integral</h3>
          <p style={{margin:"0 0 12px",fontSize:13,color:"rgba(255,255,255,.65)",lineHeight:1.7}}>
            Carga el archivo consolidado de contratos.<br/>
            <strong style={{color:"#85c1e9"}}>9 campos · filtros combinados · 5 gráficas</strong>
          </p>
          <div style={{display:"flex",flexWrap:"wrap" as const,gap:6,justifyContent:"center",marginBottom:28}}>
            {["Contrato","Nombre Contratista","Tipo Identificación","Fecha Inicial","Fecha Term. Inicial","Valor Inicial","Valor Final","Fecha Term. Final","Estado Actual"].map(v=>(
              <span key={v} style={{background:"rgba(93,173,226,.25)",border:"1px solid rgba(93,173,226,.4)",borderRadius:20,padding:"3px 10px",fontSize:10,color:"#85c1e9",fontWeight:600}}>{v}</span>
            ))}
          </div>
          <div onClick={()=>inputRef.current?.click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)procesar(f);}}
            style={{border:"2px dashed rgba(93,173,226,.45)",borderRadius:12,padding:"26px 20px",cursor:"pointer",background:"rgba(93,173,226,.07)"}}>
            {cargando
              ?<div style={{fontSize:13,color:"#85c1e9"}}>⏳ Procesando contratos...</div>
              :<><div style={{fontSize:30,marginBottom:8}}>📂</div>
                <div style={{fontSize:13,color:"#85c1e9",fontWeight:600}}>Arrastra el Excel aquí o haz clic</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:5}}>.xlsx · .xls</div></>}
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])procesar(e.target.files[0]);}}/>
        </div>
      </div>
    );
  }

  // ── Filtrado ─────────────────────────────────────────────────────────────────
  const q=busqueda.toLowerCase().trim();
  const contratosFiltrados=datos.contratos.filter(c=>{
    const okQ   =!q||c.contrato.toLowerCase().includes(q)||c.contratista.toLowerCase().includes(q)||c.tipoId.toLowerCase().includes(q);
    const okEst =filtroEst==="TODOS"||c.estado===filtroEst;
    const okTipo=filtroTipoId==="TODOS"||c.tipoId===filtroTipoId;
    const fi    =fechaToISO(c.fechaInicial);
    const okFD  =!fechaDesde||(fi&&fi>=fechaDesde);
    const okFH  =!fechaHasta||(fi&&fi<=fechaHasta);
    return okQ&&okEst&&okTipo&&okFD&&okFH;
  });

  const hayFiltros=q||filtroEst!=="TODOS"||filtroTipoId!=="TODOS"||fechaDesde||fechaHasta;
  const totalFiltrado=contratosFiltrados.reduce((s,c)=>s+c.valorFinal,0);
  const paginas=Math.ceil(contratosFiltrados.length/FILAS_PAG);
  const filasPag=contratosFiltrados.slice(pagina*FILAS_PAG,(pagina+1)*FILAS_PAG);

  // Datos para gráficas filtradas
  const porEstadoFilt=()=>{
    const m:Record<string,{count:number;valor:number}>={};
    for(const c of contratosFiltrados){
      if(!m[c.estado]) m[c.estado]={count:0,valor:0};
      m[c.estado].count+=1; m[c.estado].valor+=c.valorFinal;
    }
    return Object.entries(m).map(([estado,v])=>({estado:estado.slice(0,20),...v})).sort((a,b)=>b.valor-a.valor);
  };

  const topContFilt=()=>{
    const m:Record<string,{valor:number;count:number;variacion:number}>={};
    for(const c of contratosFiltrados){
      if(!m[c.contratista]) m[c.contratista]={valor:0,count:0,variacion:0};
      m[c.contratista].valor+=c.valorFinal;
      m[c.contratista].count+=1;
      m[c.contratista].variacion+=c.variacion;
    }
    return Object.entries(m).map(([nombre,v])=>({nombre:nombre.slice(0,28),...v})).sort((a,b)=>b.valor-a.valor).slice(0,10);
  };

  const TabBtn=({id,label}:{id:string;label:string})=>(
    <button onClick={()=>setTab(id as any)} style={{padding:"10px 14px",background:"transparent",border:"none",borderBottom:tab===id?`2px solid ${C.cyan}`:"2px solid transparent",color:tab===id?C.cyan:C.muted,cursor:"pointer",fontSize:12,fontWeight:tab===id?700:500,whiteSpace:"nowrap" as const}}>
      {label}
    </button>
  );

  return(
    <div style={{fontFamily:"'Segoe UI',sans-serif",color:C.texto}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1e3a6e 100%)`,borderRadius:12,padding:"20px 24px",marginBottom:18,color:"white"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap" as const,gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:10,color:C.cyan,letterSpacing:2,textTransform:"uppercase" as const,fontWeight:700}}>📋 Contratación Pública · Codespage</div>
            <h2 style={{margin:"6px 0 4px",fontSize:20,fontWeight:800}}>Análisis Integral de Contratos</h2>
            <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>9 campos · {fmtNum(datos.totalContratos)} contratos cargados</div>
          </div>
          <button onClick={()=>setDatos(null)} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"6px 14px",color:"white",cursor:"pointer",fontSize:12}}>
            📂 Cambiar archivo
          </button>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap" as const}}>
          <KpiCard emoji="📊" label="Total contratos"   valor={fmtNum(datos.totalContratos)}   color={C.cyan}/>
          <KpiCard emoji="💰" label="Valor Final Total"  valor={fmtCOP(datos.valorFinalTotal)}   color={C.verde}/>
          <KpiCard emoji="📈" label="Valor Inicial Total"valor={fmtCOP(datos.valorInicialTotal)} color={C.amar}/>
          <KpiCard emoji="⚠️" label="Con sobrecosto"    valor={fmtNum(datos.contratosSobrecosto)} color={C.rojo} sub={`${datos.pctVariacionGlobal.toFixed(1)}% variación`}/>
          <KpiCard emoji="🏷️" label="Estados distintos" valor={datos.estadosUnicos.length}       color={C.violet}/>
        </div>
      </div>

      {/* PANEL DE ALERTAS */}
      {alertas.length > 0 && (
        <div style={{background:"#fff5f5",borderRadius:12,padding:"16px 20px",marginBottom:16,borderLeft:`4px solid #e74c3c`,boxShadow:"0 2px 10px rgba(0,0,0,.06)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{fontSize:18}}>🚨</span>
            <div style={{fontWeight:700,fontSize:13,color:"#c0392b"}}>ALERTAS CRÍTICAS ({alertas.length})</div>
            <button onClick={() => setAlertas([])} style={{marginLeft:"auto",background:"transparent",border:"none",color:"#c0392b",cursor:"pointer",fontWeight:600}}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:10}}>
            {alertas.slice(0, 6).map(a => (
              <div key={a.id} style={{background:"white",borderRadius:8,padding:"10px 12px",borderLeft:`3px solid ${a.severidad==="CRÍTICO"?"#e74c3c":a.severidad==="ALTO"?"#f39c12":"#3498db"}`,fontSize:11}}>
                <div style={{fontWeight:700,color:"#2c3e50",marginBottom:4}}>{a.título}</div>
                <div style={{color:"#7f8c8d",fontSize:10,lineHeight:1.4}}>{a.descripción.slice(0,120)}...</div>
                {a.valor && <div style={{fontSize:9,color:"#e74c3c",fontWeight:600,marginTop:4}}>Valor: ${a.valor.toLocaleString("es-CO")}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{background:"white",borderRadius:12,padding:"16px 20px",marginBottom:16,boxShadow:"0 2px 10px rgba(0,0,0,.06)"}}>
        <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:10}}>🔍 Filtros</div>

        <div style={{display:"flex",gap:10,flexWrap:"wrap" as const,marginBottom:10}}>
          <input value={busqueda} onChange={e=>{setBusqueda(e.target.value);setPagina(0);}}
            placeholder="🔎 Contrato, contratista o tipo ID..."
            style={{flex:2,minWidth:220,fontSize:12,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${q?C.cyan:C.border}`,outline:"none"}}/>
          <select value={filtroEst} onChange={e=>{setFiltroEst(e.target.value);setPagina(0);}}
            style={{flex:1,minWidth:160,fontSize:12,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${filtroEst!=="TODOS"?C.verde:C.border}`,background:"white"}}>
            <option value="TODOS">📋 Todos los estados</option>
            {datos.estadosUnicos.map(e=><option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filtroTipoId} onChange={e=>{setFiltroTipoId(e.target.value);setPagina(0);}}
            style={{flex:1,minWidth:160,fontSize:12,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${filtroTipoId!=="TODOS"?C.amar:C.border}`,background:"white"}}>
            <option value="TODOS">🪪 Todos los tipos ID</option>
            {datos.tiposIdUnicos.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{display:"flex",gap:10,flexWrap:"wrap" as const,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:C.muted}}>📅 Fecha inicio desde</span>
            <input type="date" value={fechaDesde} onChange={e=>{setFechaDesde(e.target.value);setPagina(0);}}
              style={{fontSize:12,padding:"7px 10px",borderRadius:8,border:`1.5px solid ${fechaDesde?C.verde:C.border}`,outline:"none"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:C.muted}}>hasta</span>
            <input type="date" value={fechaHasta} onChange={e=>{setFechaHasta(e.target.value);setPagina(0);}}
              style={{fontSize:12,padding:"7px 10px",borderRadius:8,border:`1.5px solid ${fechaHasta?C.verde:C.border}`,outline:"none"}}/>
          </div>
          {hayFiltros&&(
            <button onClick={()=>{setBusqueda("");setFiltroEst("TODOS");setFiltroTipoId("TODOS");setFechaDesde("");setFechaHasta("");setPagina(0);}}
              style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.rojoLt,color:C.rojo,fontWeight:700,fontSize:12,cursor:"pointer"}}>
              ✕ Limpiar
            </button>
          )}
          <div style={{marginLeft:"auto",fontSize:11,color:C.muted}}>
            <strong style={{color:C.navy}}>{fmtNum(contratosFiltrados.length)}</strong> contratos · <strong style={{color:C.cyan}}>{fmtCOP(totalFiltrado)}</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:"white",borderRadius:"10px 10px 0 0",borderBottom:`2px solid ${C.border}`,display:"flex",padding:"0 12px",overflowX:"auto" as const}}>
        <TabBtn id="resumen"      label="📊 Resumen"/>
        <TabBtn id="contratos"    label="📈 Valor Inicial vs Final"/>
        <TabBtn id="contratistas" label="👥 Contratistas"/>
        <TabBtn id="estado"       label="🏷️ Por Estado"/>
        <TabBtn id="tabla"        label="📋 Tabla completa"/>
      </div>

      <div style={{background:"white",borderRadius:"0 0 10px 10px",padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>

        {/* ── RESUMEN ── */}
        {tab==="resumen"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

            {/* Dona por estado */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>Distribución por Estado Actual</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Por valor final del contrato</div>
              <ResponsiveContainer width="99%" height={260}>
                <PieChart>
                  <Pie data={porEstadoFilt()} dataKey="valor" nameKey="estado" cx="50%" cy="50%"
                    outerRadius={100} innerRadius={50}
                    label={({estado,percent})=>`${estado}: ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                    {porEstadoFilt().map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:number)=>fmtCOP(v)}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{marginTop:8}}>
                {porEstadoFilt().slice(0,5).map((d,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.border}`,fontSize:11}}>
                    <span style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{width:8,height:8,borderRadius:2,background:PAL[i],display:"inline-block"}}/>
                      <BadgeEstado estado={d.estado}/>
                    </span>
                    <span style={{fontWeight:700,color:C.cyan}}>{fmtCOP(d.valor)}</span>
                    <span style={{color:C.muted}}>{fmtNum(d.count)} contratos</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Barras top contratistas */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>Top 10 Contratistas por Valor Final</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Variable: Nombre del Contratista · Valor Final</div>
              <ResponsiveContainer width="99%" height={320}>
                <BarChart data={topContFilt()} layout="vertical" margin={{top:4,right:60,left:4,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" tickFormatter={fmtCOP} tick={{fontSize:9}}/>
                  <YAxis type="category" dataKey="nombre" width={160} tick={{fontSize:9}}/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="valor" name="Valor Final" radius={[0,4,4,0]}
                    label={{position:"right",formatter:(v:number)=>fmtCOP(v),fontSize:9,fill:C.muted}}>
                    {topContFilt().map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── VALOR INICIAL vs FINAL ── */}
        {tab==="contratos"&&(
          <div>
            <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>Valor Inicial vs Valor Final — Top 15 contratos</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Variables: Contrato · Valor Inicial del Contrato · Valor Final del Contrato</div>
            <ResponsiveContainer width="99%" height={340}>
              <BarChart data={contratosFiltrados.slice(0,15).map(c=>({
                contrato:c.contrato.slice(0,14),
                valorInicial:c.valorInicial,
                valorFinal:c.valorFinal,
                variacion:Math.max(0,c.variacion),
              }))} margin={{top:4,right:16,left:4,bottom:40}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="contrato" tick={{fontSize:9}} angle={-30} textAnchor="end"/>
                <YAxis tickFormatter={fmtCOP} tick={{fontSize:9}} width={68}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="valorInicial" name="Valor Inicial" fill={C.cyan+"99"} radius={[4,4,0,0]}/>
                <Bar dataKey="valorFinal"   name="Valor Final"   fill={C.cyan}       radius={[4,4,0,0]}/>
                <Bar dataKey="variacion"    name="Sobrecosto"    fill={C.rojo}        radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>

            {/* Timeline por fecha inicial */}
            <div style={{marginTop:24}}>
              <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>Contratos por Fecha Inicial de Contrato</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Variables: Fecha Inicial · Valor Final · N° Contratos</div>
              <ResponsiveContainer width="99%" height={200}>
                <ComposedChart data={datos.porMes} margin={{top:4,right:16,left:4,bottom:30}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="mes" tick={{fontSize:9}} angle={-30} textAnchor="end"/>
                  <YAxis yAxisId="izq" tickFormatter={fmtCOP} tick={{fontSize:9}} width={64}/>
                  <YAxis yAxisId="der" orientation="right" tick={{fontSize:9}} width={30}/>
                  <Tooltip content={<TT/>}/>
                  <Area yAxisId="izq" type="monotone" dataKey="valor" name="Valor Final" fill={C.cyan+"33"} stroke={C.cyan} strokeWidth={2}/>
                  <Line yAxisId="der" type="monotone" dataKey="count" name="N° Contratos" stroke={C.amar} strokeWidth={2} dot={{r:3,fill:C.amar}}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── CONTRATISTAS ── */}
        {tab==="contratistas"&&(
          <div>
            <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>Análisis de Contratistas</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Variables: Nombre Contratista · Tipo de Identificación · Valor Inicial · Valor Final</div>
            <ResponsiveContainer width="99%" height={320}>
              <BarChart data={topContFilt()} margin={{top:4,right:16,left:4,bottom:80}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="nombre" tick={{fontSize:9}} angle={-35} textAnchor="end"/>
                <YAxis tickFormatter={fmtCOP} tick={{fontSize:9}} width={68}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="valor"    name="Valor Final"  fill={C.cyan} radius={[4,4,0,0]}/>
                <Bar dataKey="variacion" name="Sobrecosto"  fill={C.rojo} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>

            {/* Tabla contratistas */}
            <div style={{marginTop:20,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:C.navy,color:"white"}}>
                    {["#","Contratista","N° Contratos","Valor Final","Variación"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"left" as const,fontWeight:600}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topContFilt().map((c,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.bg}}>
                      <td style={{padding:"7px 12px",color:C.muted}}>{i+1}</td>
                      <td style={{padding:"7px 12px",fontWeight:600,color:C.navy}}>{c.nombre}</td>
                      <td style={{padding:"7px 12px",textAlign:"center" as const}}>{c.count}</td>
                      <td style={{padding:"7px 12px",fontWeight:700,color:C.cyan}}>{fmtCOP(c.valor)}</td>
                      <td style={{padding:"7px 12px",fontWeight:700,color:c.variacion>0?C.rojo:C.verde}}>
                        {c.variacion>0?"+":""}{fmtCOP(c.variacion)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── POR ESTADO ── */}
        {tab==="estado"&&(
          <div>
            <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>Contratos por Estado Actual</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Variables: Estado Actual del Contrato · Valor Final · N° Contratos</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div>
                <ResponsiveContainer width="99%" height={300}>
                  <BarChart data={porEstadoFilt()} layout="vertical" margin={{top:4,right:60,left:4,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                    <XAxis type="number" tickFormatter={fmtCOP} tick={{fontSize:9}}/>
                    <YAxis type="category" dataKey="estado" width={140} tick={{fontSize:10}}/>
                    <Tooltip content={<TT/>}/>
                    <Bar dataKey="valor" name="Valor Final" radius={[0,4,4,0]}
                      label={{position:"right",formatter:(v:number)=>fmtCOP(v),fontSize:9,fill:C.muted}}>
                      {porEstadoFilt().map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <ResponsiveContainer width="99%" height={300}>
                  <BarChart data={porEstadoFilt()} layout="vertical" margin={{top:4,right:60,left:4,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:9}}/>
                    <YAxis type="category" dataKey="estado" width={140} tick={{fontSize:10}}/>
                    <Tooltip formatter={(v:any)=>[fmtNum(v)+" contratos","Cantidad"]}/>
                    <Bar dataKey="count" name="N° Contratos" radius={[0,4,4,0]}
                      label={{position:"right",formatter:(v:number)=>v,fontSize:9,fill:C.muted}}>
                      {porEstadoFilt().map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]+"bb"}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla por estado */}
            <div style={{marginTop:20,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:C.navy,color:"white"}}>
                    {["Estado Actual","N° Contratos","Valor Final Total","% del total"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"left" as const,fontWeight:600}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porEstadoFilt().map((d,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.bg}}>
                      <td style={{padding:"7px 12px"}}><BadgeEstado estado={d.estado}/></td>
                      <td style={{padding:"7px 12px",textAlign:"center" as const,fontWeight:600}}>{fmtNum(d.count)}</td>
                      <td style={{padding:"7px 12px",fontWeight:700,color:C.cyan}}>{fmtCOP(d.valor)}</td>
                      <td style={{padding:"7px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:60,height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
                            <div style={{width:`${(d.valor/datos.valorFinalTotal)*100}%`,height:"100%",background:PAL[i%PAL.length],borderRadius:3}}/>
                          </div>
                          <span style={{fontSize:10,color:C.muted}}>{((d.valor/datos.valorFinalTotal)*100).toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TABLA COMPLETA ── */}
        {tab==="tabla"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:13,color:C.navy}}>
                {fmtNum(contratosFiltrados.length)} contratos · {fmtCOP(totalFiltrado)}
              </div>
              <div style={{fontSize:11,color:C.muted}}>Página {pagina+1} de {paginas||1}</div>
            </div>

            <div style={{overflowX:"auto" as const,border:`1px solid ${C.border}`,borderRadius:10}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:C.navy,color:"white",position:"sticky" as const,top:0}}>
                    {["Contrato","Contratista","Tipo ID","Fecha Inicial","Fecha Term. Inicial","Valor Inicial","Valor Final","Fecha Term. Final","Estado Actual"].map(h=>(
                      <th key={h} style={{padding:"9px 10px",textAlign:"left" as const,whiteSpace:"nowrap" as const,fontWeight:600,fontSize:10}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filasPag.map((c,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.bg}}>
                      <td style={{padding:"7px 10px",fontWeight:700,color:C.navy,whiteSpace:"nowrap" as const}}>{c.contrato}</td>
                      <td style={{padding:"7px 10px",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}} title={c.contratista}>{c.contratista}</td>
                      <td style={{padding:"7px 10px",color:C.muted,whiteSpace:"nowrap" as const}}>{c.tipoId}</td>
                      <td style={{padding:"7px 10px",whiteSpace:"nowrap" as const,color:C.verde}}>{c.fechaInicial||"—"}</td>
                      <td style={{padding:"7px 10px",whiteSpace:"nowrap" as const,color:C.muted}}>{c.fechaTermInicial||"—"}</td>
                      <td style={{padding:"7px 10px",textAlign:"right" as const,fontWeight:600,color:C.texto,whiteSpace:"nowrap" as const}}>{fmtCOP(c.valorInicial)}</td>
                      <td style={{padding:"7px 10px",textAlign:"right" as const,fontWeight:700,color:C.cyan,whiteSpace:"nowrap" as const}}>{fmtCOP(c.valorFinal)}</td>
                      <td style={{padding:"7px 10px",whiteSpace:"nowrap" as const,color:c.variacion>0?C.rojo:C.muted}}>{c.fechaTermFinal||"—"}</td>
                      <td style={{padding:"7px 10px"}}><BadgeEstado estado={c.estado}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {paginas>1&&(
              <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:14}}>
                <button onClick={()=>setPagina(0)} disabled={pagina===0} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,cursor:pagina===0?"default":"pointer",opacity:pagina===0?.4:1,background:"white",fontSize:12}}>«</button>
                <button onClick={()=>setPagina(p=>p-1)} disabled={pagina===0} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,cursor:pagina===0?"default":"pointer",opacity:pagina===0?.4:1,background:"white",fontSize:12}}>‹</button>
                {Array.from({length:Math.min(paginas,7)},(_,i)=>{
                  const p=paginas<=7?i:Math.max(0,Math.min(pagina-3,paginas-7))+i;
                  return<button key={p} onClick={()=>setPagina(p)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${p===pagina?C.cyan:C.border}`,background:p===pagina?C.cyan:"white",color:p===pagina?"white":C.texto,cursor:"pointer",fontWeight:p===pagina?700:400,fontSize:12}}>{p+1}</button>;
                })}
                <button onClick={()=>setPagina(p=>p+1)} disabled={pagina>=paginas-1} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,cursor:pagina>=paginas-1?"default":"pointer",opacity:pagina>=paginas-1?.4:1,background:"white",fontSize:12}}>›</button>
                <button onClick={()=>setPagina(paginas-1)} disabled={pagina>=paginas-1} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,cursor:pagina>=paginas-1?"default":"pointer",opacity:pagina>=paginas-1?.4:1,background:"white",fontSize:12}}>»</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
