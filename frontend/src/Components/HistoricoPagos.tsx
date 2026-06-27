import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, PieChart, Pie, Cell, ScatterChart, Scatter,
  ZAxis,
} from "recharts";

const C = {
  navy: "#1a2742", navyLt: "#1e3a5f", cyan: "#5dade2", cyanLt: "#85c1e9",
  verde: "#27ae60", verdeLt: "#a9dfbf", amar: "#f39c12", amarLt: "#fdebd0",
  rojo: "#e74c3c", rojoLt: "#fadbd8", texto: "#2c3e50", muted: "#7f8c8d",
  bg: "#f0f2f5", border: "#e8edf2", violet: "#8e44ad", teal: "#1abc9c", orange: "#e67e22",
};
const PAL = [C.cyan, C.verde, C.amar, C.rojo, C.violet, C.orange, C.teal, "#d63031", "#0984e3", "#e84393"];

const fmtCOP = (v: number) =>
  v >= 1e9  ? `$${(v / 1e9).toFixed(2)}MM` :
  v >= 1e6  ? `$${(v / 1e6).toFixed(1)}M`  :
              `$${(v / 1e3).toFixed(0)}K`;

const fmtNum = (v: number) => v.toLocaleString("es-CO");

interface Fila { nombre: string; nroId: string; proveedor: string; valorBruto: number; ejercicio: number; referencia: string; }
interface Datos {
  totalBruto: number; totalRegistros: number; proveedoresUnicos: number; ejercicios: number[];
  g1: { ejercicio: string; bruto: number; count: number }[];
  g2: { nombre: string; bruto: number }[];
  g3: { nit: string; nombre: string; bruto: number }[];
  g4: { ref: string; bruto: number; count: number }[];
  g5nombres: string[];
  g5: { ejercicio: string; [k: string]: number | string }[];
  g6: { ejercicio: string; nits: number }[];
  g7: { ref: string; monto: number; count: number }[];
}

function gc(headers: string[], terms: string[]) {
  return headers.findIndex(h => terms.some(t => h.toLowerCase().includes(t.toLowerCase())));
}

function procesarExcel(raw: any[][]): Datos {
  const headers = raw[0].map((c: any) => String(c ?? "").trim());
  const rows    = raw.slice(1);
  const iNombre = gc(headers, ["nombre"]);
  const iNroId  = gc(headers, ["nº identificación","identificacion","nro id"]);
  const iProv   = gc(headers, ["proveedor"]);
  const iBruto  = gc(headers, ["valor bruto"]);
  const iEj     = gc(headers, ["ejercicio"]);
  const iRef    = gc(headers, ["referencia"]);

  const filas: Fila[] = [];
  for (const row of rows) {
    const bruto = Number(row[iBruto]) || 0;
    if (bruto <= 0) continue;
    filas.push({
      nombre:    String(row[iNombre] ?? "").trim(),
      nroId:     String(row[iNroId]  ?? "").trim(),
      proveedor: String(row[iProv]   ?? "").trim(),
      valorBruto: bruto,
      ejercicio: Number(row[iEj])    || 0,
      referencia:String(row[iRef]    ?? "").trim(),
    });
  }

  const totalBruto     = filas.reduce((s,r) => s + r.valorBruto, 0);
  const ejerciciosSet  = [...new Set(filas.map(r => r.ejercicio))].filter(Boolean).sort() as number[];
  const proveedoresUnicos = new Set(filas.map(r => r.nroId)).size;

  const g1 = ejerciciosSet.map(e => ({
    ejercicio: String(e),
    bruto: filas.filter(r => r.ejercicio===e).reduce((s,r)=>s+r.valorBruto,0),
    count: filas.filter(r => r.ejercicio===e).length,
  }));

  const mapaNomb: Record<string,number> = {};
  for (const r of filas) mapaNomb[r.nombre] = (mapaNomb[r.nombre]??0)+r.valorBruto;
  const g2 = Object.entries(mapaNomb).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([nombre,bruto])=>({nombre:nombre.slice(0,32),bruto}));

  const mapaNit: Record<string,{nombre:string;bruto:number}> = {};
  for (const r of filas) {
    if (!mapaNit[r.nroId]) mapaNit[r.nroId]={nombre:r.nombre,bruto:0};
    mapaNit[r.nroId].bruto+=r.valorBruto;
  }
  const g3 = Object.entries(mapaNit).sort((a,b)=>b[1].bruto-a[1].bruto).slice(0,10)
    .map(([nit,v])=>({nit,nombre:v.nombre.slice(0,28),bruto:v.bruto}));

  const mapaRef: Record<string,{bruto:number;count:number}> = {};
  for (const r of filas) {
    const k=r.referencia||"SIN REF";
    if (!mapaRef[k]) mapaRef[k]={bruto:0,count:0};
    mapaRef[k].bruto+=r.valorBruto; mapaRef[k].count+=1;
  }
  const g4 = Object.entries(mapaRef).sort((a,b)=>b[1].bruto-a[1].bruto).slice(0,10)
    .map(([ref,v])=>({ref:ref.slice(0,14),bruto:v.bruto,count:v.count}));

  const top5nombres = Object.entries(mapaNomb).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n])=>n);
  const g5 = ejerciciosSet.map(e => {
    const row: {ejercicio:string;[k:string]:number|string} = {ejercicio:String(e)};
    for (const n of top5nombres)
      row[n.slice(0,16)] = filas.filter(r=>r.ejercicio===e&&r.nombre===n).reduce((s,r)=>s+r.valorBruto,0);
    return row;
  });
  const g5nombres = top5nombres.map(n=>n.slice(0,16));

  const g6 = ejerciciosSet.map(e => ({
    ejercicio: String(e),
    nits: new Set(filas.filter(r=>r.ejercicio===e).map(r=>r.nroId)).size,
  }));

  const g7 = g4.map(r=>({ref:r.ref,monto:r.bruto,count:r.count}));

  return {totalBruto,totalRegistros:filas.length,proveedoresUnicos,ejercicios:ejerciciosSet,g1,g2,g3,g4,g5,g5nombres,g6,g7};
}

const KpiCard = ({emoji,label,valor,color,sub}:{emoji:string;label:string;valor:string|number;color:string;sub?:string}) => (
  <div style={{background:"white",borderRadius:10,padding:"14px 18px",borderLeft:`3px solid ${color}`,flex:1,minWidth:130,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
    <div style={{fontSize:22}}>{emoji}</div>
    <div style={{fontSize:24,fontWeight:800,color,lineHeight:1,marginTop:4}}>{valor}</div>
    <div style={{fontSize:12,fontWeight:600,color:C.texto,marginTop:3}}>{label}</div>
    {sub&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{sub}</div>}
  </div>
);

const TT = ({active,payload,label}:any) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,.12)"}}>
      <div style={{fontWeight:700,color:C.navy,marginBottom:5}}>{label}</div>
      {payload.map((p:any,i:number)=>(
        <div key={i} style={{color:p.color??C.cyan}}>{p.name}: <strong>{typeof p.value==="number"?fmtCOP(p.value):p.value}</strong></div>
      ))}
    </div>
  );
};

const Titulo = ({n,title,sub}:{n:string;title:string;sub:string}) => (
  <div style={{marginBottom:12}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
      <span style={{background:C.navy,color:"white",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:800}}>{n}</span>
      <span style={{fontWeight:700,fontSize:13,color:C.navy}}>{title}</span>
    </div>
    <div style={{fontSize:11,color:C.muted,paddingLeft:36}}>{sub}</div>
  </div>
);

const Card = ({children,full}:{children:React.ReactNode;full?:boolean}) => (
  <div style={{background:"white",borderRadius:12,padding:"18px 20px",boxShadow:"0 2px 10px rgba(0,0,0,.06)",gridColumn:full?"1/-1":undefined}}>
    {children}
  </div>
);

export default function HistoricoPagos() {
  const [datos, setDatos]       = useState<Datos|null>(null);
  const [cargando,setCargando]  = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  const procesar = useCallback((file:File) => {
    setCargando(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb  = XLSX.read(e.target?.result,{type:"array"});
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<any[]>(ws,{header:1,defval:""});
        setDatos(procesarExcel(raw));
      } catch { alert("Error leyendo el archivo."); }
      finally { setCargando(false); }
    };
    reader.readAsArrayBuffer(file);
  },[]);

  if (!datos) {
    return (
      <div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",minHeight:420,padding:24}}>
        <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1e3a6e 100%)`,borderRadius:16,padding:"36px 44px",textAlign:"center" as const,color:"white",maxWidth:540,width:"100%"}}>
          <div style={{fontSize:52,marginBottom:16}}>📊</div>
          <h3 style={{margin:"0 0 8px",fontSize:22,fontWeight:800}}>Histórico de Pagos</h3>
          <p style={{margin:"0 0 12px",fontSize:13,color:"rgba(255,255,255,.65)",lineHeight:1.7}}>
            Carga el reporte SAP Distrital.<br/>Se generarán <strong style={{color:C.cyanLt}}>7 gráficas automáticas</strong> con:
          </p>
          <div style={{display:"flex",flexWrap:"wrap" as const,gap:6,justifyContent:"center",marginBottom:28}}>
            {["Nombre","Nº Identificación","Proveedor","Valor Bruto","Ejercicio","Referencia"].map(v=>(
              <span key={v} style={{background:"rgba(93,173,226,.25)",border:"1px solid rgba(93,173,226,.4)",borderRadius:20,padding:"3px 12px",fontSize:11,color:C.cyanLt,fontWeight:600}}>{v}</span>
            ))}
          </div>
          <div onClick={()=>inputRef.current?.click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)procesar(f);}}
            style={{border:"2px dashed rgba(93,173,226,.45)",borderRadius:12,padding:"26px 20px",cursor:"pointer",background:"rgba(93,173,226,.07)"}}>
            {cargando
              ?<div style={{fontSize:13,color:C.cyanLt}}>⏳ Procesando...</div>
              :<><div style={{fontSize:30,marginBottom:8}}>📂</div>
                <div style={{fontSize:13,color:C.cyanLt,fontWeight:600}}>Arrastra el Excel aquí o haz clic</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:5}}>.xlsx · .xls</div></>}
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])procesar(e.target.files[0]);}}/>
        </div>
      </div>
    );
  }

  const {g1,g2,g3,g4,g5,g5nombres,g6,g7,totalBruto,totalRegistros,proveedoresUnicos,ejercicios} = datos;
  const mayorEj = g1.reduce((a,b)=>a.bruto>b.bruto?a:b,g1[0]);

  return (
    <div style={{fontFamily:"'Segoe UI',sans-serif",color:C.texto}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1e3a6e 100%)`,borderRadius:12,padding:"20px 24px",marginBottom:18,color:"white"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap" as const,gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:10,color:C.cyan,letterSpacing:2,textTransform:"uppercase" as const,fontWeight:700}}>📊 SAP Distrital · FDL Usme</div>
            <h2 style={{margin:"6px 0 4px",fontSize:20,fontWeight:800}}>Histórico de Pagos · {ejercicios[0]}–{ejercicios[ejercicios.length-1]}</h2>
            <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>6 variables · 7 gráficas · datos reales SAP</div>
          </div>
          <button onClick={()=>setDatos(null)} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"6px 14px",color:"white",cursor:"pointer",fontSize:12}}>
            📂 Cambiar archivo
          </button>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap" as const}}>
          <KpiCard emoji="💰" label="Valor Bruto Total"  valor={fmtCOP(totalBruto)}       color={C.cyan}  sub={`${ejercicios[0]}–${ejercicios[ejercicios.length-1]}`}/>
          <KpiCard emoji="📋" label="Registros SAP"      valor={fmtNum(totalRegistros)}   color={C.verde} sub="transacciones"/>
          <KpiCard emoji="🏢" label="Proveedores únicos" valor={fmtNum(proveedoresUnicos)} color={C.amar}  sub="por Nº identificación"/>
          <KpiCard emoji="📅" label="Mayor ejercicio"    valor={mayorEj.ejercicio}         color={C.rojo}  sub={fmtCOP(mayorEj.bruto)}/>
        </div>
      </div>

      {/* Grid gráficas */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

        {/* G1 — Valor Bruto por Ejercicio */}
        <Card full>
          <Titulo n="①" title="Valor Bruto por Ejercicio Fiscal" sub="Variables: Ejercicio · Valor Bruto · N° Registros"/>
          <div style={{display:"flex",gap:16,flexWrap:"wrap" as const}}>
            <div style={{flex:3,minWidth:280}}>
              <ResponsiveContainer width="99%" height={220}>
                <ComposedChart data={g1} margin={{top:4,right:16,left:4,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="ejercicio" tick={{fontSize:11}}/>
                  <YAxis yAxisId="izq" tickFormatter={fmtCOP} tick={{fontSize:10}} width={68}/>
                  <YAxis yAxisId="der" orientation="right" tick={{fontSize:10}} tickFormatter={fmtNum} width={52}/>
                  <Tooltip content={<TT/>}/>
                  <Bar yAxisId="izq" dataKey="bruto" name="Valor Bruto" radius={[5,5,0,0]}>
                    {g1.map((_,i)=><Cell key={i} fill={i===g1.length-2?C.cyan:C.cyan+"77"}/>)}
                  </Bar>
                  <Line yAxisId="der" type="monotone" dataKey="count" name="Registros" stroke={C.amar} strokeWidth={2} dot={{r:4,fill:C.amar}}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{flex:1,minWidth:120,display:"flex",flexDirection:"column" as const,gap:8,justifyContent:"center"}}>
              {g1.map((d,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,fontWeight:600,color:C.navy,minWidth:34}}>{d.ejercicio}</span>
                  <div style={{flex:1,height:6,background:C.border,borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${(d.bruto/mayorEj.bruto)*100}%`,height:"100%",background:C.cyan,borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:10,color:C.muted,minWidth:52,textAlign:"right" as const}}>{fmtCOP(d.bruto)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* G2 — Top 10 Nombre */}
        <Card full>
          <Titulo n="②" title="Top 10 Proveedores por Nombre · Valor Bruto acumulado" sub="Variables: Nombre · Valor Bruto"/>
          <ResponsiveContainer width="99%" height={280}>
            <BarChart data={g2} layout="vertical" margin={{top:4,right:70,left:4,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
              <XAxis type="number" tickFormatter={fmtCOP} tick={{fontSize:10}}/>
              <YAxis type="category" dataKey="nombre" width={175} tick={{fontSize:10}}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="bruto" name="Valor Bruto" radius={[0,5,5,0]}
                label={{position:"right",formatter:(v:number)=>fmtCOP(v),fontSize:10,fill:C.muted}}>
                {g2.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* G3 — Top 10 NIT dona */}
        <Card>
          <Titulo n="③" title="Top 10 por Nº Identificación" sub="Variables: Nº Identificación · Valor Bruto"/>
          <ResponsiveContainer width="99%" height={240}>
            <PieChart>
              <Pie data={g3} dataKey="bruto" nameKey="nit" cx="50%" cy="50%" outerRadius={95} innerRadius={48}
                label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                {g3.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
              </Pie>
              <Tooltip formatter={(v:number)=>fmtCOP(v)}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{marginTop:6}}>
            {g3.slice(0,5).map((d,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.border}`,fontSize:11}}>
                <span style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:8,height:8,borderRadius:2,background:PAL[i],display:"inline-block"}}/>
                  <span style={{color:C.muted,fontFamily:"monospace"}}>{d.nit}</span>
                  <span style={{color:C.texto}}>{d.nombre.slice(0,20)}</span>
                </span>
                <span style={{fontWeight:700,color:C.cyan}}>{fmtCOP(d.bruto)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* G4 — Top 10 Referencia */}
        <Card>
          <Titulo n="④" title="Top 10 Referencias de Pago" sub="Variables: Referencia · Valor Bruto · N° Registros"/>
          <ResponsiveContainer width="99%" height={220}>
            <BarChart data={g4} margin={{top:4,right:8,left:4,bottom:36}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="ref" tick={{fontSize:9}} angle={-30} textAnchor="end"/>
              <YAxis tickFormatter={fmtCOP} tick={{fontSize:9}} width={64}/>
              <Tooltip content={({active,payload,label})=>{
                if(!active||!payload?.length)return null;
                const d=g4.find(r=>r.ref===label);
                return(<div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,.1)"}}>
                  <div style={{fontWeight:700,color:C.navy,marginBottom:4}}>Ref: {label}</div>
                  <div style={{color:C.cyan}}>Valor: <strong>{fmtCOP(payload[0].value as number)}</strong></div>
                  <div style={{color:C.muted}}>Registros: <strong>{fmtNum(d?.count??0)}</strong></div>
                </div>);
              }}/>
              <Bar dataKey="bruto" name="Valor Bruto" radius={[4,4,0,0]}>
                {g4.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{marginTop:8,display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {g4.slice(0,6).map((d,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 6px",borderRadius:4,background:C.bg,fontSize:10}}>
                <span style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{width:7,height:7,borderRadius:1,background:PAL[i],display:"inline-block"}}/>
                  <span style={{color:C.navy,fontWeight:600}}>{d.ref}</span>
                </span>
                <span style={{color:C.muted}}>{fmtNum(d.count)} reg</span>
              </div>
            ))}
          </div>
        </Card>

        {/* G5 — Evolución top 5 Nombres */}
        <Card full>
          <Titulo n="⑤" title="Evolución anual · Top 5 Proveedores (Nombre)" sub="Variables: Nombre · Ejercicio · Valor Bruto"/>
          <div style={{display:"flex",flexWrap:"wrap" as const,gap:8,marginBottom:12}}>
            {g5nombres.map((n,i)=>(
              <span key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted}}>
                <span style={{width:10,height:10,borderRadius:2,background:PAL[i],display:"inline-block"}}/>
                {n}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="99%" height={230}>
            <LineChart data={g5} margin={{top:4,right:16,left:4,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="ejercicio" tick={{fontSize:11}}/>
              <YAxis tickFormatter={fmtCOP} tick={{fontSize:10}} width={68}/>
              <Tooltip formatter={(v:number)=>fmtCOP(v)}/>
              {g5nombres.map((n,i)=>(
                <Line key={n} type="monotone" dataKey={n} name={n} stroke={PAL[i]} strokeWidth={2.5}
                  dot={{r:5,fill:PAL[i],stroke:"white",strokeWidth:2}} connectNulls={false}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* G6 — NIT únicos por ejercicio */}
        <Card>
          <Titulo n="⑥" title="Nº Identificaciones únicas por Ejercicio" sub="Variables: Nº Identificación · Ejercicio"/>
          <ResponsiveContainer width="99%" height={220}>
            <ComposedChart data={g6} margin={{top:4,right:16,left:4,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="ejercicio" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:10}}/>
              <Tooltip formatter={(v:number)=>[`${fmtNum(v)} NIT únicos`,"Proveedores"]}/>
              <Bar dataKey="nits" name="NIT únicos" radius={[5,5,0,0]}>
                {g6.map((d,i)=>{const max=Math.max(...g6.map(r=>r.nits));return<Cell key={i} fill={d.nits===max?C.amar:C.amar+"66"}/>;
                })}
              </Bar>
              <Line type="monotone" dataKey="nits" stroke={C.orange} strokeWidth={2} dot={{r:4,fill:C.orange}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* G7 — Burbuja Referencia monto vs frecuencia */}
        <Card>
          <Titulo n="⑦" title="Referencia: Monto vs Frecuencia" sub="Variables: Referencia · Valor Bruto · N° Registros"/>
          <ResponsiveContainer width="99%" height={220}>
            <ScatterChart margin={{top:4,right:16,left:4,bottom:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="count" name="N° Registros" tick={{fontSize:10}} label={{value:"N° Registros",position:"insideBottom",offset:-12,fontSize:10,fill:C.muted}}/>
              <YAxis dataKey="monto" name="Valor Bruto" tickFormatter={fmtCOP} tick={{fontSize:9}} width={64}/>
              <ZAxis dataKey="monto" range={[60,600]}/>
              <Tooltip content={({active,payload})=>{
                if(!active||!payload?.length)return null;
                const d=payload[0].payload;
                return(<div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,.1)"}}>
                  <div style={{fontWeight:700,color:C.navy,marginBottom:4}}>Ref: {d.ref}</div>
                  <div style={{color:C.cyan}}>Monto: <strong>{fmtCOP(d.monto)}</strong></div>
                  <div style={{color:C.muted}}>Registros: <strong>{fmtNum(d.count)}</strong></div>
                </div>);
              }}/>
              <Scatter data={g7} name="Referencias">
                {g7.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]} fillOpacity={0.85}/>)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

      </div>
    </div>
  );
}