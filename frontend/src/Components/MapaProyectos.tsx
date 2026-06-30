import React, { useEffect, useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";

interface Proyecto {
  id: number;
  nombre: string;
  localidad: string;
  tipo: string;
  estado: string;
  avance: number;
  lat: number;
  lng: number;
  presupuesto: number;
  contratista: string;
  contrato: string;
  fechaInicio: string;
  fechaFin: string;
  fuente: string;
  observaciones: string;
}

const colMap: Record<string,string> = {
  "EN EJECUCION":"#1abc9c","EN RETRASO":"#e74c3c",
  "FINALIZADO":"#3498db","PLANEADO":"#95a5a6","SUSPENDIDO":"#f39c12"
};
const estColor = (e:string) => colMap[e?.toUpperCase()] ?? "#7f8c8d";
const tipoIcon: Record<string,string> = {
  "INFRAESTRUCTURA":"[Obra]","EDUCACION":"[Edu]","SALUD":"[Salud]",
  "VIAS":"[Via]","SERVICIOS":"[Serv]","AMBIENTAL":"[Amb]","CULTURA":"[Cult]","DEPORTE":"[Dep]"
};
const getIcon = (t:string) => tipoIcon[t?.toUpperCase()] ?? "[?]";
const fmt = (v:number) => "$"+(v>=1e9?(v/1e9).toFixed(1)+"B":v>=1e6?(v/1e6).toFixed(0)+"M":(v/1e3).toFixed(0)+"K");

function gc(headers:string[], terms:string[]) {
  return headers.findIndex(h => terms.some(t => h.toUpperCase().includes(t.toUpperCase())));
}

function parsearProyectos(raw:any[][]): Proyecto[] {
  const headers = raw[0].map((h:any)=>String(h??"").trim().toUpperCase());
  const rows = raw.slice(1);
  const iNombre   = gc(headers, ["NOMBRE PROYECTO","NOMBRE DEL PROYECTO","PROYECTO"]);
  const iLocal    = gc(headers, ["LOCALIDAD","BARRIO","VEREDA"]);
  const iTipo     = gc(headers, ["TIPO"]);
  const iEstado   = gc(headers, ["ESTADO"]);
  const iAvance   = gc(headers, ["AVANCE","% AVANCE","PORCENTAJE"]);
  const iLat      = gc(headers, ["LATITUD","LAT"]);
  const iLng      = gc(headers, ["LONGITUD","LNG","LON"]);
  const iPresup   = gc(headers, ["PRESUPUESTO","VALOR"]);
  const iContrat  = gc(headers, ["CONTRATISTA"]);
  const iContrato = gc(headers, ["CONTRATO","N CONTRATO","NO. CONTRATO"]);
  const iFechaIni = gc(headers, ["FECHA INICIO","FECHA INICIAL"]);
  const iFechaFin = gc(headers, ["FECHA FIN","FECHA TERMINACION"]);
  const iFuente   = gc(headers, ["FUENTE","FUENTE DE FINANCIACION"]);
  const iObs      = gc(headers, ["OBSERVACIONES","OBSERVACION","NOTAS"]);
  const proyectos: Proyecto[] = [];
  let id = 1;
  for (const row of rows) {
    const nombre = String(row[iNombre] ?? "").trim();
    if (!nombre) continue;
    const lat = Number(String(row[iLat] ?? "").replace(",", "."));
    const lng = Number(String(row[iLng] ?? "").replace(",", "."));
    if (!lat || !lng) continue;
    proyectos.push({
      id: id++, nombre,
      localidad: String(row[iLocal] ?? "").trim() || "N/D",
      tipo: String(row[iTipo] ?? "").trim() || "Infraestructura",
      estado: String(row[iEstado] ?? "").trim().toUpperCase() || "PLANEADO",
      avance: Number(String(row[iAvance] ?? "0").replace(/[^0-9.-]/g,"")) || 0,
      lat, lng,
      presupuesto: Number(String(row[iPresup] ?? "0").replace(/[^0-9.-]/g,"")) || 0,
      contratista: String(row[iContrat] ?? "").trim() || "N/D",
      contrato: String(row[iContrato] ?? "").trim() || "N/D",
      fechaInicio: String(row[iFechaIni] ?? "").trim() || "-",
      fechaFin: String(row[iFechaFin] ?? "").trim() || "-",
      fuente: String(row[iFuente] ?? "").trim() || "N/D",
      observaciones: String(row[iObs] ?? "").trim(),
    });
  }
  return proyectos;
}

interface Props { onDataLoad?: (data: Proyecto[]) => void; }

export default function MapaProyectos({ onDataLoad }: Props) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const leafletReady = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [proyectos, setProyectos] = useState<Proyecto[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [seleccionado, setSeleccionado] = useState<Proyecto | null>(null);

  useEffect(() => {
    if ((window as any).L) { leafletReady.current = true; return; }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    document.head.appendChild(js);
    js.onload = () => { leafletReady.current = true; };
  }, []);

  const procesar = useCallback((file: File) => {
    setCargando(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
        const data = parsearProyectos(raw);
        if (data.length === 0) {
          alert("No se encontraron proyectos con coordenadas validas. Verifica columnas Latitud/Longitud.");
        } else {
          setProyectos(data);
          onDataLoad?.(data);
        }
      } catch (err) {
        console.error(err);
        alert("Error leyendo el archivo. Verifica el formato.");
      } finally {
        setCargando(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [onDataLoad]);

  const filtrados = (proyectos ?? []).filter(p =>
    (filtroTipo === "Todos" || p.tipo === filtroTipo) &&
    (filtroEstado === "Todos" || p.estado === filtroEstado)
  );
  const tiposUnicos = [...new Set((proyectos ?? []).map(p => p.tipo))].sort();
  const estadosUnicos = [...new Set((proyectos ?? []).map(p => p.estado))].sort();

  useEffect(() => {
    if (!proyectos || !leafletReady.current) return;
    const L = (window as any).L;
    if (!L || !document.getElementById("mapa-leaflet")) return;
    if (!mapRef.current) {
      mapRef.current = L.map("mapa-leaflet").setView(
        filtrados.length ? [filtrados[0].lat, filtrados[0].lng] : [4.5, -74.1], 12
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapRef.current);
    }
    markersRef.current.forEach(m => mapRef.current.removeLayer(m));
    markersRef.current = [];
    filtrados.forEach(p => {
      const icon = L.divIcon({
        html: `<div style="background:${estColor(p.estado)};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer"></div>`,
        className: "", iconAnchor: [8,8]
      });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(mapRef.current);
      marker.on("click", () => setSeleccionado(p));
      markersRef.current.push(marker);
    });
    if (filtrados.length > 0) {
      const bounds = L.latLngBounds(filtrados.map(p => [p.lat, p.lng]));
      mapRef.current.fitBounds(bounds, { padding: [30,30] });
    }
  }, [proyectos, filtroTipo, filtroEstado]);

  const card: React.CSSProperties = { background:"white", borderRadius:10, padding:"16px 20px", boxShadow:"0 1px 6px rgba(0,0,0,.07)" };

  if (!proyectos) {
    return (
      <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", minHeight:420, padding:24 }}>
        <div style={{ background:"linear-gradient(135deg,#1a2742 0%,#1e3a6e 100%)", borderRadius:16, padding:"36px 44px", textAlign:"center" as const, color:"white", maxWidth:560, width:"100%" }}>
          <h3 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800 }}>Mapa de Proyectos</h3>
          <p style={{ margin:"0 0 12px", fontSize:13, color:"rgba(255,255,255,.65)", lineHeight:1.7 }}>
            Carga el Excel con tus proyectos territoriales.<br/>
            <strong style={{ color:"#85c1e9" }}>Columnas: Nombre, Localidad, Tipo, Estado, Avance, Latitud, Longitud, Presupuesto</strong>
          </p>
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6, justifyContent:"center", marginBottom:28 }}>
            {["Nombre Proyecto","Localidad","Tipo","Estado","Avance %","Latitud","Longitud","Presupuesto","Contratista","Contrato","Fecha Inicio","Fecha Fin","Fuente","Observaciones"].map(v=>(
              <span key={v} style={{ background:"rgba(93,173,226,.25)", border:"1px solid rgba(93,173,226,.4)", borderRadius:20, padding:"3px 10px", fontSize:10, color:"#85c1e9", fontWeight:600 }}>{v}</span>
            ))}
          </div>
          <div onClick={()=>inputRef.current?.click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) procesar(f);}}
            style={{ border:"2px dashed rgba(93,173,226,.45)", borderRadius:12, padding:"26px 20px", cursor:"pointer", background:"rgba(93,173,226,.07)" }}>
            {cargando
              ? <div style={{ fontSize:13, color:"#85c1e9" }}>Procesando proyectos...</div>
              : <div style={{ fontSize:13, color:"#85c1e9", fontWeight:600 }}>Arrastra el Excel aqui o haz clic (.xlsx / .xls)</div>}
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }}
            onChange={e=>{ if(e.target.files?.[0]) procesar(e.target.files[0]); }}/>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns: seleccionado ? "260px 1fr 320px" : "260px 1fr", gap:16, height:"calc(100vh - 120px)" }}>
      <div style={{ display:"flex", flexDirection:"column" as const, gap:12 }}>
        <button onClick={()=>{ setProyectos(null); setSeleccionado(null); mapRef.current = null; }}
          style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #ddd", background:"white", cursor:"pointer", fontSize:12, fontWeight:600 }}>
          Cambiar archivo
        </button>
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Estado de Proyectos</div>
          {estadosUnicos.map(est => (
            <div key={est} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:estColor(est) }}/>
              <span style={{ fontSize:12 }}>{est} ({proyectos.filter(p=>p.estado===est).length})</span>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Filtros</div>
          <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Tipo</div>
          <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
            style={{ width:"100%", padding:"6px 8px", borderRadius:6, border:"1px solid #ddd", fontSize:12, marginBottom:10 }}>
            <option>Todos</option>
            {tiposUnicos.map(t=><option key={t}>{t}</option>)}
          </select>
          <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Estado</div>
          <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}
            style={{ width:"100%", padding:"6px 8px", borderRadius:6, border:"1px solid #ddd", fontSize:12 }}>
            <option>Todos</option>
            {estadosUnicos.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ ...card, flex:1, overflowY:"auto" as const }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Proyectos ({filtrados.length})</div>
          {filtrados.map(p => (
            <div key={p.id} onClick={()=>setSeleccionado(p)}
              style={{ borderBottom:"1px solid #f0f0f0", paddingBottom:8, marginBottom:8, cursor:"pointer", background: seleccionado?.id===p.id ? "#EFF6FF" : "transparent", borderRadius:6, padding:6 }}>
              <div style={{ fontSize:12, fontWeight:600 }}>{getIcon(p.tipo)} {p.nombre}</div>
              <div style={{ fontSize:11, color:"#888", margin:"2px 0" }}>{p.localidad}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ flex:1, background:"#eee", borderRadius:3, height:5 }}>
                  <div style={{ background:estColor(p.estado), width:p.avance+"%", height:5, borderRadius:3 }}/>
                </div>
                <span style={{ fontSize:11, fontWeight:600 }}>{p.avance}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="mapa-leaflet" style={{ borderRadius:10, boxShadow:"0 2px 10px rgba(0,0,0,.1)" }}/>

      {seleccionado && (
        <div style={{ ...card, overflowY:"auto" as const, display:"flex", flexDirection:"column" as const, gap:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ fontWeight:800, fontSize:15, color:"#1a2742" }}>{getIcon(seleccionado.tipo)} {seleccionado.nombre}</div>
            <button onClick={()=>setSeleccionado(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#888" }}>X</button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ background:estColor(seleccionado.estado)+"22", color:estColor(seleccionado.estado), border:`1px solid ${estColor(seleccionado.estado)}44`, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
              {seleccionado.estado}
            </span>
            <span style={{ fontSize:12, color:"#888" }}>{seleccionado.localidad}</span>
          </div>
          <div>
            <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>Avance fisico</div>
            <div style={{ background:"#eee", borderRadius:5, height:10, overflow:"hidden" }}>
              <div style={{ background:estColor(seleccionado.estado), width:seleccionado.avance+"%", height:10 }}/>
            </div>
            <div style={{ fontSize:13, fontWeight:700, marginTop:4, color:estColor(seleccionado.estado) }}>{seleccionado.avance}%</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, fontSize:12 }}>
            <div>
              <div style={{ color:"#888", fontSize:10 }}>Presupuesto</div>
              <div style={{ fontWeight:700, color:"#1a2742" }}>{fmt(seleccionado.presupuesto)}</div>
            </div>
            <div>
              <div style={{ color:"#888", fontSize:10 }}>Contrato</div>
              <div style={{ fontWeight:700, color:"#1a2742" }}>{seleccionado.contrato}</div>
            </div>
            <div>
              <div style={{ color:"#888", fontSize:10 }}>Fecha inicio</div>
              <div style={{ fontWeight:600 }}>{seleccionado.fechaInicio}</div>
            </div>
            <div>
              <div style={{ color:"#888", fontSize:10 }}>Fecha fin</div>
              <div style={{ fontWeight:600 }}>{seleccionado.fechaFin}</div>
            </div>
          </div>
          <div>
            <div style={{ color:"#888", fontSize:10, marginBottom:2 }}>Contratista</div>
            <div style={{ fontWeight:600, fontSize:12 }}>{seleccionado.contratista}</div>
          </div>
          <div>
            <div style={{ color:"#888", fontSize:10, marginBottom:2 }}>Fuente de financiacion</div>
            <div style={{ fontWeight:600, fontSize:12 }}>{seleccionado.fuente}</div>
          </div>
          {seleccionado.observaciones && (
            <div style={{ background:"#FFF8E1", borderLeft:"3px solid #f39c12", borderRadius:"0 6px 6px 0", padding:"8px 10px", fontSize:11, color:"#555", lineHeight:1.5 }}>
              Obs: {seleccionado.observaciones}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
