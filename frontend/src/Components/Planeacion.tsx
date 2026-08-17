import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Upload, AlertCircle, CheckCircle, TrendingUp, DollarSign, Target, BarChart2 } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface PDLURow { [key: string]: string | number; }
interface EjecRow  { [key: string]: string | number; }
interface Sector { nombre: string; poai: number; apropiaciones: number; compromisos: number; giros: number; pctComp: number; pctGiros: number; }
interface Proyecto { codigo: number; nombre: string; sector: string; poai: number; metaAnualizada: number; apropiaciones: number; compromisos: number; giros: number; pctComp: number; pctGiros: number; indicadores: Indicador[]; }
interface Indicador { no: number; descripcion: string; programa: string; meta: number; poai: number; }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const toN = (v: any): number => { if (v === null || v === undefined || v === '') return 0; const n = parseFloat(String(v).replace(/[^0-9.-]/g, '')); return isNaN(n) ? 0 : n; };
const fmtCOP = (v: number): string => { if (!v) return '–'; if (v >= 1e12) return '$' + (v / 1e12).toFixed(1) + 'T'; if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B'; if (v >= 1e6) return '$' + (v / 1e6).toFixed(0) + 'M'; return '$' + v.toLocaleString('es-CO'); };
const pct = (v: number): string => (v * 100).toFixed(1) + '%';
const riskColor = (p: number): string => { if (p >= 0.6) return '#10B981'; if (p >= 0.4) return '#00C8E0'; if (p >= 0.2) return '#F59E0B'; if (p > 0) return '#EF4444'; return '#64748B'; };

const SECTOR_COLORS: Record<string, string> = {
  'GOBIERNO': '#00C8E0', 'INTEGRACIÓN SOCIAL': '#10B981', 'MOVILIDAD': '#818CF8',
  'CULTURA, RECREACIÓN Y DEPORTE': '#F59E0B', 'AMBIENTE': '#34D399', 'EDUCACIÓN': '#A78BFA',
  'MUJERES': '#F472B6', 'SALUD': '#FB7185', 'SEGURIDAD, CONVIVENCIA Y JUSTICIA': '#FBBF24',
  'DESARROLLO ECONÓMICO, INDUSTRIA Y TURISMO': '#C084FC', 'HÁBITAT': '#38BDF8', 'GESTIÓN PÚBLICA': '#94A3B8',
};
const CHART_COLORS = ['#00C8E0','#10B981','#818CF8','#F59E0B','#34D399','#A78BFA','#F472B6','#FB7185','#FBBF24','#38BDF8','#C084FC','#94A3B8'];
const sColor = (s: string) => SECTOR_COLORS[s] || '#94A3B8';

const gcP = (row: PDLURow, keys: string[]): any => { for (const k of keys) { if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k]; } return ''; };

// ─── PROCESS ─────────────────────────────────────────────────────────────────
function processData(pdluRows: PDLURow[], ejec: EjecRow[]) {
  const ejMap: Record<number, { aprop: number; comp: number; giros: number }> = {};
  ejec.forEach(row => {
    const codigo = toN(gcP(row as PDLURow, ['Código_Proyecto','Codigo_Proyecto','codigo_proyecto','CODIGO_PROYECTO','Cód. Proyecto','Cod. Proyecto']));
    if (!codigo) return;
    ejMap[codigo] = {
      aprop: toN(gcP(row as PDLURow, ['Apropiaciones','apropiaciones','APROPIACIONES'])),
      comp:  toN(gcP(row as PDLURow, ['Compromisos proyecto','Compromisos_proyecto','compromisos','Compromisos','COMPROMISOS'])),
      giros: toN(gcP(row as PDLURow, ['Giros proyecto','Giros_proyecto','giros','Giros','GIROS'])),
    };
  });

  const proyMap: Record<number, Proyecto> = {};
  pdluRows.forEach(row => {
    const codigoRaw = gcP(row, ['Cód. Proyecto de Inversión SEGPLAN','Cod. Proyecto de Inversión SEGPLAN','Código Proyecto SEGPLAN','Codigo Proyecto SEGPLAN','Cód. Proyecto','Cod Proyecto']);
    const codigo = toN(codigoRaw);
    if (!codigo) return;
    const nombre   = String(gcP(row, ['Nombre del Proyecto','Nombre Proyecto','nombre_proyecto']) || '');
    const sector   = String(gcP(row, ['Sector','sector','SECTOR']) || '');
    const poai     = toN(gcP(row, ['Recursos POAI DEFINITIVO 2026\n','Recursos POAI DEFINITIVO 2026','Recursos POAI','recursos_poai','POAI']));
    const meta     = toN(gcP(row, ['Magnitud Meta anualizada DEFINITIVA 2026','Magnitud Meta anualizada','Meta anualizada','meta_anualizada']));
    const ind      = String(gcP(row, ['Indicador de producto','Indicador_Producto','indicador_producto']) || '');
    const programa = String(gcP(row, ['Programa','programa','PROGRAMA']) || '');
    const noInd    = toN(gcP(row, ['No. Indicador ','No. Indicador','No Indicador','no_indicador']));
    const ej = ejMap[codigo] || { aprop: 0, comp: 0, giros: 0 };
    if (!proyMap[codigo]) {
      proyMap[codigo] = { codigo, nombre, sector, poai: 0, metaAnualizada: 0, apropiaciones: ej.aprop, compromisos: ej.comp, giros: ej.giros, pctComp: ej.aprop > 0 ? ej.comp / ej.aprop : 0, pctGiros: ej.aprop > 0 ? ej.giros / ej.aprop : 0, indicadores: [] };
    }
    proyMap[codigo].poai += poai;
    proyMap[codigo].metaAnualizada += meta;
    if (ind) proyMap[codigo].indicadores.push({ no: noInd, descripcion: ind, programa, meta, poai });
  });

  const proyectos = Object.values(proyMap).sort((a, b) => b.poai - a.poai);
  const secMap: Record<string, Sector> = {};
  proyectos.forEach(p => {
    if (!secMap[p.sector]) secMap[p.sector] = { nombre: p.sector, poai: 0, apropiaciones: 0, compromisos: 0, giros: 0, pctComp: 0, pctGiros: 0 };
    secMap[p.sector].poai += p.poai; secMap[p.sector].apropiaciones += p.apropiaciones;
    secMap[p.sector].compromisos += p.compromisos; secMap[p.sector].giros += p.giros;
  });
  Object.values(secMap).forEach(s => { s.pctComp = s.apropiaciones > 0 ? s.compromisos / s.apropiaciones : 0; s.pctGiros = s.apropiaciones > 0 ? s.giros / s.apropiaciones : 0; });
  const sectores = Object.values(secMap).sort((a, b) => b.poai - a.poai);
  const totals = { poai: proyectos.reduce((s, p) => s + p.poai, 0), apropiaciones: proyectos.reduce((s, p) => s + p.apropiaciones, 0), compromisos: proyectos.reduce((s, p) => s + p.compromisos, 0), giros: proyectos.reduce((s, p) => s + p.giros, 0) };
  return { sectores, proyectos, totals };
}

// ─── SUBCOMPONENTES ───────────────────────────────────────────────────────────
const Badge: React.FC<{ p: number }> = ({ p }) => {
  if (!p) return <span style={{ background: '#1E293B', color: '#94A3B8', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>Sin datos</span>;
  if (p >= 0.6) return <span style={{ background: 'rgba(16,185,129,.2)', color: '#10B981', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>✅ En Meta</span>;
  if (p >= 0.4) return <span style={{ background: 'rgba(0,200,224,.2)', color: '#00C8E0', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>🔵 Bueno</span>;
  if (p >= 0.2) return <span style={{ background: 'rgba(245,158,11,.2)', color: '#F59E0B', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>🟡 Seguimiento</span>;
  return <span style={{ background: 'rgba(239,68,68,.2)', color: '#EF4444', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>🔴 Bajo</span>;
};

const PBar: React.FC<{ v: number }> = ({ v }) => (
  <div>
    <span style={{ fontSize: 12, fontWeight: 800, color: riskColor(v) }}>{pct(v)}</span>
    <div style={{ background: 'rgba(100,116,139,.25)', borderRadius: 4, height: 6, marginTop: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, v * 100)}%`, height: '100%', background: riskColor(v), borderRadius: 4 }} />
    </div>
  </div>
);

const KPI: React.FC<{ label: string; value: string; sub: string; color: string; icon: React.ReactNode }> = ({ label, value, sub, color, icon }) => (
  <div style={{ background: '#1A2744', border: '1px solid #243058', borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', right: 14, top: 14, opacity: .1, transform: 'scale(2)' }}>{icon}</div>
    <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', lineHeight: 1, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 11, color: '#94A3B8' }}>{sub}</div>
  </div>
);

// Tooltip oscuro con texto blanco legible
const TTip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
      <div style={{ color: '#F1F5F9', marginBottom: 6, fontWeight: 700, borderBottom: '1px solid #1E293B', paddingBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || '#E2E8F0', marginBottom: 3 }}>
          <span style={{ color: '#94A3B8' }}>{p.name}: </span>
          <strong style={{ color: '#FFFFFF' }}>{typeof p.value === 'number' && p.value > 100 ? fmtCOP(p.value * 1e6) : p.name?.includes('%') || p.value <= 100 ? p.value + '%' : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const TTipCOP: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
      <div style={{ color: '#F1F5F9', marginBottom: 6, fontWeight: 700, borderBottom: '1px solid #1E293B', paddingBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || '#E2E8F0', marginBottom: 3 }}>
          <span style={{ color: '#94A3B8' }}>{p.name}: </span>
          <strong style={{ color: '#FFFFFF' }}>${p.value}B</strong>
        </div>
      ))}
    </div>
  );
};

// Caja de análisis con insight para cada gráfica
const InsightBox: React.FC<{ nivel: 'info' | 'alerta' | 'ok'; texto: string }> = ({ nivel, texto }) => {
  const cfg = {
    info:   { bg: 'rgba(0,200,224,.08)',   border: 'rgba(0,200,224,.3)',   color: '#67E8F9', icon: '💡' },
    alerta: { bg: 'rgba(239,68,68,.08)',   border: 'rgba(239,68,68,.3)',   color: '#FCA5A5', icon: '🚨' },
    ok:     { bg: 'rgba(16,185,129,.08)',  border: 'rgba(16,185,129,.3)',  color: '#6EE7B7', icon: '✅' },
  }[nivel];
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12, color: cfg.color, lineHeight: 1.6, display: 'flex', gap: 8 }}>
      <span style={{ flexShrink: 0 }}>{cfg.icon}</span>
      <span>{texto}</span>
    </div>
  );
};

// Pantalla de carga
const UploadScreen: React.FC<{ onFile: (file: File) => void }> = ({ onFile }) => {
  const [drag, setDrag] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 24 }}>
      <div style={{ background: 'linear-gradient(135deg,#00C8E0,#00E0B0)', borderRadius: 16, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Target size={30} color="#0B1221" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#E2E8F0', marginBottom: 8, textAlign: 'center' as const }}>Módulo de Planeación PDL</h2>
      <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 32, textAlign: 'center' as const, maxWidth: 400 }}>
        Sube la Matriz Excel con las hojas <strong style={{ color: '#00C8E0' }}>PDLU</strong> y <strong style={{ color: '#00C8E0' }}>EJECUCIONES</strong>.
      </p>
      <label
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        style={{ border: `2px dashed ${drag ? '#00C8E0' : '#243058'}`, borderRadius: 14, padding: '40px 60px', cursor: 'pointer', textAlign: 'center' as const, background: drag ? 'rgba(0,200,224,.07)' : 'rgba(26,39,68,.6)', transition: 'all .2s', width: '100%', maxWidth: 420, boxSizing: 'border-box' as const }}
      >
        <Upload size={32} color={drag ? '#00C8E0' : '#64748B'} style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: drag ? '#00C8E0' : '#94A3B8' }}>Arrastra aquí o haz clic</div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Excel · .xlsx · Hojas: PDLU + EJECUCIONES</div>
        <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </label>
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 460, width: '100%' }}>
        {[
          { icon: '📋', t: 'Hoja PDLU', d: 'Cód. Proyecto SEGPLAN · Sector · Indicador · Programa · Meta · POAI' },
          { icon: '📊', t: 'Hoja EJECUCIONES', d: 'Código_Proyecto · Apropiaciones · Compromisos · Giros' },
        ].map(item => (
          <div key={item.t} style={{ background: 'rgba(26,39,68,.8)', border: '1px solid #1E3058', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#CBD5E1', marginBottom: 4 }}>{item.t}</div>
            <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.5 }}>{item.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SPINNER DE CARGA CIRCULAR ─────────────────────────────────────────────────
const SpinnerCarga: React.FC<{ pct: number; etapa: string }> = ({ pct, etapa }) => {
  const R = 52, C = 2 * Math.PI * R, offset = C - (pct / 100) * C;
  const done = pct >= 100;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,33,.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="#1E3058" strokeWidth="10" />
          <circle cx="70" cy="70" r={R} fill="none" stroke={done ? '#10B981' : '#00C8E0'} strokeWidth="10"
            strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset .4s ease, stroke .3s' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <span style={{ fontSize: 30, fontWeight: 900, color: done ? '#10B981' : '#00C8E0', fontFamily: "'Segoe UI',sans-serif" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ marginTop: 24, fontSize: 15, fontWeight: 700, color: '#E2E8F0', fontFamily: "'Segoe UI',sans-serif" }}>{etapa}</div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
interface PlaneacionProps { onDataLoad?: (data: any) => void; }
const Planeacion: React.FC<PlaneacionProps> = ({ onDataLoad }) => {
  const [fileName, setFileName] = useState('');
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [totals, setTotals] = useState({ poai: 0, apropiaciones: 0, compromisos: 0, giros: 0 });
  const [tab, setTab] = useState<'resumen' | 'sectores' | 'proyectos' | 'indicadores' | 'alertas'>('resumen');
  const [sectorFilter, setSectorFilter] = useState('TODOS');
  const [proyDetail, setProyDetail] = useState<Proyecto | null>(null);
  const [progreso, setProgreso] = useState<{pct:number; etapa:string} | null>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setProgreso({ pct: 10, etapa: 'Leyendo archivo...' });
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProgreso({ pct: 40, etapa: 'Procesando hojas...' });
      setTimeout(() => {
      try {
      const wb = XLSX.read(ev.target?.result, { type: 'array' });
      setProgreso({ pct: 70, etapa: 'Analizando datos PDL...' });
      const sheetNames = wb.SheetNames;
      console.log("📋 Hojas en Excel Planeación:", sheetNames);
      // Matriz PDL: busca FDLU/PDLU/PDL. Ejecución: busca el año más reciente (2026/2025/2024) o EJECUCIONES
      const pdluSheet = sheetNames.find(n => /fdlu|pdlu|pdl|matriz/i.test(n)) || sheetNames.find(n => !/^20\d\d$/.test(n.trim())) || sheetNames[0];
      const aniosSheets = sheetNames.filter(n => /^20\d\d$/.test(n.trim())).sort().reverse();
      const ejSheet   = sheetNames.find(n => /ejec/i.test(n)) || aniosSheets[0] || sheetNames[1];
      console.log('📋 Hoja matriz PDL:', pdluSheet, '| Hoja ejecución:', ejSheet);
      // Limitar rango: la hoja puede tener 1M de filas vacías. Recortar al rango real de datos.
      const wsPdlu = wb.Sheets[pdluSheet];
      if (wsPdlu['!ref']) {
        const rng = XLSX.utils.decode_range(wsPdlu['!ref']);
        // Buscar la última fila con datos reales (máx 2000 para seguridad)
        rng.e.r = Math.min(rng.e.r, 2000);
        wsPdlu['!ref'] = XLSX.utils.encode_range(rng);
      }
      const pdluRows  = XLSX.utils.sheet_to_json(wsPdlu) as PDLURow[];
      const ejecRaw   = XLSX.utils.sheet_to_json(wb.Sheets[ejSheet], { header: 1 }) as any[][];
      let ejRows: EjecRow[] = [];
      if (ejecRaw.length > 1) {
        let headerIdx = 0;
        for (let i = 0; i < Math.min(5, ejecRaw.length); i++) {
          const row = ejecRaw[i];
          if (row.some((c: any) => String(c || '').toLowerCase().includes('proyecto') || String(c || '').toLowerCase().includes('aprop'))) { headerIdx = i; break; }
        }
        const headers = ejecRaw[headerIdx].map((h: any) => String(h || '').trim());
        for (let i = headerIdx + 1; i < ejecRaw.length; i++) {
          const row = ejecRaw[i];
          if (!row.some((c: any) => c !== null && c !== undefined && c !== '')) continue;
          const obj: EjecRow = {};
          headers.forEach((h, j) => { obj[h] = row[j] ?? ''; });
          ejRows.push(obj);
        }
      }
      const result = processData(pdluRows, ejRows);
      setProgreso({ pct: 100, etapa: '✅ Cargado' });
      setSectores(result.sectores); setProyectos(result.proyectos); setTotals(result.totals);
      setTab('resumen'); setSectorFilter('TODOS');
      setTimeout(() => setProgreso(null), 900);
      onDataLoad?.({ sectores: result.sectores, proyectos: result.proyectos, totals: result.totals });
      } catch (err) {
        console.error("❌ Error procesando Excel Planeación:", err);
        setProgreso(null);
        alert("Error al procesar el Excel. Detalle: " + err);
      }
      }, 50);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  if (!sectores.length) return (
    <div style={{ background: '#0B1221', minHeight: '100%', borderRadius: 10 }}>
      {progreso && <SpinnerCarga pct={progreso.pct} etapa={progreso.etapa} />}
      <UploadScreen onFile={handleFile} />
    </div>
  );

  // ── Datos derivados ──
  const pctComp  = totals.apropiaciones > 0 ? totals.compromisos / totals.apropiaciones : 0;
  const pctGiros = totals.apropiaciones > 0 ? totals.giros / totals.apropiaciones : 0;
  const proyFilt = sectorFilter === 'TODOS' ? proyectos : proyectos.filter(p => p.sector === sectorFilter);
  const uniqueSectors = [...new Set(proyectos.map(p => p.sector))].sort();
  const conAprop = proyectos.filter(p => p.apropiaciones > 0);
  const sinAprop = proyectos.filter(p => p.apropiaciones === 0);
  const allIndicadores = proyectos.flatMap(p => p.indicadores.map(i => ({ ...i, proyecto: p.nombre, sector: p.sector })));

  // Sector con mayor y menor ejecución
  const secConAprop = sectores.filter(s => s.apropiaciones > 0);
  const mejorSector = [...secConAprop].sort((a, b) => b.pctComp - a.pctComp)[0];
  const peorSector  = [...secConAprop].sort((a, b) => a.pctComp - b.pctComp)[0];
  const brechaGirosComp = totals.compromisos > 0 ? (totals.compromisos - totals.giros) / totals.compromisos : 0;
  const pctSinAprop = proyectos.length > 0 ? sinAprop.length / proyectos.length : 0;

  // Chart data
  const donutData = sectores.slice(0, 10).map((s, i) => ({ name: s.nombre.split(',')[0].split(' ').slice(0, 2).join(' '), value: +(s.poai / 1e9).toFixed(2), color: CHART_COLORS[i] }));
  const waterfallData = [
    { name: 'POAI 2026', valor: +(totals.poai / 1e9).toFixed(1), color: '#00C8E0' },
    { name: 'Apropiaciones', valor: +(totals.apropiaciones / 1e9).toFixed(1), color: '#F59E0B' },
    { name: 'Compromisos', valor: +(totals.compromisos / 1e9).toFixed(1), color: '#10B981' },
    { name: 'Giros', valor: +(totals.giros / 1e9).toFixed(1), color: '#EF4444' },
  ];
  const compBarH  = secConAprop.map(s => ({ name: s.nombre.split(',')[0].split(' ').slice(0, 2).join(' '), valor: +(s.pctComp * 100).toFixed(1) })).sort((a, b) => b.valor - a.valor);
  const girosBarH = secConAprop.map(s => ({ name: s.nombre.split(',')[0].split(' ').slice(0, 2).join(' '), valor: +(s.pctGiros * 100).toFixed(1) })).sort((a, b) => b.valor - a.valor);
  const barMulti  = sectores.map(s => ({ name: s.nombre.split(',')[0].split(' ').slice(0, 2).join(' '), POAI: +(s.poai / 1e9).toFixed(1), Aprop: +(s.apropiaciones / 1e9).toFixed(1), Comp: +(s.compromisos / 1e9).toFixed(1), Giros: +(s.giros / 1e9).toFixed(1) }));
  const radarData = secConAprop.map(s => ({ subject: s.nombre.split(' ')[0], comp: +(s.pctComp * 100).toFixed(1), giros: +(s.pctGiros * 100).toFixed(1) }));
  const topProyComp = [...proyectos].filter(p => p.compromisos > 0).sort((a, b) => b.compromisos - a.compromisos).slice(0, 10).map(p => ({ name: p.codigo + ' – ' + p.nombre.split('-').slice(1).join('').substring(0, 22), comp: +(p.compromisos / 1e6).toFixed(0), giros: +(p.giros / 1e6).toFixed(0) }));
  const riesgoData = [
    { name: 'Crítico <10%', value: conAprop.filter(p => p.pctComp < 0.1).length, color: '#EF4444' },
    { name: 'Bajo 10-20%', value: conAprop.filter(p => p.pctComp >= 0.1 && p.pctComp < 0.2).length, color: '#F59E0B' },
    { name: 'Seguimiento', value: conAprop.filter(p => p.pctComp >= 0.2 && p.pctComp < 0.4).length, color: '#00C8E0' },
    { name: 'En Meta ≥40%', value: conAprop.filter(p => p.pctComp >= 0.4).length, color: '#10B981' },
  ].filter(d => d.value > 0);
  const indBySector = uniqueSectors.map(s => ({ sector: s.split(',')[0].split(' ').slice(0, 2).join(' '), count: allIndicadores.filter(i => i.sector === s).length })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
  const eficienciaData = secConAprop.filter(s => s.compromisos > 0).map(s => ({ name: s.nombre.split(' ')[0], ef: +((s.giros / s.compromisos) * 100).toFixed(1) })).sort((a, b) => b.ef - a.ef);

  const NAV = [
    { key: 'resumen' as const, label: 'Resumen', icon: <TrendingUp size={13}/> },
    { key: 'sectores' as const, label: 'Sectores', icon: <BarChart2 size={13}/> },
    { key: 'proyectos' as const, label: 'Proyectos', icon: <Target size={13}/> },
    { key: 'indicadores' as const, label: 'Indicadores', icon: <CheckCircle size={13}/> },
    { key: 'alertas' as const, label: 'Alertas', icon: <AlertCircle size={13}/> },
  ];

  const cardStyle: React.CSSProperties = { background: '#1A2744', border: '1px solid #243058', borderRadius: 14, padding: 18 };
  const titleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: '#F1F5F9', marginBottom: 2 };
  const subStyle: React.CSSProperties = { fontSize: 10, color: '#64748B', marginBottom: 14 };
  const thStyle: React.CSSProperties = { background: '#111929', color: '#94A3B8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .8, padding: '9px 12px', textAlign: 'left' as const, whiteSpace: 'nowrap' as const, borderBottom: '1px solid #1E3058' };
  const tdStyle: React.CSSProperties = { padding: '9px 12px', fontSize: 11, color: '#CBD5E1', borderBottom: '1px solid rgba(30,48,88,.5)', verticalAlign: 'middle' as const };

  // Tick blanco para ejes
  const tickStyle = { fill: '#CBD5E1', fontSize: 10 };
  const tickStyleSm = { fill: '#94A3B8', fontSize: 9 };

  return (
    <div style={{ background: '#0B1221', minHeight: '100%', fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#E2E8F0' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#1B3A6B,#1e3a6e)', borderBottom: '1px solid #1E3058', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>📐 Planeación PDL · Usme 2026</div>
          <div style={{ fontSize: 10, color: '#00C8E0', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginTop: 1 }}>
            {fileName} · {proyectos.length} proyectos · {allIndicadores.length} indicadores
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,200,224,.1)', border: '1px solid rgba(0,200,224,.3)', color: '#00C8E0', fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
          <Upload size={13} /> Cargar nuevo Excel
          <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
      </div>

      {/* TABS */}
      <div style={{ background: '#111929', borderBottom: '1px solid #1E3058', padding: '0 12px', display: 'flex', gap: 2, overflowX: 'auto' as const }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => setTab(n.key)} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer', color: tab === n.key ? '#00C8E0' : '#64748B', borderBottom: tab === n.key ? '2px solid #00C8E0' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' as const, transition: 'all .2s' }}>
            {n.icon}{n.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 14px 32px', maxWidth: 1300, margin: '0 auto' }}>

        {/* ══════════ RESUMEN ══════════ */}
        {tab === 'resumen' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
              <KPI label="POAI 2026" value={fmtCOP(totals.poai)} sub="Presupuesto Anual Inversión" color="#00C8E0" icon={<DollarSign/>} />
              <KPI label="Apropiaciones" value={fmtCOP(totals.apropiaciones)} sub="Total apropiado" color="#F59E0B" icon={<DollarSign/>} />
              <KPI label="Compromisos" value={fmtCOP(totals.compromisos)} sub={pct(pctComp) + ' de apropiaciones'} color="#10B981" icon={<CheckCircle/>} />
              <KPI label="Giros" value={fmtCOP(totals.giros)} sub={pct(pctGiros) + ' de apropiaciones'} color={pctGiros < 0.2 ? '#EF4444' : '#10B981'} icon={<TrendingUp/>} />
              <KPI label="Proyectos" value={String(proyectos.length)} sub={conAprop.length + ' con ejecución'} color="#818CF8" icon={<Target/>} />
              <KPI label="Indicadores PDL" value={String(allIndicadores.length)} sub="Metas anualizadas 2026" color="#F472B6" icon={<BarChart2/>} />
            </div>

            {sinAprop.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertCircle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 }}>
                  <strong style={{ color: '#F59E0B' }}>{sinAprop.length} proyectos</strong> no registran apropiaciones en EJECUCIONES. Verificar si están pendientes de presupuestar.
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 16 }}>
              {/* Donut POAI */}
              <div style={cardStyle}>
                <div style={titleStyle}>Distribución POAI por Sector</div>
                <div style={subStyle}>Recursos Plan Operativo Anual de Inversión 2026</div>
                <ResponsiveContainer width="99%" height={260}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.color} stroke="#0B1221" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => ['$' + v + 'B', 'POAI']} contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: '#94A3B8' }} />
                  </PieChart>
                </ResponsiveContainer>
                <InsightBox nivel={sectores.length > 0 ? 'info' : 'info'} texto={`El sector con mayor POAI es ${sectores[0]?.nombre.split(',')[0].split(' ').slice(0,2).join(' ')} con ${fmtCOP(sectores[0]?.poai)} (${pct(sectores[0]?.poai / totals.poai)}). Los 3 primeros sectores concentran el ${pct(sectores.slice(0,3).reduce((s,x)=>s+x.poai,0)/totals.poai)} del presupuesto.`} />
              </div>

              {/* Waterfall POAI→Giros */}
              <div style={cardStyle}>
                <div style={titleStyle}>Embudo Presupuestal 2026</div>
                <div style={subStyle}>De POAI a Giros — pérdida en cada etapa (billones COP)</div>
                <ResponsiveContainer width="99%" height={260}>
                  <BarChart data={waterfallData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,48,88,.4)" />
                    <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v => '$' + v + 'B'} />
                    <Tooltip content={<TTipCOP />} />
                    <Bar dataKey="valor" radius={[5,5,0,0]} label={{ position: 'top', fill: '#E2E8F0', fontSize: 11, fontWeight: 700, formatter: (v: number) => '$' + v + 'B' }}>
                      {waterfallData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <InsightBox
                  nivel={pctGiros < 0.15 ? 'alerta' : pctComp >= 0.5 ? 'ok' : 'info'}
                  texto={`Del POAI de ${fmtCOP(totals.poai)}, se comprometió el ${pct(pctComp)} y se giró el ${pct(pctGiros)}. ${brechaGirosComp > 0.4 ? `Hay ${fmtCOP(totals.compromisos - totals.giros)} comprometidos sin girar — riesgo de rezago al cierre del año.` : 'La brecha entre compromisos y giros es manejable.'}`}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
              {/* % Compromisos */}
              <div style={cardStyle}>
                <div style={titleStyle}>% Compromisos por Sector</div>
                <div style={subStyle}>Compromisos / Apropiaciones — umbral mínimo recomendado: 40%</div>
                <ResponsiveContainer width="99%" height={Math.max(220, compBarH.length * 28)}>
                  <BarChart data={compBarH} layout="vertical" barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,48,88,.4)" horizontal={false} />
                    <XAxis type="number" tick={tickStyle} domain={[0, 100]} tickFormatter={v => v + '%'} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={tickStyleSm} width={90} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => [v + '%', '% Compromisos']} contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} />
                    <Bar dataKey="valor" radius={[0,4,4,0]} label={{ position: 'right', fill: '#E2E8F0', fontSize: 10, fontWeight: 700, formatter: (v: number) => v + '%' }}>
                      {compBarH.map((d, i) => <Cell key={i} fill={d.valor >= 40 ? '#10B981' : d.valor >= 20 ? '#00C8E0' : '#F59E0B'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <InsightBox
                  nivel={mejorSector?.pctComp >= 0.4 ? 'ok' : 'alerta'}
                  texto={`${mejorSector?.nombre.split(',')[0].split(' ').slice(0,2).join(' ')} lidera con ${pct(mejorSector?.pctComp)} de compromisos. ${peorSector?.nombre.split(',')[0].split(' ').slice(0,2).join(' ')} está en rezago con ${pct(peorSector?.pctComp)} — requiere acción inmediata para evitar pérdida de recursos.`}
                />
              </div>

              {/* % Giros */}
              <div style={cardStyle}>
                <div style={titleStyle}>% Giros por Sector</div>
                <div style={subStyle}>Giros / Apropiaciones — flujo de caja real ejecutado</div>
                <ResponsiveContainer width="99%" height={Math.max(220, girosBarH.length * 28)}>
                  <BarChart data={girosBarH} layout="vertical" barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,48,88,.4)" horizontal={false} />
                    <XAxis type="number" tick={tickStyle} tickFormatter={v => v + '%'} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={tickStyleSm} width={90} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => [v + '%', '% Giros']} contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} />
                    <Bar dataKey="valor" radius={[0,4,4,0]} label={{ position: 'right', fill: '#E2E8F0', fontSize: 10, fontWeight: 700, formatter: (v: number) => v + '%' }}>
                      {girosBarH.map((d, i) => <Cell key={i} fill={d.valor >= 20 ? '#10B981' : d.valor >= 5 ? '#00C8E0' : '#EF4444'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <InsightBox
                  nivel={pctGiros < 0.1 ? 'alerta' : pctGiros > 0.3 ? 'ok' : 'info'}
                  texto={`Los giros representan el ${pct(pctGiros)} de las apropiaciones totales. Un giro bajo indica que los contratos están firmados pero los recursos no han llegado a los beneficiarios ni contratistas — riesgo de rezago.`}
                />
              </div>
            </div>
          </>
        )}

        {/* ══════════ SECTORES ══════════ */}
        {tab === 'sectores' && (
          <>
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={titleStyle}>Comparativo Sectorial — POAI · Apropiaciones · Compromisos · Giros</div>
              <div style={subStyle}>Valores en billones de pesos COP</div>
              <ResponsiveContainer width="99%" height={340}>
                <BarChart data={barMulti} barGap={2} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,48,88,.4)" />
                  <XAxis dataKey="name" tick={tickStyleSm} axisLine={false} angle={-20} textAnchor="end" height={55} />
                  <YAxis tick={tickStyle} axisLine={false} tickFormatter={v => '$' + v + 'B'} />
                  <Tooltip content={<TTipCOP />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8', paddingTop: 6 }} />
                  <Bar dataKey="POAI" fill="rgba(0,200,224,.6)" stroke="#00C8E0" strokeWidth={1} radius={[3,3,0,0]} />
                  <Bar dataKey="Aprop" fill="rgba(245,158,11,.6)" stroke="#F59E0B" strokeWidth={1} radius={[3,3,0,0]} />
                  <Bar dataKey="Comp" fill="rgba(16,185,129,.7)" stroke="#10B981" strokeWidth={1} radius={[3,3,0,0]} />
                  <Bar dataKey="Giros" fill="rgba(239,68,68,.65)" stroke="#EF4444" strokeWidth={1} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <InsightBox nivel="info" texto={`El sector ${barMulti[0]?.name} tiene el mayor presupuesto. Comparar la altura de la barra POAI vs Giros revela qué sectores tienen mayor brecha de ejecución — mientras más diferencia, mayor riesgo de no ejecutar los recursos en el año.`} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 16 }}>
              {/* Radar */}
              <div style={cardStyle}>
                <div style={titleStyle}>Radar de Ejecución Sectorial</div>
                <div style={subStyle}>% Compromisos (cian) vs % Giros (verde) por sector</div>
                <ResponsiveContainer width="99%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(36,48,88,.6)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#CBD5E1', fontSize: 9 }} />
                    <PolarRadiusAxis tick={{ fill: '#64748B', fontSize: 8 }} tickFormatter={v => v + '%'} />
                    <Radar name="% Compromisos" dataKey="comp" stroke="#00C8E0" fill="rgba(0,200,224,.15)" strokeWidth={2} />
                    <Radar name="% Giros" dataKey="giros" stroke="#10B981" fill="rgba(16,185,129,.12)" strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                    <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} formatter={(v: any) => [v + '%']} />
                  </RadarChart>
                </ResponsiveContainer>
                <InsightBox nivel="info" texto="Sectores con área cian grande pero área verde pequeña tienen compromisos altos pero giros bajos — contratos firmados sin pago. Eso indica posibles demoras en trámites de pago o controversias contractuales." />
              </div>

              {/* Eficiencia de pago */}
              <div style={cardStyle}>
                <div style={titleStyle}>Eficiencia de Pago — Giros / Compromisos</div>
                <div style={subStyle}>De lo comprometido, ¿cuánto se giró efectivamente?</div>
                <ResponsiveContainer width="99%" height={280}>
                  <BarChart data={eficienciaData} layout="vertical" barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,48,88,.4)" horizontal={false} />
                    <XAxis type="number" tick={tickStyle} tickFormatter={v => v + '%'} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={tickStyleSm} width={80} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => [v + '%', 'Giros/Comp.']} contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} />
                    <Bar dataKey="ef" radius={[0,4,4,0]} label={{ position: 'right', fill: '#E2E8F0', fontSize: 10, fontWeight: 700, formatter: (v: number) => v + '%' }}>
                      {eficienciaData.map((d, i) => <Cell key={i} fill={d.ef >= 50 ? '#10B981' : d.ef >= 20 ? '#00C8E0' : '#F59E0B'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <InsightBox nivel={eficienciaData[eficienciaData.length-1]?.ef < 10 ? 'alerta' : 'info'} texto={`${eficienciaData[0]?.name} tiene la mayor eficiencia de pago (${eficienciaData[0]?.ef}%). ${eficienciaData[eficienciaData.length-1]?.name} tiene la menor (${eficienciaData[eficienciaData.length-1]?.ef}%) — significa que contratos firmados no se están pagando: revisar cuellos de botella administrativos.`} />
              </div>
            </div>

            {/* Tabla sectores */}
            <div style={{ background: '#1A2744', border: '1px solid #243058', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #1E3058', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Tabla Resumen por Sector</div>
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                  <thead><tr>{['Sector','POAI 2026','Apropiaciones','Compromisos','% Comp.','Giros','% Giros','Estado'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {sectores.map((s, i) => (
                      <tr key={i} style={{ background: i%2===0?'transparent':'rgba(0,200,224,.02)' }}>
                        <td style={tdStyle}><span style={{ background: sColor(s.nombre)+'20', color: sColor(s.nombre), border:'1px solid '+sColor(s.nombre)+'40', padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:600 }}>{s.nombre.split(',')[0].substring(0,22)}</span></td>
                        <td style={tdStyle}>{fmtCOP(s.poai)}</td><td style={tdStyle}>{fmtCOP(s.apropiaciones)}</td><td style={tdStyle}>{fmtCOP(s.compromisos)}</td>
                        <td style={tdStyle}><PBar v={s.pctComp}/></td><td style={tdStyle}>{fmtCOP(s.giros)}</td><td style={tdStyle}><PBar v={s.pctGiros}/></td>
                        <td style={tdStyle}><Badge p={s.pctComp}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══════════ PROYECTOS ══════════ */}
        {tab === 'proyectos' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' as const, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Sector:</span>
              {['TODOS', ...uniqueSectors].map(s => (
                <button key={s} onClick={() => setSectorFilter(s)} style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid', fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'all .2s', borderColor: sectorFilter===s?'#00C8E0':'#243058', background: sectorFilter===s?'#00C8E0':'transparent', color: sectorFilter===s?'#0B1221':'#94A3B8' }}>
                  {s==='TODOS'?'Todos':s.split(',')[0].split(' ').slice(0,2).join(' ')}
                </button>
              ))}
            </div>

            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={titleStyle}>Top 10 Proyectos — Compromisos vs Giros (millones COP)</div>
              <div style={subStyle}>Los proyectos con mayor compromiso. La diferencia entre barras revela demoras en pagos.</div>
              <ResponsiveContainer width="99%" height={340}>
                <BarChart data={topProyComp} layout="vertical" barGap={3} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,48,88,.4)" horizontal={false} />
                  <XAxis type="number" tick={tickStyle} tickFormatter={v => '$' + v + 'M'} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#CBD5E1', fontSize: 9 }} width={170} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} formatter={(v: any) => ['$' + v + 'M']} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                  <Bar name="Compromisos $M" dataKey="comp" fill="rgba(16,185,129,.75)" radius={[0,4,4,0]} />
                  <Bar name="Giros $M" dataKey="giros" fill="rgba(0,200,224,.65)" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
              <InsightBox nivel="info" texto="Proyectos donde la barra verde (compromisos) es mucho mayor que la azul (giros) tienen contratos firmados pero pagos pendientes. Esto debe alertar al Edil: ¿hay controversias contractuales, demoras en actas de recibo o problemas de tesorería?" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
              <div style={cardStyle}>
                <div style={titleStyle}>Semáforo de Ejecución por Proyecto</div>
                <div style={subStyle}>Haz clic para ver el detalle completo del proyecto</div>
                <div style={{ maxHeight: 320, overflowY: 'auto' as const }}>
                  {proyFilt.filter(p => p.apropiaciones > 0).sort((a,b)=>b.pctComp-a.pctComp).map(p => (
                    <div key={p.codigo} onClick={() => setProyDetail(p)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'1px solid rgba(36,48,88,.4)', cursor:'pointer' }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:riskColor(p.pctComp), flexShrink:0 }}/>
                      <div style={{ flex:1, fontSize:11, color:'#CBD5E1' }}>{p.nombre.substring(0,42)}</div>
                      <div style={{ fontSize:12, fontWeight:800, color:riskColor(p.pctComp), whiteSpace:'nowrap' as const }}>{pct(p.pctComp)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={titleStyle}>POAI Top 12 por Proyecto</div>
                <div style={subStyle}>Billones COP · haz clic para ver detalle</div>
                <ResponsiveContainer width="99%" height={320}>
                  <BarChart data={proyFilt.slice(0,12).map(p=>({ name:String(p.codigo), poai:+(p.poai/1e9).toFixed(2), sector:p.sector }))} layout="vertical" barCategoryGap="18%"
                    onClick={(d:any)=>{ if(d?.activePayload){ const p=proyFilt.find(x=>x.codigo===Number(d.activePayload[0].payload.name)); if(p) setProyDetail(p); }}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,48,88,.4)" horizontal={false} />
                    <XAxis type="number" tick={tickStyle} tickFormatter={v=>'$'+v+'B'} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill:'#CBD5E1', fontSize:10 }} width={40} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:'#0F172A', border:'1px solid #334155', borderRadius:8, fontSize:11, color:'#F1F5F9' }} formatter={(v:any)=>['$'+v+'B','POAI']} />
                    <Bar dataKey="poai" radius={[0,4,4,0]}>
                      {proyFilt.slice(0,12).map((p,i)=><Cell key={i} fill={sColor(p.sector)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background:'#1A2744', border:'1px solid #243058', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #1E3058', fontSize:13, fontWeight:700, color:'#F1F5F9' }}>Tabla Detallada de Proyectos</div>
              <div style={{ overflowX:'auto' as const }}>
                <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                  <thead><tr>{['Cód.','Nombre','Sector','POAI','Apropiaciones','Compromisos','% Comp.','Giros','% Giros','Estado',''].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {proyFilt.map((p,i)=>(
                      <tr key={i} style={{ background:i%2===0?'transparent':'rgba(0,200,224,.02)', cursor:'pointer' }} onClick={()=>setProyDetail(p)}>
                        <td style={{ ...tdStyle, fontFamily:'monospace', color:'#00C8E0', fontSize:12 }}>{p.codigo}</td>
                        <td style={{ ...tdStyle, maxWidth:200 }}>{p.nombre.split('-').slice(1).join('-').trim().substring(0,35)}</td>
                        <td style={tdStyle}><span style={{ background:sColor(p.sector)+'18', color:sColor(p.sector), border:'1px solid '+sColor(p.sector)+'35', padding:'2px 7px', borderRadius:6, fontSize:9, fontWeight:600 }}>{p.sector.split(',')[0].split(' ').slice(0,2).join(' ')}</span></td>
                        <td style={tdStyle}>{fmtCOP(p.poai)}</td><td style={tdStyle}>{fmtCOP(p.apropiaciones)}</td><td style={tdStyle}>{fmtCOP(p.compromisos)}</td>
                        <td style={tdStyle}><PBar v={p.pctComp}/></td><td style={tdStyle}>{fmtCOP(p.giros)}</td><td style={tdStyle}><PBar v={p.pctGiros}/></td>
                        <td style={tdStyle}><Badge p={p.pctComp}/></td><td style={{ ...tdStyle, color:'#475569' }}>▶</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══════════ INDICADORES ══════════ */}
        {tab === 'indicadores' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:16 }}>
              <div style={cardStyle}>
                <div style={titleStyle}>Indicadores por Sector</div>
                <div style={subStyle}>Cantidad de indicadores de producto registrados en el PDL</div>
                <ResponsiveContainer width="99%" height={260}>
                  <BarChart data={indBySector} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,48,88,.4)" horizontal={false} />
                    <XAxis type="number" tick={tickStyle} axisLine={false} />
                    <YAxis type="category" dataKey="sector" tick={tickStyleSm} width={90} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:'#0F172A', border:'1px solid #334155', borderRadius:8, fontSize:11, color:'#F1F5F9' }} />
                    <Bar dataKey="count" name="Indicadores" radius={[0,4,4,0]} label={{ position:'right', fill:'#E2E8F0', fontSize:10, fontWeight:700 }}>
                      {indBySector.map((d,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <InsightBox nivel="info" texto={`El sector con más indicadores es ${indBySector[0]?.sector} (${indBySector[0]?.count} indicadores). Más indicadores significa más metas que el Edil puede controlar: solicite informes de avance por cada uno.`} />
              </div>

              <div style={cardStyle}>
                <div style={titleStyle}>Top 10 Metas Anualizadas 2026</div>
                <div style={subStyle}>Magnitud de la meta definitiva por indicador</div>
                <ResponsiveContainer width="99%" height={260}>
                  <BarChart data={[...allIndicadores].sort((a,b)=>b.meta-a.meta).slice(0,10).map(i=>({ name:i.descripcion.substring(0,26)+'…', meta:i.meta }))} layout="vertical" barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,48,88,.4)" horizontal={false} />
                    <XAxis type="number" tick={tickStyle} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill:'#94A3B8', fontSize:8 }} width={130} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:'#0F172A', border:'1px solid #334155', borderRadius:8, fontSize:11, color:'#F1F5F9' }} />
                    <Bar dataKey="meta" name="Meta" fill="rgba(129,140,248,.75)" stroke="#818CF8" radius={[0,4,4,0]} label={{ position:'right', fill:'#E2E8F0', fontSize:9, fontWeight:700 }} />
                  </BarChart>
                </ResponsiveContainer>
                <InsightBox nivel="info" texto="Las metas con mayor magnitud son las que más recursos demandan. Cruzarlas con el % de compromisos permite identificar si los proyectos más ambiciosos están siendo priorizados en la ejecución." />
              </div>
            </div>

            <div style={{ background:'#1A2744', border:'1px solid #243058', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #1E3058', fontSize:13, fontWeight:700, color:'#F1F5F9' }}>Matriz de Indicadores de Producto PDL 2026</div>
              <div style={{ overflowX:'auto' as const, maxHeight:500, overflowY:'auto' as const }}>
                <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                  <thead><tr>{['#','Indicador de Producto','Sector','Programa','Proyecto','Meta 2026','POAI'].map(h=><th key={h} style={{ ...thStyle, position:'sticky' as const, top:0, zIndex:1 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {allIndicadores.sort((a,b)=>a.no-b.no).map((ind,i)=>(
                      <tr key={i} style={{ background:i%2===0?'transparent':'rgba(0,200,224,.02)' }}>
                        <td style={{ ...tdStyle, fontFamily:'monospace', color:'#00C8E0', fontSize:11 }}>{ind.no}</td>
                        <td style={{ ...tdStyle, maxWidth:260, fontSize:10, color:'#CBD5E1' }}>{ind.descripcion}</td>
                        <td style={tdStyle}><span style={{ background:sColor(ind.sector)+'18', color:sColor(ind.sector), border:'1px solid '+sColor(ind.sector)+'35', padding:'2px 7px', borderRadius:6, fontSize:9, fontWeight:600 }}>{ind.sector.split(',')[0].split(' ').slice(0,2).join(' ')}</span></td>
                        <td style={{ ...tdStyle, fontSize:10, color:'#64748B', maxWidth:160 }}>{ind.programa.split(' - ').slice(1).join(' - ').substring(0,40)}</td>
                        <td style={{ ...tdStyle, fontSize:10, color:'#94A3B8', maxWidth:150 }}>{ind.proyecto.substring(0,35)}</td>
                        <td style={{ ...tdStyle, fontWeight:700, color:'#00C8E0' }}>{ind.meta.toLocaleString('es-CO')}</td>
                        <td style={tdStyle}>{fmtCOP(ind.poai)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══════════ ALERTAS ══════════ */}
        {tab === 'alertas' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:18 }}>
              {[
                { label:'Riesgo Crítico', val:conAprop.filter(p=>p.pctComp<0.1).length, sub:'< 10% compromisos', color:'#EF4444' },
                { label:'Riesgo Alto', val:conAprop.filter(p=>p.pctComp>=0.1&&p.pctComp<0.2).length, sub:'10% – 20%', color:'#F59E0B' },
                { label:'Seguimiento', val:conAprop.filter(p=>p.pctComp>=0.2&&p.pctComp<0.4).length, sub:'20% – 40%', color:'#00C8E0' },
                { label:'En Meta', val:conAprop.filter(p=>p.pctComp>=0.4).length, sub:'≥ 40%', color:'#10B981' },
                { label:'Sin Ejecución', val:sinAprop.length, sub:'Sin apropiación', color:'#64748B' },
              ].map((k,i)=>(
                <div key={i} style={{ background:'#1A2744', border:'1px solid #243058', borderTop:'3px solid '+k.color, borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase' as const, letterSpacing:1 }}>{k.label}</div>
                  <div style={{ fontSize:28, fontWeight:800, color:k.color, lineHeight:1.1, margin:'6px 0 4px' }}>{k.val}</div>
                  <div style={{ fontSize:11, color:'#64748B' }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:16 }}>
              <div style={cardStyle}>
                <div style={titleStyle}>Distribución de Riesgo de Proyectos</div>
                <div style={subStyle}>Clasificación por % de compromisos / apropiaciones</div>
                <ResponsiveContainer width="99%" height={250}>
                  <PieChart>
                    <Pie data={riesgoData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} label={({ name, value, percent }) => `${value} (${(percent*100).toFixed(0)}%)`} labelLine={{ stroke:'#334155' }}>
                      {riesgoData.map((d,i)=><Cell key={i} fill={d.color} stroke="#0B1221" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:'#0F172A', border:'1px solid #334155', borderRadius:8, fontSize:11, color:'#F1F5F9' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:10, color:'#94A3B8' }} />
                  </PieChart>
                </ResponsiveContainer>
                <InsightBox
                  nivel={conAprop.filter(p=>p.pctComp<0.2).length > conAprop.length*0.3 ? 'alerta' : 'info'}
                  texto={`${conAprop.filter(p=>p.pctComp<0.2).length} proyectos (${pct(conAprop.filter(p=>p.pctComp<0.2).length/Math.max(conAprop.length,1))}) tienen compromisos por debajo del 20%. ${pctSinAprop > 0.2 ? `Además, el ${pct(pctSinAprop)} de los proyectos no registra apropiación — verificar si hay error en la hoja de ejecuciones.` : ''}`}
                />
              </div>

              <div style={cardStyle}>
                <div style={titleStyle}>Proyectos Sin Ejecución Registrada</div>
                <div style={subStyle}>Sin datos en hoja EJECUCIONES — requieren verificación urgente</div>
                <div style={{ maxHeight:250, overflowY:'auto' as const }}>
                  {sinAprop.length === 0
                    ? <div style={{ padding:'20px 0', textAlign:'center' as const, color:'#10B981', fontSize:12 }}>✅ Todos los proyectos tienen apropiación registrada</div>
                    : sinAprop.map((p,i)=>(
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid rgba(36,48,88,.4)' }}>
                        <span style={{ fontFamily:'monospace', fontSize:11, color:'#00C8E0', flexShrink:0 }}>{p.codigo}</span>
                        <span style={{ flex:1, fontSize:11, color:'#94A3B8' }}>{p.nombre.split('-').slice(1).join('-').trim().substring(0,40)}</span>
                        <span style={{ background:sColor(p.sector)+'18', color:sColor(p.sector), fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:6, whiteSpace:'nowrap' as const }}>{p.sector.split(' ')[0]}</span>
                      </div>
                    ))
                  }
                </div>
                <InsightBox nivel={sinAprop.length > 5 ? 'alerta' : 'info'} texto={sinAprop.length > 0 ? `${sinAprop.length} proyectos del PDL no tienen ejecución en EJECUCIONES. Puede significar que aún no han sido contratados, que están en etapa precontractual, o que hay un error en los datos. El Edil debe solicitar informe de cada uno.` : 'Todos los proyectos del PDL tienen registro de ejecución.'} />
              </div>
            </div>

            {/* Tabla brecha giros/compromisos */}
            <div style={{ background:'#1A2744', border:'1px solid #243058', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #1E3058', fontSize:13, fontWeight:700, color:'#F1F5F9' }}>🔴 Alertas — Brecha entre Compromisos y Giros</div>
              <div style={{ overflowX:'auto' as const }}>
                <table style={{ width:'100%', borderCollapse:'collapse' as const }}>
                  <thead><tr>{['Proyecto','Sector','Compromisos','Giros','Giros/Comp.','Alerta'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {proyectos.filter(p=>p.compromisos>0).sort((a,b)=>(a.giros/a.compromisos)-(b.giros/b.compromisos)).map((p,i)=>{
                      const ratio = p.compromisos>0 ? p.giros/p.compromisos : 0;
                      return (
                        <tr key={i} style={{ background:i%2===0?'transparent':'rgba(0,200,224,.02)' }}>
                          <td style={{ ...tdStyle, fontSize:11 }}>{p.nombre.substring(0,45)}</td>
                          <td style={tdStyle}><span style={{ background:sColor(p.sector)+'18', color:sColor(p.sector), border:'1px solid '+sColor(p.sector)+'35', padding:'2px 7px', borderRadius:6, fontSize:9, fontWeight:600 }}>{p.sector.split(' ')[0]}</span></td>
                          <td style={tdStyle}>{fmtCOP(p.compromisos)}</td>
                          <td style={tdStyle}>{fmtCOP(p.giros)}</td>
                          <td style={tdStyle}><PBar v={ratio}/></td>
                          <td style={tdStyle}>{ratio<0.05?<span style={{ background:'rgba(239,68,68,.2)',color:'#FCA5A5',padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700 }}>🔴 Crítico</span>:ratio<0.15?<span style={{ background:'rgba(245,158,11,.2)',color:'#FDE68A',padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700 }}>🟡 Alerta</span>:<span style={{ background:'rgba(16,185,129,.2)',color:'#6EE7B7',padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700 }}>🟢 Normal</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:'10px 18px', borderTop:'1px solid #1E3058' }}>
                <InsightBox nivel="info" texto="Proyectos Críticos: contratos firmados pero sin pago. Puede indicar rechazo de cuentas de cobro, controversias contractuales, o demoras en trámites de tesorería. El Edil puede preguntar en debate cuáles son los obstáculos específicos de cada caso." />
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL DETALLE PROYECTO */}
      {proyDetail && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={()=>setProyDetail(null)}>
          <div style={{ background:'#111929', border:'1px solid #243058', borderRadius:16, padding:22, maxWidth:620, width:'100%', maxHeight:'88vh', overflowY:'auto' as const }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:11, fontFamily:'monospace', color:'#00C8E0' }}>SEGPLAN {proyDetail.codigo}</div>
                <div style={{ fontSize:15, fontWeight:800, color:'#E2E8F0', marginTop:2 }}>{proyDetail.nombre.split('-').slice(1).join('-').trim()}</div>
                <div style={{ fontSize:11, color:'#64748B', marginTop:4 }}>{proyDetail.sector}</div>
              </div>
              <button onClick={()=>setProyDetail(null)} style={{ background:'rgba(255,255,255,.07)', border:'none', color:'#94A3B8', width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:16, flexShrink:0 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
              {[{ l:'POAI 2026', v:fmtCOP(proyDetail.poai), c:'#00C8E0' },{ l:'Compromisos', v:fmtCOP(proyDetail.compromisos), c:'#10B981' },{ l:'Giros', v:fmtCOP(proyDetail.giros), c:'#F59E0B' }].map((k,i)=>(
                <div key={i} style={{ background:'rgba(26,39,68,.8)', borderRadius:8, padding:'10px 12px', borderTop:'2px solid '+k.c }}>
                  <div style={{ fontSize:9, color:'#64748B', textTransform:'uppercase' as const, letterSpacing:1 }}>{k.l}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:k.c, marginTop:4 }}>{k.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' as const }}>
              <div style={{ flex:1, minWidth:120 }}><div style={{ fontSize:10, color:'#64748B', marginBottom:4 }}>% Compromisos</div><PBar v={proyDetail.pctComp}/></div>
              <div style={{ flex:1, minWidth:120 }}><div style={{ fontSize:10, color:'#64748B', marginBottom:4 }}>% Giros</div><PBar v={proyDetail.pctGiros}/></div>
            </div>
            {proyDetail.indicadores.length > 0 && (
              <>
                <div style={{ fontSize:12, fontWeight:700, color:'#94A3B8', marginTop:14, marginBottom:8 }}>Indicadores de Producto ({proyDetail.indicadores.length})</div>
                {proyDetail.indicadores.map((ind,i)=>(
                  <div key={i} style={{ background:'rgba(26,39,68,.5)', border:'1px solid #1E3058', borderRadius:8, padding:'10px 12px', marginBottom:8 }}>
                    <div style={{ fontSize:11, color:'#CBD5E1', marginBottom:6, lineHeight:1.5 }}>{ind.descripcion}</div>
                    <div style={{ display:'flex', gap:16, fontSize:10, color:'#64748B' }}>
                      <span>Meta 2026: <strong style={{ color:'#00C8E0' }}>{ind.meta.toLocaleString('es-CO')}</strong></span>
                      <span>POAI: <strong style={{ color:'#F59E0B' }}>{fmtCOP(ind.poai)}</strong></span>
                    </div>
                    <div style={{ fontSize:9, color:'#475569', marginTop:4 }}>{ind.programa}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Planeacion;
