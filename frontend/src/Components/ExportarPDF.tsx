import React, { useCallback } from 'react';
import { Download } from 'lucide-react';

interface DataRow { [key: string]: string | number; }

interface Anomalia {
  id: string;
  categoria: string;
  titulo: string;
  descripcion: string;
  evidencia: string[];
  impacto: string;
  recomendacion: string;
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  icono: string;
}

interface Props {
  fileName: string;
  totalRegistros: number;
  kpis: {
    valorCRP: number;
    valorNeto: number;
    giro: number;
    sinGiro: number;
    anulaciones: number;
    pctEjec: number;
  };
  anomalias: Anomalia[];
  municipio?: string;
  concejal?: string;
}

const fmtCOP = (v: number) => {
  if (v >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v/1e3).toFixed(0) + 'K';
  return '$' + v.toLocaleString('es-CO');
};

const fmtFull = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const sevColor = { critica: '#dc2626', alta: '#ea580c', media: '#d97706', baja: '#16a34a' };
const sevLabel = { critica: 'CRÍTICA', alta: 'ALTA', media: 'MEDIA', baja: 'BAJA' };

export default function ExportarPDF({ fileName, totalRegistros, kpis, anomalias, municipio = 'Usme', concejal = '' }: Props) {

  const generarPDF = useCallback(() => {
    const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const fechaCorta = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');

    const criticas = anomalias.filter(a => a.severidad === 'critica');
    const altas    = anomalias.filter(a => a.severidad === 'alta');
    const medias   = anomalias.filter(a => a.severidad === 'media');

    const ejecColor = kpis.pctEjec >= 70 ? '#16a34a' : kpis.pctEjec >= 40 ? '#d97706' : '#dc2626';
    const ejecEstado = kpis.pctEjec >= 70 ? 'EN META' : kpis.pctEjec >= 40 ? 'EN RIESGO' : 'CRÍTICA';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Informe Control Político — ${municipio}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Inter', 'Segoe UI', sans-serif; color: #1e293b; background: white; font-size: 13px; }

  .page { max-width: 900px; margin: 0 auto; padding: 40px; }

  /* HEADER */
  .header { background: linear-gradient(135deg, #1a2742 0%, #2563eb 100%); color: white; padding: 32px 40px; border-radius: 12px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
  .header-left p { font-size: 13px; opacity: 0.8; margin-bottom: 2px; }
  .header-right { text-align: right; }
  .header-right .fecha { font-size: 12px; opacity: 0.7; margin-bottom: 4px; }
  .header-right .municipio { font-size: 18px; font-weight: 700; }
  .escudo { font-size: 48px; margin-bottom: 8px; }

  /* ALERT BANNER */
  .alert-banner { border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
  .alert-banner.critica { background: #fef2f2; border: 2px solid #fecaca; }
  .alert-banner.normal { background: #f0fdf4; border: 2px solid #bbf7d0; }
  .alert-icon { font-size: 28px; }
  .alert-text h3 { font-size: 15px; font-weight: 700; }
  .alert-text p { font-size: 12px; margin-top: 2px; opacity: 0.8; }

  /* KPIs */
  .section-title { font-size: 15px; font-weight: 700; color: #1a2742; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
  .kpis-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi-card { background: white; border-radius: 10px; padding: 14px; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
  .kpi-label { font-size: 10px; color: #64748b; margin-bottom: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-value { font-size: 18px; font-weight: 800; }
  .kpi-bar { background: #f1f5f9; border-radius: 3px; height: 4px; margin-top: 8px; }
  .kpi-bar-fill { height: 4px; border-radius: 3px; }

  /* EJECUCIÓN */
  .ejec-card { background: white; border-radius: 10px; padding: 16px 20px; box-shadow: 0 1px 6px rgba(0,0,0,0.08); margin-bottom: 28px; }
  .ejec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .ejec-titulo { font-size: 13px; font-weight: 700; color: #1e293b; }
  .ejec-pct { font-size: 28px; font-weight: 900; }
  .ejec-track { background: #f1f5f9; border-radius: 6px; height: 16px; margin-bottom: 8px; }
  .ejec-fill { height: 16px; border-radius: 6px; }
  .ejec-footer { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
  .ejec-badge { font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 20px; }

  /* ANOMALÍAS */
  .anomalia-card { border-radius: 10px; padding: 16px; margin-bottom: 14px; page-break-inside: avoid; }
  .anomalia-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
  .anomalia-icon { font-size: 22px; flex-shrink: 0; }
  .anomalia-titulo { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
  .anomalia-badge { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 20px; color: white; display: inline-block; margin-right: 6px; }
  .anomalia-cat { font-size: 10px; color: #64748b; background: rgba(0,0,0,0.06); padding: 2px 8px; border-radius: 20px; display: inline-block; }
  .anomalia-desc { font-size: 12px; color: #374151; line-height: 1.6; margin-bottom: 12px; }
  .evidencia-box { background: rgba(0,0,0,0.04); border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; font-family: monospace; font-size: 11px; color: #374151; }
  .evidencia-box div { margin-bottom: 3px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .info-box { border-radius: 6px; padding: 10px; }
  .info-box-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .info-box-text { font-size: 11px; line-height: 1.5; }

  /* RESUMEN FINAL */
  .resumen-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 28px; }
  .resumen-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .resumen-item { text-align: center; }
  .resumen-num { font-size: 32px; font-weight: 900; }
  .resumen-lbl { font-size: 11px; color: #64748b; margin-top: 2px; }

  /* FIRMA */
  .firma { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; }
  .firma-block { text-align: center; }
  .firma-linea { width: 200px; border-top: 1px solid #94a3b8; margin-bottom: 6px; }
  .firma-nombre { font-size: 12px; font-weight: 700; }
  .firma-cargo { font-size: 11px; color: #64748b; }

  /* FOOTER */
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="escudo">🏛️</div>
      <h1>Informe de Control Político</h1>
      <p>Análisis Presupuestal y Detección de Anomalías</p>
      <p>Fuente: ${fileName} · ${totalRegistros.toLocaleString('es-CO')} registros analizados</p>
    </div>
    <div class="header-right">
      <div class="fecha">${fecha}</div>
      <div class="municipio">Localidad de ${municipio}</div>
      ${concejal ? `<div style="font-size:13px;opacity:0.8;margin-top:4px">${concejal}</div>` : ''}
      <div style="margin-top:12px;font-size:11px;opacity:0.6">Control Político · XBOG Technologies</div>
    </div>
  </div>

  <!-- ALERT BANNER -->
  ${anomalias.length > 0 ? `
  <div class="alert-banner critica">
    <div class="alert-icon">⚠️</div>
    <div class="alert-text">
      <h3 style="color:#991b1b">Se detectaron ${anomalias.length} anomalías que requieren atención inmediata</h3>
      <p style="color:#b91c1c">${criticas.length} críticas · ${altas.length} altas · ${medias.length} medias — Revisar para debates de control político</p>
    </div>
  </div>` : `
  <div class="alert-banner normal">
    <div class="alert-icon">✅</div>
    <div class="alert-text">
      <h3 style="color:#166534">No se detectaron anomalías significativas</h3>
      <p style="color:#15803d">El reporte analizado cumple con los parámetros de control establecidos</p>
    </div>
  </div>`}

  <!-- KPIs -->
  <div class="section-title">💰 Resumen Presupuestal</div>
  <div class="kpis-grid">
    ${[
      { label: 'Valor CRP Total',    val: kpis.valorCRP,    color: '#2563eb', pct: 100 },
      { label: 'Valor Neto',         val: kpis.valorNeto,   color: '#16a34a', pct: kpis.valorCRP > 0 ? (kpis.valorNeto/kpis.valorCRP)*100 : 0 },
      { label: 'Autorización Giro',  val: kpis.giro,        color: '#0891b2', pct: kpis.valorCRP > 0 ? (kpis.giro/kpis.valorCRP)*100 : 0 },
      { label: 'Sin Autorizar',      val: kpis.sinGiro,     color: '#dc2626', pct: kpis.valorCRP > 0 ? (kpis.sinGiro/kpis.valorCRP)*100 : 0 },
      { label: 'Anulaciones',        val: kpis.anulaciones, color: '#ea580c', pct: kpis.valorCRP > 0 ? (kpis.anulaciones/kpis.valorCRP)*100 : 0 },
    ].map(k => `
    <div class="kpi-card" style="border-top:3px solid ${k.color}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value" style="color:${k.color}">${fmtCOP(k.val)}</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="background:${k.color};width:${Math.min(k.pct,100)}%"></div></div>
    </div>`).join('')}
  </div>

  <!-- EJECUCIÓN -->
  <div class="ejec-card">
    <div class="ejec-header">
      <div>
        <div class="ejec-titulo">Nivel de Ejecución Presupuestal — Giro / CRP Total</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">Porcentaje de recursos efectivamente girados sobre el total comprometido</div>
      </div>
      <div style="text-align:right">
        <div class="ejec-pct" style="color:${ejecColor}">${kpis.pctEjec.toFixed(1)}%</div>
        <div class="ejec-badge" style="background:${ejecColor};color:white">${ejecEstado}</div>
      </div>
    </div>
    <div class="ejec-track">
      <div class="ejec-fill" style="background:${ejecColor};width:${Math.min(kpis.pctEjec,100)}%"></div>
    </div>
    <div class="ejec-footer">
      <span>Girado: ${fmtFull(kpis.giro)}</span>
      <span>CRP Total: ${fmtFull(kpis.valorCRP)}</span>
    </div>
  </div>

  <!-- RESUMEN ANOMALÍAS -->
  ${anomalias.length > 0 ? `
  <div class="section-title">🚨 Resumen de Anomalías Detectadas</div>
  <div class="resumen-card">
    <div class="resumen-grid">
      <div class="resumen-item">
        <div class="resumen-num" style="color:#dc2626">${criticas.length}</div>
        <div class="resumen-lbl">Anomalías Críticas</div>
      </div>
      <div class="resumen-item">
        <div class="resumen-num" style="color:#ea580c">${altas.length}</div>
        <div class="resumen-lbl">Anomalías Altas</div>
      </div>
      <div class="resumen-item">
        <div class="resumen-num" style="color:#d97706">${medias.length}</div>
        <div class="resumen-lbl">Anomalías Medias</div>
      </div>
    </div>
  </div>

  <!-- DETALLE ANOMALÍAS -->
  <div class="section-title">📋 Detalle de Anomalías</div>
  ${anomalias.map(a => {
    const col = sevColor[a.severidad];
    const lbl = sevLabel[a.severidad];
    return `
  <div class="anomalia-card" style="background:${col}11;border:1.5px solid ${col}33">
    <div class="anomalia-header">
      <div class="anomalia-icon">${a.icono}</div>
      <div style="flex:1">
        <div class="anomalia-titulo">${a.titulo}</div>
        <div>
          <span class="anomalia-badge" style="background:${col}">${lbl}</span>
          <span class="anomalia-cat">${a.categoria}</span>
        </div>
      </div>
    </div>
    <div class="anomalia-desc">${a.descripcion}</div>
    <div class="evidencia-box">
      <div style="font-weight:700;margin-bottom:6px;font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#475569">Evidencia:</div>
      ${a.evidencia.map(e => `<div>${e}</div>`).join('')}
    </div>
    <div class="info-grid">
      <div class="info-box" style="background:#fff7ed;border:1px solid #fed7aa">
        <div class="info-box-label" style="color:#ea580c">💥 Impacto</div>
        <div class="info-box-text" style="color:#9a3412">${a.impacto}</div>
      </div>
      <div class="info-box" style="background:#eff6ff;border:1px solid #bfdbfe">
        <div class="info-box-label" style="color:#1d4ed8">✅ Recomendación</div>
        <div class="info-box-text" style="color:#1e3a8a">${a.recomendacion}</div>
      </div>
    </div>
  </div>`;
  }).join('')}` : ''}

  <!-- FIRMA -->
  <div class="firma">
    <div class="firma-block">
      <div class="firma-linea"></div>
      <div class="firma-nombre">${concejal || 'Concejal Municipal'}</div>
      <div class="firma-cargo">Concejo de ${municipio}</div>
    </div>
    <div class="firma-block" style="text-align:center">
      <div style="font-size:11px;color:#94a3b8">Generado por</div>
      <div style="font-size:13px;font-weight:700;color:#1a2742">Control Político</div>
      <div style="font-size:10px;color:#94a3b8">XBOG Technologies · ${fecha}</div>
    </div>
    <div class="firma-block" style="text-align:right">
      <div class="firma-linea" style="margin-left:auto"></div>
      <div class="firma-nombre">Revisor</div>
      <div class="firma-cargo">Veeduría Ciudadana</div>
    </div>
  </div>

  <div class="footer">
    Informe generado automáticamente por el Sistema de Control Político · XBOG Technologies · richbello.github.io/proyecto_concejales
    <br/>Este documento es de carácter informativo y no constituye un acto administrativo.
  </div>

</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `Control-Politico-${municipio}-${fechaCorta}.html`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [fileName, totalRegistros, kpis, anomalias, municipio, concejal]);

  return (
    <button onClick={generarPDF}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-md">
      <Download className="w-4 h-4" />
      Exportar Informe PDF
    </button>
  );
}