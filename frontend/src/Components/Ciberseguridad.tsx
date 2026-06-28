import { useState, useEffect, useCallback } from "react";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  navy: "#0a0f1e", navyLt: "#111827", card: "#161d2e", cardHov: "#1e2a40",
  cyan: "#00d4ff", cyanDim: "#0099bb", verde: "#00ff88", verdeDim: "#00cc6a",
  amar: "#ffd60a", rojo: "#ff3d5a", rojoDim: "#cc2244",
  muted: "#4a5568", border: "#1e2a40", borderLt: "#2d3a50",
  texto: "#e2e8f0", textoSub: "#94a3b8",
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Rol = "admin" | "edil";
type AccionLog = "LOGIN_OK" | "LOGIN_FAIL" | "LOGOUT" | "CAMBIO_CLAVE" | "ACCESO_MODULO" | "SESION_EXPIRADA";

interface Usuario {
  id: string;
  nombre: string;
  usuario: string;
  clave: string;
  rol: Rol;
  activo: boolean;
  ultimoAcceso: string;
  intentosFallidos: number;
  bloqueado: boolean;
}

interface LogEntry {
  id: string;
  timestamp: string;
  fecha: string;
  hora: string;
  dia: string;
  usuario: string;
  nombre: string;
  rol: Rol | "DESCONOCIDO";
  accion: AccionLog;
  ip: string;
  dispositivo: string;
  exitoso: boolean;
  detalle: string;
}

interface Sesion {
  usuarioId: string;
  usuario: string;
  nombre: string;
  rol: Rol;
  inicio: string;
  expira: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const STORAGE_USERS  = "cp_ciberseg_usuarios";
const STORAGE_LOGS   = "cp_ciberseg_logs";
const STORAGE_SESION = "cp_ciberseg_sesion";
const MAX_INTENTOS   = 3;
const SESION_MIN     = 30; // minutos

const DIAS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

// ─── Usuarios por defecto ─────────────────────────────────────────────────────
const USUARIOS_DEFAULT: Usuario[] = [
  { id:"u1", nombre:"Administrador XBOG", usuario:"admin",    clave:"Admin2026#",  rol:"admin", activo:true, ultimoAcceso:"", intentosFallidos:0, bloqueado:false },
  { id:"u2", nombre:"Edil Usme",          usuario:"edil",     clave:"Edil2026*",   rol:"edil",  activo:true, ultimoAcceso:"", intentosFallidos:0, bloqueado:false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ahora = () => {
  const d = new Date();
  const fecha = d.toLocaleDateString("es-CO",{day:"2-digit",month:"2-digit",year:"numeric"});
  const hora  = d.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const dia   = DIAS[d.getDay()];
  return { fecha, hora, dia, ts: d.toISOString() };
};

const uid = () => Math.random().toString(36).slice(2,10).toUpperCase();

const getIP = () => {
  const ips = ["192.168.1.","10.0.0.","172.16.0."];
  return ips[0] + Math.floor(Math.random()*254+1);
};

const getDispositivo = () => {
  const ua = navigator.userAgent;
  if(/mobile/i.test(ua)) return "📱 Móvil";
  if(/tablet/i.test(ua)) return "📟 Tablet";
  return "🖥️ Escritorio";
};

const loadUsers   = (): Usuario[]  => { try { return JSON.parse(localStorage.getItem(STORAGE_USERS)  || "null") || USUARIOS_DEFAULT; } catch { return USUARIOS_DEFAULT; } };
const saveUsers   = (u: Usuario[]) => localStorage.setItem(STORAGE_USERS,  JSON.stringify(u));
const loadLogs    = (): LogEntry[] => { try { return JSON.parse(localStorage.getItem(STORAGE_LOGS)   || "[]"); } catch { return []; } };
const saveLogs    = (l: LogEntry[]) => localStorage.setItem(STORAGE_LOGS,  JSON.stringify(l));
const loadSesion  = (): Sesion | null => { try { const s = JSON.parse(localStorage.getItem(STORAGE_SESION) || "null"); if(s && Date.now() < s.expira) return s; localStorage.removeItem(STORAGE_SESION); return null; } catch { return null; } };
const saveSesion  = (s: Sesion | null) => s ? localStorage.setItem(STORAGE_SESION, JSON.stringify(s)) : localStorage.removeItem(STORAGE_SESION);

function agregarLog(logs: LogEntry[], entry: Omit<LogEntry,"id"|"timestamp"|"fecha"|"hora"|"dia"|"ip"|"dispositivo">): LogEntry[] {
  const t = ahora();
  const nuevo: LogEntry = { ...entry, id: uid(), timestamp: t.ts, fecha: t.fecha, hora: t.hora, dia: t.dia, ip: getIP(), dispositivo: getDispositivo() };
  return [nuevo, ...logs].slice(0, 500);
}

// ─── Sub-componentes UI ───────────────────────────────────────────────────────
const Badge = ({text,color}:{text:string;color:string}) => (
  <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:20,
    padding:"2px 10px",fontSize:10,fontWeight:700,whiteSpace:"nowrap" as const}}>{text}</span>
);

const Stat = ({label,valor,color,icon}:{label:string;valor:string|number;color:string;icon:string}) => (
  <div style={{background:C.card,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.border}`,flex:1,minWidth:120}}>
    <div style={{fontSize:20,marginBottom:6}}>{icon}</div>
    <div style={{fontSize:22,fontWeight:800,color,lineHeight:1}}>{valor}</div>
    <div style={{fontSize:11,color:C.textoSub,marginTop:4}}>{label}</div>
  </div>
);

// ─── PANTALLA LOGIN ───────────────────────────────────────────────────────────
const PantallaLogin = ({onLogin}:{onLogin:(s:Sesion,logs:LogEntry[],users:Usuario[])=>void}) => {
  const [usuario,  setUsuario]  = useState("");
  const [clave,    setClave]    = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error,    setError]    = useState("");
  const [cargando, setCargando] = useState(false);

  const intentarLogin = useCallback(() => {
    if(!usuario.trim()||!clave.trim()){ setError("Completa todos los campos."); return; }
    setCargando(true); setError("");
    setTimeout(()=>{
      const users = loadUsers();
      const logs  = loadLogs();
      const user  = users.find(u=>u.usuario.toLowerCase()===usuario.toLowerCase().trim());

      if(!user || !user.activo){
        const logsNew = agregarLog(logs,{usuario:usuario,nombre:"DESCONOCIDO",rol:"DESCONOCIDO",accion:"LOGIN_FAIL",exitoso:false,detalle:`Usuario no encontrado: ${usuario}`});
        saveLogs(logsNew);
        setError("Usuario no encontrado o inactivo."); setCargando(false); return;
      }

      if(user.bloqueado){
        setError("⛔ Cuenta bloqueada por exceso de intentos fallidos. Contacta al administrador."); setCargando(false); return;
      }

      if(user.clave !== clave){
        const intentos = user.intentosFallidos + 1;
        const bloqueado = intentos >= MAX_INTENTOS;
        const usersNew = users.map(u=>u.id===user.id?{...u,intentosFallidos:intentos,bloqueado}:u);
        saveUsers(usersNew);
        const logsNew = agregarLog(logs,{usuario:user.usuario,nombre:user.nombre,rol:user.rol,accion:"LOGIN_FAIL",exitoso:false,
          detalle:`Clave incorrecta. Intento ${intentos}/${MAX_INTENTOS}${bloqueado?" — CUENTA BLOQUEADA":""}`});
        saveLogs(logsNew);
        setError(bloqueado?"⛔ Cuenta bloqueada por 3 intentos fallidos.":`Clave incorrecta. Intento ${intentos}/${MAX_INTENTOS}.`);
        setCargando(false); return;
      }

      // Login exitoso
      const t = ahora();
      const usersNew = users.map(u=>u.id===user.id?{...u,intentosFallidos:0,bloqueado:false,ultimoAcceso:t.ts}:u);
      saveUsers(usersNew);
      const logsNew = agregarLog(logs,{usuario:user.usuario,nombre:user.nombre,rol:user.rol,accion:"LOGIN_OK",exitoso:true,detalle:`Sesión iniciada correctamente`});
      saveLogs(logsNew);
      const sesion: Sesion = {usuarioId:user.id,usuario:user.usuario,nombre:user.nombre,rol:user.rol,inicio:t.ts,expira:Date.now()+SESION_MIN*60*1000};
      saveSesion(sesion);
      onLogin(sesion, logsNew, usersNew);
      setCargando(false);
    },800);
  },[usuario,clave]);

  return(
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at top, #0d1b2a 0%, ${C.navy} 100%)`,
      display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:420}}>
        {/* Logo */}
        <div style={{textAlign:"center" as const,marginBottom:36}}>
          <div style={{fontSize:52,marginBottom:8}}>🔐</div>
          <div style={{fontSize:10,color:C.cyan,letterSpacing:4,fontWeight:700,textTransform:"uppercase" as const}}>Control Político · XBOG Technologies</div>
          <h1 style={{color:C.texto,fontSize:24,fontWeight:900,margin:"8px 0 4px"}}>Acceso Seguro</h1>
          <div style={{color:C.textoSub,fontSize:12}}>FDL Usme · Sistema de Auditoría</div>
        </div>

        {/* Form */}
        <div style={{background:C.card,borderRadius:16,padding:32,border:`1px solid ${C.borderLt}`,
          boxShadow:"0 24px 48px rgba(0,0,0,.5)"}}>

          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:11,color:C.textoSub,fontWeight:700,
              textTransform:"uppercase" as const,letterSpacing:1,marginBottom:8}}>Usuario</label>
            <input value={usuario} onChange={e=>setUsuario(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&intentarLogin()}
              placeholder="Ingresa tu usuario"
              style={{width:"100%",background:C.navyLt,border:`1.5px solid ${error?C.rojo:C.border}`,
                borderRadius:10,padding:"12px 16px",color:C.texto,fontSize:13,outline:"none",
                boxSizing:"border-box" as const}}/>
          </div>

          <div style={{marginBottom:24,position:"relative" as const}}>
            <label style={{display:"block",fontSize:11,color:C.textoSub,fontWeight:700,
              textTransform:"uppercase" as const,letterSpacing:1,marginBottom:8}}>Contraseña</label>
            <input value={clave} onChange={e=>setClave(e.target.value)} type={verClave?"text":"password"}
              onKeyDown={e=>e.key==="Enter"&&intentarLogin()}
              placeholder="Ingresa tu contraseña"
              style={{width:"100%",background:C.navyLt,border:`1.5px solid ${error?C.rojo:C.border}`,
                borderRadius:10,padding:"12px 44px 12px 16px",color:C.texto,fontSize:13,outline:"none",
                boxSizing:"border-box" as const}}/>
            <button onClick={()=>setVerClave(v=>!v)} style={{position:"absolute" as const,right:12,top:34,
              background:"none",border:"none",cursor:"pointer",color:C.textoSub,fontSize:16}}>
              {verClave?"🙈":"👁️"}
            </button>
          </div>

          {error&&(
            <div style={{background:C.rojo+"22",border:`1px solid ${C.rojo}44`,borderRadius:8,
              padding:"10px 14px",marginBottom:16,fontSize:12,color:C.rojo,fontWeight:600}}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={intentarLogin} disabled={cargando}
            style={{width:"100%",background:cargando?C.muted:`linear-gradient(135deg,${C.cyan} 0%,${C.cyanDim} 100%)`,
              border:"none",borderRadius:10,padding:"13px",color:C.navy,fontWeight:800,
              fontSize:14,cursor:cargando?"default":"pointer",transition:"all .2s"}}>
            {cargando?"⏳ Verificando...":"🔓 Ingresar al Sistema"}
          </button>

          <div style={{marginTop:20,padding:"12px 14px",background:C.navy,borderRadius:8,fontSize:11,color:C.textoSub}}>
            <div style={{fontWeight:700,color:C.textoSub,marginBottom:6}}>Roles disponibles:</div>
            <div>👤 <strong style={{color:C.cyan}}>Edil</strong> — acceso a módulos de control político</div>
            <div style={{marginTop:4}}>🛡️ <strong style={{color:C.amar}}>Administrador</strong> — acceso total + gestión de usuarios</div>
          </div>
        </div>

        <div style={{textAlign:"center" as const,marginTop:20,fontSize:10,color:C.muted}}>
          🔒 Conexión segura · Sesión expira en {SESION_MIN} min · XBOG Technologies © 2026
        </div>
      </div>
    </div>
  );
};

// ─── PANEL CIBERSEGURIDAD ─────────────────────────────────────────────────────
export default function Ciberseguridad() {
  const [sesion,   setSesion]   = useState<Sesion|null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [logs,     setLogs]     = useState<LogEntry[]>([]);
  const [tab,      setTab]      = useState<"dashboard"|"logs"|"usuarios"|"config">("dashboard");

  // Filtros logs
  const [filtroAcc,  setFiltroAcc]  = useState("TODOS");
  const [filtroUser, setFiltroUser] = useState("TODOS");
  const [filtroFecha,setFiltroFecha]= useState("");
  const [busqueda,   setBusqueda]   = useState("");
  const [pagina,     setPagina]     = useState(0);
  const FILAS = 15;

  // Modal cambio clave
  const [modalClave, setModalClave] = useState(false);
  const [claveActual,setClaveActual]= useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [claveConf,  setClaveConf]  = useState("");
  const [msgClave,   setMsgClave]   = useState("");

  // Modal nuevo usuario (solo admin)
  const [modalUser,  setModalUser]  = useState(false);
  const [nuevoUser,  setNuevoUser]  = useState({nombre:"",usuario:"",clave:"",rol:"edil" as Rol});
  const [msgUser,    setMsgUser]    = useState("");

  useEffect(()=>{
    const s = loadSesion();
    const u = loadUsers();
    const l = loadLogs();
    setUsuarios(u); setLogs(l);
    if(s) setSesion(s);
  },[]);

  // Expiración automática
  useEffect(()=>{
    if(!sesion) return;
    const int = setInterval(()=>{
      if(Date.now()>sesion.expira){
        const l = agregarLog(logs,{usuario:sesion.usuario,nombre:sesion.nombre,rol:sesion.rol,
          accion:"SESION_EXPIRADA",exitoso:false,detalle:"Sesión expirada por inactividad"});
        saveLogs(l); setLogs(l); saveSesion(null); setSesion(null);
      }
    },30000);
    return ()=>clearInterval(int);
  },[sesion,logs]);

  const handleLogin = (s:Sesion, l:LogEntry[], u:Usuario[]) => {
    setSesion(s); setLogs(l); setUsuarios(u);
  };

  const cerrarSesion = () => {
    if(!sesion) return;
    const l = agregarLog(logs,{usuario:sesion.usuario,nombre:sesion.nombre,rol:sesion.rol,
      accion:"LOGOUT",exitoso:true,detalle:"Cierre de sesión manual"});
    saveLogs(l); setLogs(l); saveSesion(null); setSesion(null);
  };

  const cambiarClave = () => {
    if(!sesion) return;
    const user = usuarios.find(u=>u.id===sesion.usuarioId);
    if(!user){ setMsgClave("❌ Usuario no encontrado."); return; }
    if(user.clave!==claveActual){ setMsgClave("❌ Contraseña actual incorrecta."); return; }
    if(claveNueva.length<8){ setMsgClave("❌ Mínimo 8 caracteres."); return; }
    if(claveNueva!==claveConf){ setMsgClave("❌ Las contraseñas no coinciden."); return; }
    const usersNew = usuarios.map(u=>u.id===sesion.usuarioId?{...u,clave:claveNueva}:u);
    saveUsers(usersNew); setUsuarios(usersNew);
    const l = agregarLog(logs,{usuario:sesion.usuario,nombre:sesion.nombre,rol:sesion.rol,
      accion:"CAMBIO_CLAVE",exitoso:true,detalle:"Contraseña actualizada exitosamente"});
    saveLogs(l); setLogs(l);
    setMsgClave("✅ Contraseña actualizada."); setClaveActual(""); setClaveNueva(""); setClaveConf("");
    setTimeout(()=>{ setModalClave(false); setMsgClave(""); },1500);
  };

  const crearUsuario = () => {
    if(!nuevoUser.nombre||!nuevoUser.usuario||!nuevoUser.clave){ setMsgUser("❌ Completa todos los campos."); return; }
    if(nuevoUser.clave.length<8){ setMsgUser("❌ Contraseña mínimo 8 caracteres."); return; }
    if(usuarios.find(u=>u.usuario===nuevoUser.usuario)){ setMsgUser("❌ Usuario ya existe."); return; }
    const nuevo: Usuario = { id:uid(), nombre:nuevoUser.nombre, usuario:nuevoUser.usuario,
      clave:nuevoUser.clave, rol:nuevoUser.rol, activo:true, ultimoAcceso:"", intentosFallidos:0, bloqueado:false };
    const usersNew=[...usuarios,nuevo]; saveUsers(usersNew); setUsuarios(usersNew);
    setMsgUser("✅ Usuario creado."); setNuevoUser({nombre:"",usuario:"",clave:"",rol:"edil"});
    setTimeout(()=>{ setModalUser(false); setMsgUser(""); },1500);
  };

  const toggleBloqueo = (id:string) => {
    const usersNew=usuarios.map(u=>u.id===id?{...u,bloqueado:!u.bloqueado,intentosFallidos:0}:u);
    saveUsers(usersNew); setUsuarios(usersNew);
  };

  const toggleActivo = (id:string) => {
    const usersNew=usuarios.map(u=>u.id===id?{...u,activo:!u.activo}:u);
    saveUsers(usersNew); setUsuarios(usersNew);
  };

  const limpiarLogs = () => {
    if(!window.confirm("¿Eliminar todo el historial de logs? Esta acción no se puede deshacer.")) return;
    saveLogs([]); setLogs([]);
  };

  if(!sesion) return <PantallaLogin onLogin={handleLogin}/>;

  // ── Filtrado logs ──────────────────────────────────────────────────────────
  const logsFilt = logs.filter(l=>{
    const okAcc  = filtroAcc==="TODOS"  || l.accion===filtroAcc;
    const okUser = filtroUser==="TODOS" || l.usuario===filtroUser;
    const okFech = !filtroFecha         || l.fecha.includes(filtroFecha.split("-").reverse().join("/"));
    const q      = busqueda.toLowerCase();
    const okQ    = !q || l.nombre.toLowerCase().includes(q)||l.usuario.toLowerCase().includes(q)||l.detalle.toLowerCase().includes(q);
    return okAcc&&okUser&&okFech&&okQ;
  });
  const paginas = Math.ceil(logsFilt.length/FILAS);
  const logsPag = logsFilt.slice(pagina*FILAS,(pagina+1)*FILAS);

  // Stats
  const loginOk    = logs.filter(l=>l.accion==="LOGIN_OK").length;
  const loginFail  = logs.filter(l=>l.accion==="LOGIN_FAIL").length;
  const logouts    = logs.filter(l=>l.accion==="LOGOUT").length;
  const hoy        = ahora().fecha;
  const hoyCount   = logs.filter(l=>l.fecha===hoy).length;
  const accionColor = (a:AccionLog) =>
    a==="LOGIN_OK"?C.verde:a==="LOGIN_FAIL"?C.rojo:a==="LOGOUT"?C.cyan:
    a==="CAMBIO_CLAVE"?C.amar:a==="SESION_EXPIRADA"?C.rojoDim:C.textoSub;

  const TabBtn = ({id,label}:{id:string;label:string}) => (
    <button onClick={()=>{setTab(id as any);setPagina(0);}} style={{
      padding:"10px 16px",background:"transparent",border:"none",
      borderBottom:tab===id?`2px solid ${C.cyan}`:"2px solid transparent",
      color:tab===id?C.cyan:C.textoSub,cursor:"pointer",fontSize:12,
      fontWeight:tab===id?700:500,whiteSpace:"nowrap" as const,transition:"color .2s"}}>
      {label}
    </button>
  );

  const Input = ({label,value,onChange,type="text",placeholder=""}:{label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string}) => (
    <div style={{marginBottom:16}}>
      <label style={{display:"block",fontSize:11,color:C.textoSub,fontWeight:700,
        textTransform:"uppercase" as const,letterSpacing:1,marginBottom:6}}>{label}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{width:"100%",background:C.navy,border:`1.5px solid ${C.border}`,borderRadius:8,
          padding:"10px 14px",color:C.texto,fontSize:12,outline:"none",boxSizing:"border-box" as const}}/>
    </div>
  );

  return(
    <div style={{fontFamily:"'Segoe UI',sans-serif",color:C.texto,minHeight:"100%",
      background:C.navy,borderRadius:12,padding:0}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,#0d1b2a 0%,#111827 100%)`,borderRadius:12,
        padding:"18px 24px",marginBottom:16,border:`1px solid ${C.borderLt}`,
        boxShadow:"0 4px 24px rgba(0,212,255,.08)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          flexWrap:"wrap" as const,gap:12}}>
          <div>
            <div style={{fontSize:10,color:C.cyan,letterSpacing:3,fontWeight:700,
              textTransform:"uppercase" as const}}>🛡️ Centro de Seguridad · XBOG Technologies</div>
            <h2 style={{margin:"6px 0 4px",fontSize:20,fontWeight:900,color:C.texto}}>
              Módulo de Ciberseguridad
            </h2>
            <div style={{fontSize:11,color:C.textoSub}}>
              👤 {sesion.nombre} &nbsp;·&nbsp;
              <span style={{color:sesion.rol==="admin"?C.amar:C.cyan}}>
                {sesion.rol==="admin"?"🛡️ Administrador":"👤 Edil"}
              </span> &nbsp;·&nbsp;
              Sesión iniciada: {new Date(sesion.inicio).toLocaleTimeString("es-CO")}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap" as const}}>
            <button onClick={()=>setModalClave(true)}
              style={{background:C.card,border:`1px solid ${C.borderLt}`,borderRadius:8,
                padding:"7px 14px",color:C.amar,cursor:"pointer",fontSize:12,fontWeight:600}}>
              🔑 Cambiar clave
            </button>
            <button onClick={cerrarSesion}
              style={{background:C.rojo+"22",border:`1px solid ${C.rojo}44`,borderRadius:8,
                padding:"7px 14px",color:C.rojo,cursor:"pointer",fontSize:12,fontWeight:700}}>
              🚪 Cerrar sesión
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap" as const}}>
          <Stat icon="✅" label="Accesos exitosos"  valor={loginOk}   color={C.verde}/>
          <Stat icon="❌" label="Intentos fallidos" valor={loginFail} color={C.rojo}/>
          <Stat icon="🚪" label="Cierres sesión"    valor={logouts}   color={C.cyan}/>
          <Stat icon="📅" label="Eventos hoy"       valor={hoyCount}  color={C.amar}/>
          <Stat icon="👥" label="Usuarios activos"  valor={usuarios.filter(u=>u.activo).length} color={C.verdeDim}/>
          <Stat icon="⛔" label="Cuentas bloqueadas"valor={usuarios.filter(u=>u.bloqueado).length} color={C.rojoDim}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:C.card,borderRadius:"10px 10px 0 0",borderBottom:`1px solid ${C.border}`,
        display:"flex",padding:"0 12px",overflowX:"auto" as const}}>
        <TabBtn id="dashboard" label="📊 Dashboard"/>
        <TabBtn id="logs"      label={`📋 Auditoría (${logs.length})`}/>
        {sesion.rol==="admin"&&<TabBtn id="usuarios" label="👥 Usuarios"/>}
        <TabBtn id="config"    label="⚙️ Mi cuenta"/>
      </div>

      <div style={{background:C.card,borderRadius:"0 0 10px 10px",padding:"20px",
        border:`1px solid ${C.border}`,borderTop:"none"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div>
            <div style={{fontWeight:700,fontSize:14,color:C.texto,marginBottom:16}}>
              Actividad reciente — últimos 10 eventos
            </div>
            <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
              {logs.slice(0,10).map((l,i)=>(
                <div key={i} style={{background:C.navyLt,borderRadius:10,padding:"12px 16px",
                  border:`1px solid ${C.border}`,borderLeft:`3px solid ${accionColor(l.accion)}`,
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  flexWrap:"wrap" as const,gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:"50%",
                      background:accionColor(l.accion)+"22",display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:16,flexShrink:0}}>
                      {l.accion==="LOGIN_OK"?"✅":l.accion==="LOGIN_FAIL"?"❌":
                       l.accion==="LOGOUT"?"🚪":l.accion==="CAMBIO_CLAVE"?"🔑":
                       l.accion==="SESION_EXPIRADA"?"⏰":"📌"}
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.texto}}>{l.nombre}</div>
                      <div style={{fontSize:11,color:C.textoSub}}>{l.detalle}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right" as const,fontSize:11,color:C.textoSub}}>
                    <div style={{color:C.texto,fontWeight:600}}>{l.dia} {l.fecha}</div>
                    <div>{l.hora}</div>
                    <div style={{marginTop:2}}><Badge text={l.accion} color={accionColor(l.accion)}/></div>
                  </div>
                </div>
              ))}
              {logs.length===0&&(
                <div style={{textAlign:"center" as const,padding:40,color:C.textoSub}}>
                  No hay eventos registrados aún.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LOGS DE AUDITORÍA ── */}
        {tab==="logs"&&(
          <div>
            {/* Filtros */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap" as const,marginBottom:16,
              background:C.navyLt,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.border}`}}>
              <input value={busqueda} onChange={e=>{setBusqueda(e.target.value);setPagina(0);}}
                placeholder="🔎 Buscar usuario, nombre, detalle..."
                style={{flex:2,minWidth:200,background:C.navy,border:`1px solid ${C.border}`,
                  borderRadius:8,padding:"8px 12px",color:C.texto,fontSize:12,outline:"none"}}/>
              <select value={filtroAcc} onChange={e=>{setFiltroAcc(e.target.value);setPagina(0);}}
                style={{flex:1,minWidth:150,background:C.navy,border:`1px solid ${C.border}`,
                  borderRadius:8,padding:"8px 10px",color:C.texto,fontSize:12}}>
                <option value="TODOS">Todas las acciones</option>
                {["LOGIN_OK","LOGIN_FAIL","LOGOUT","CAMBIO_CLAVE","SESION_EXPIRADA"].map(a=>(
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <select value={filtroUser} onChange={e=>{setFiltroUser(e.target.value);setPagina(0);}}
                style={{flex:1,minWidth:130,background:C.navy,border:`1px solid ${C.border}`,
                  borderRadius:8,padding:"8px 10px",color:C.texto,fontSize:12}}>
                <option value="TODOS">Todos los usuarios</option>
                {[...new Set(logs.map(l=>l.usuario))].map(u=>(
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <input type="date" value={filtroFecha} onChange={e=>{setFiltroFecha(e.target.value);setPagina(0);}}
                style={{background:C.navy,border:`1px solid ${C.border}`,borderRadius:8,
                  padding:"8px 10px",color:C.texto,fontSize:12}}/>
              {(busqueda||filtroAcc!=="TODOS"||filtroUser!=="TODOS"||filtroFecha)&&(
                <button onClick={()=>{setBusqueda("");setFiltroAcc("TODOS");setFiltroUser("TODOS");setFiltroFecha("");setPagina(0);}}
                  style={{background:C.rojo+"22",border:`1px solid ${C.rojo}44`,borderRadius:8,
                    padding:"8px 14px",color:C.rojo,cursor:"pointer",fontSize:12,fontWeight:700}}>
                  ✕ Limpiar
                </button>
              )}
              {sesion.rol==="admin"&&(
                <button onClick={limpiarLogs}
                  style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,
                    padding:"8px 14px",color:C.textoSub,cursor:"pointer",fontSize:12,marginLeft:"auto"}}>
                  🗑️ Limpiar logs
                </button>
              )}
            </div>

            <div style={{fontSize:11,color:C.textoSub,marginBottom:10}}>
              <strong style={{color:C.texto}}>{logsFilt.length}</strong> eventos · Página {pagina+1} de {paginas||1}
            </div>

            {/* Tabla */}
            <div style={{overflowX:"auto" as const,borderRadius:10,border:`1px solid ${C.border}`}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:"#0d1b2a"}}>
                    {["ID","Día","Fecha","Hora","Usuario","Nombre","Rol","Acción","Dispositivo","IP","Detalle","Estado"].map(h=>(
                      <th key={h} style={{padding:"10px 10px",textAlign:"left" as const,
                        color:C.cyan,fontWeight:700,fontSize:10,whiteSpace:"nowrap" as const,
                        borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logsPag.map((l,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`,
                      background:i%2===0?C.card:C.navyLt,
                      borderLeft:l.exitoso?`2px solid ${C.verde}44`:`2px solid ${C.rojo}44`}}>
                      <td style={{padding:"8px 10px",fontFamily:"monospace",color:C.textoSub,fontSize:10}}>{l.id}</td>
                      <td style={{padding:"8px 10px",color:C.textoSub,whiteSpace:"nowrap" as const}}>{l.dia}</td>
                      <td style={{padding:"8px 10px",whiteSpace:"nowrap" as const,color:C.texto}}>{l.fecha}</td>
                      <td style={{padding:"8px 10px",whiteSpace:"nowrap" as const,color:C.cyan,fontFamily:"monospace"}}>{l.hora}</td>
                      <td style={{padding:"8px 10px",fontWeight:700,color:C.amar}}>{l.usuario}</td>
                      <td style={{padding:"8px 10px",color:C.texto,maxWidth:140,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{l.nombre}</td>
                      <td style={{padding:"8px 10px"}}>
                        <Badge text={l.rol} color={l.rol==="admin"?C.amar:l.rol==="edil"?C.cyan:C.muted}/>
                      </td>
                      <td style={{padding:"8px 10px"}}>
                        <Badge text={l.accion} color={accionColor(l.accion)}/>
                      </td>
                      <td style={{padding:"8px 10px",color:C.textoSub,whiteSpace:"nowrap" as const}}>{l.dispositivo}</td>
                      <td style={{padding:"8px 10px",fontFamily:"monospace",color:C.textoSub,fontSize:10}}>{l.ip}</td>
                      <td style={{padding:"8px 10px",color:C.textoSub,maxWidth:180,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{l.detalle}</td>
                      <td style={{padding:"8px 10px"}}>
                        <Badge text={l.exitoso?"✓ OK":"✗ FAIL"} color={l.exitoso?C.verde:C.rojo}/>
                      </td>
                    </tr>
                  ))}
                  {logsPag.length===0&&(
                    <tr><td colSpan={12} style={{textAlign:"center" as const,padding:32,color:C.textoSub}}>
                      No hay eventos con los filtros aplicados
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {paginas>1&&(
              <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:14}}>
                <button onClick={()=>setPagina(0)} disabled={pagina===0}
                  style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                    background:C.navy,color:C.texto,cursor:pagina===0?"default":"pointer",opacity:pagina===0?.4:1,fontSize:12}}>«</button>
                <button onClick={()=>setPagina(p=>p-1)} disabled={pagina===0}
                  style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                    background:C.navy,color:C.texto,cursor:pagina===0?"default":"pointer",opacity:pagina===0?.4:1,fontSize:12}}>‹</button>
                {Array.from({length:Math.min(paginas,7)},(_,i)=>{
                  const p=paginas<=7?i:Math.max(0,Math.min(pagina-3,paginas-7))+i;
                  return<button key={p} onClick={()=>setPagina(p)} style={{padding:"5px 10px",borderRadius:6,
                    border:`1px solid ${p===pagina?C.cyan:C.border}`,background:p===pagina?C.cyan:C.navy,
                    color:p===pagina?C.navy:C.texto,cursor:"pointer",fontWeight:p===pagina?700:400,fontSize:12}}>{p+1}</button>;
                })}
                <button onClick={()=>setPagina(p=>p+1)} disabled={pagina>=paginas-1}
                  style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                    background:C.navy,color:C.texto,cursor:pagina>=paginas-1?"default":"pointer",opacity:pagina>=paginas-1?.4:1,fontSize:12}}>›</button>
                <button onClick={()=>setPagina(paginas-1)} disabled={pagina>=paginas-1}
                  style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                    background:C.navy,color:C.texto,cursor:pagina>=paginas-1?"default":"pointer",opacity:pagina>=paginas-1?.4:1,fontSize:12}}>»</button>
              </div>
            )}
          </div>
        )}

        {/* ── GESTIÓN USUARIOS (solo admin) ── */}
        {tab==="usuarios"&&sesion.rol==="admin"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:14,color:C.texto}}>Gestión de Usuarios del Sistema</div>
              <button onClick={()=>setModalUser(true)}
                style={{background:C.cyan,border:"none",borderRadius:8,padding:"8px 16px",
                  color:C.navy,fontWeight:700,fontSize:12,cursor:"pointer"}}>
                + Nuevo usuario
              </button>
            </div>
            <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
              {usuarios.map((u,i)=>(
                <div key={i} style={{background:C.navyLt,borderRadius:10,padding:"14px 18px",
                  border:`1px solid ${u.bloqueado?C.rojo+"44":C.border}`,
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  flexWrap:"wrap" as const,gap:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:42,height:42,borderRadius:"50%",
                      background:u.rol==="admin"?C.amar+"22":C.cyan+"22",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                      {u.rol==="admin"?"🛡️":"👤"}
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.texto}}>{u.nombre}</div>
                      <div style={{fontSize:11,color:C.textoSub}}>
                        @{u.usuario} &nbsp;·&nbsp;
                        <Badge text={u.rol} color={u.rol==="admin"?C.amar:C.cyan}/>
                      </div>
                      {u.ultimoAcceso&&(
                        <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                          Último acceso: {new Date(u.ultimoAcceso).toLocaleString("es-CO")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" as const}}>
                    {u.intentosFallidos>0&&(
                      <Badge text={`⚠️ ${u.intentosFallidos} intentos fallidos`} color={C.amar}/>
                    )}
                    <Badge text={u.activo?"● Activo":"○ Inactivo"} color={u.activo?C.verde:C.muted}/>
                    {u.bloqueado&&<Badge text="⛔ Bloqueado" color={C.rojo}/>}
                    {u.id!==sesion.usuarioId&&(
                      <>
                        <button onClick={()=>toggleActivo(u.id)}
                          style={{background:u.activo?C.rojo+"22":C.verde+"22",
                            border:`1px solid ${u.activo?C.rojo:C.verde}44`,borderRadius:6,
                            padding:"5px 12px",color:u.activo?C.rojo:C.verde,cursor:"pointer",fontSize:11,fontWeight:700}}>
                          {u.activo?"Desactivar":"Activar"}
                        </button>
                        <button onClick={()=>toggleBloqueo(u.id)}
                          style={{background:u.bloqueado?C.verde+"22":C.amar+"22",
                            border:`1px solid ${u.bloqueado?C.verde:C.amar}44`,borderRadius:6,
                            padding:"5px 12px",color:u.bloqueado?C.verde:C.amar,cursor:"pointer",fontSize:11,fontWeight:700}}>
                          {u.bloqueado?"Desbloquear":"Bloquear"}
                        </button>
                      </>
                    )}
                    {u.id===sesion.usuarioId&&<Badge text="Tu cuenta" color={C.cyan}/>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MI CUENTA ── */}
        {tab==="config"&&(
          <div style={{maxWidth:480}}>
            <div style={{fontWeight:700,fontSize:14,color:C.texto,marginBottom:16}}>Mi cuenta</div>
            <div style={{background:C.navyLt,borderRadius:12,padding:20,border:`1px solid ${C.border}`,marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                <div style={{width:52,height:52,borderRadius:"50%",
                  background:sesion.rol==="admin"?C.amar+"22":C.cyan+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                  {sesion.rol==="admin"?"🛡️":"👤"}
                </div>
                <div>
                  <div style={{fontWeight:800,fontSize:16,color:C.texto}}>{sesion.nombre}</div>
                  <div style={{fontSize:12,color:C.textoSub}}>@{sesion.usuario}</div>
                  <Badge text={sesion.rol==="admin"?"Administrador":"Edil"} color={sesion.rol==="admin"?C.amar:C.cyan}/>
                </div>
              </div>
              <div style={{fontSize:11,color:C.textoSub,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                <div>🕐 Sesión iniciada: {new Date(sesion.inicio).toLocaleString("es-CO")}</div>
                <div style={{marginTop:4}}>⏱️ Expira: {new Date(sesion.expira).toLocaleTimeString("es-CO")}</div>
                <div style={{marginTop:4}}>💻 Dispositivo: {getDispositivo()}</div>
              </div>
            </div>
            <button onClick={()=>setModalClave(true)}
              style={{background:C.amar+"22",border:`1px solid ${C.amar}44`,borderRadius:10,
                padding:"12px 20px",color:C.amar,fontWeight:700,fontSize:13,cursor:"pointer",width:"100%"}}>
              🔑 Cambiar contraseña
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL CAMBIO CLAVE ── */}
      {modalClave&&(
        <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,.7)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:1000,padding:24}}>
          <div style={{background:C.card,borderRadius:16,padding:32,width:"100%",maxWidth:400,
            border:`1px solid ${C.borderLt}`,boxShadow:"0 24px 48px rgba(0,0,0,.5)"}}>
            <div style={{fontWeight:800,fontSize:16,color:C.texto,marginBottom:20}}>🔑 Cambiar contraseña</div>
            <Input label="Contraseña actual" value={claveActual} onChange={setClaveActual} type="password"/>
            <Input label="Nueva contraseña"  value={claveNueva}  onChange={setClaveNueva}  type="password" placeholder="Mínimo 8 caracteres"/>
            <Input label="Confirmar nueva"   value={claveConf}   onChange={setClaveConf}   type="password"/>
            {msgClave&&(
              <div style={{padding:"10px 14px",borderRadius:8,marginBottom:16,fontSize:12,fontWeight:600,
                background:msgClave.startsWith("✅")?C.verde+"22":C.rojo+"22",
                color:msgClave.startsWith("✅")?C.verde:C.rojo}}>
                {msgClave}
              </div>
            )}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setModalClave(false);setClaveActual("");setClaveNueva("");setClaveConf("");setMsgClave("");}}
                style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${C.border}`,
                  background:"transparent",color:C.textoSub,cursor:"pointer",fontSize:12}}>Cancelar</button>
              <button onClick={cambiarClave}
                style={{flex:1,padding:"10px",borderRadius:8,border:"none",
                  background:C.cyan,color:C.navy,fontWeight:700,cursor:"pointer",fontSize:12}}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVO USUARIO ── */}
      {modalUser&&(
        <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,.7)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:1000,padding:24}}>
          <div style={{background:C.card,borderRadius:16,padding:32,width:"100%",maxWidth:420,
            border:`1px solid ${C.borderLt}`,boxShadow:"0 24px 48px rgba(0,0,0,.5)"}}>
            <div style={{fontWeight:800,fontSize:16,color:C.texto,marginBottom:20}}>👤 Nuevo usuario</div>
            <Input label="Nombre completo" value={nuevoUser.nombre}  onChange={v=>setNuevoUser(p=>({...p,nombre:v}))}/>
            <Input label="Usuario"         value={nuevoUser.usuario} onChange={v=>setNuevoUser(p=>({...p,usuario:v}))}/>
            <Input label="Contraseña"      value={nuevoUser.clave}   onChange={v=>setNuevoUser(p=>({...p,clave:v}))} type="password" placeholder="Mínimo 8 caracteres"/>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,color:C.textoSub,fontWeight:700,
                textTransform:"uppercase" as const,letterSpacing:1,marginBottom:6}}>Rol</label>
              <select value={nuevoUser.rol} onChange={e=>setNuevoUser(p=>({...p,rol:e.target.value as Rol}))}
                style={{width:"100%",background:C.navy,border:`1px solid ${C.border}`,borderRadius:8,
                  padding:"10px 14px",color:C.texto,fontSize:12}}>
                <option value="edil">👤 Edil</option>
                <option value="admin">🛡️ Administrador</option>
              </select>
            </div>
            {msgUser&&(
              <div style={{padding:"10px 14px",borderRadius:8,marginBottom:16,fontSize:12,fontWeight:600,
                background:msgUser.startsWith("✅")?C.verde+"22":C.rojo+"22",
                color:msgUser.startsWith("✅")?C.verde:C.rojo}}>
                {msgUser}
              </div>
            )}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setModalUser(false);setNuevoUser({nombre:"",usuario:"",clave:"",rol:"edil"});setMsgUser("");}}
                style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${C.border}`,
                  background:"transparent",color:C.textoSub,cursor:"pointer",fontSize:12}}>Cancelar</button>
              <button onClick={crearUsuario}
                style={{flex:1,padding:"10px",borderRadius:8,border:"none",
                  background:C.cyan,color:C.navy,fontWeight:700,cursor:"pointer",fontSize:12}}>Crear usuario</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}