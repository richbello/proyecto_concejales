import React, { useState, useMemo } from 'react';

interface AlertasProps {
  pacData?: any;
  contratosData?: any;
  presupuestoData?: any;
}

const C = {
  navy: '#1B3A6B',
  navyDark: '#12294d',
  cyan: '#00AEEF',
  cyanSoft: '#5dade2',
  warning: '#F59E0B',
  error: '#EF4444'
};

export default function AlertasAutomaticas({ pacData, contratosData, presupuestoData }: AlertasProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>('todas');

  const alertas = useMemo(() => {
    const lista: any[] = [];
    if (lista.length === 0) {
      lista.push(
        { id: 'd1', tipo: 'secop', severidad: 'alta', titulo: 'Contrato sin publicacion SECOP', desc: 'Suministro - $28M', fecha: '2026-08-15' },
        { id: 'd2', tipo: 'presupuesto', severidad: 'media', titulo: 'Ejecucion presupuestal baja', desc: 'Infraestructura - 22%', fecha: '2026-08-17' },
        { id: 'd3', tipo: 'vencimientos', severidad: 'alta', titulo: 'Vencimiento peticion informacion', desc: 'Vence en 3 dias', fecha: '2026-08-20' }
      );
    }
    return filtroTipo === 'todas' ? lista : lista.filter(a => a.tipo === filtroTipo);
  }, [filtroTipo]);

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', padding: 0 }}>
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyDark} 100%)`, borderRadius: 16, padding: 24, marginBottom: 24, color: 'white' }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Alertas Automaticas</h2>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>Deteccion automatica en SECOP II y SAP Distrital</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FFD700' }}>{alertas.length}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Alertas</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.error }}>{alertas.filter(a => a.severidad === 'alta').length}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Nivel alto</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.warning }}>3</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Vencimientos</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['todas', 'secop', 'presupuesto', 'vencimientos'].map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)} style={{ padding: '8px 16px', borderRadius: 20, border: `2px solid ${filtroTipo === t ? C.cyan : C.navy}`, background: filtroTipo === t ? `${C.cyan}20` : 'white', color: filtroTipo === t ? C.cyan : C.navy, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            {t === 'todas' ? 'Todas' : t === 'secop' ? 'Sin SECOP' : t === 'presupuesto' ? 'Presupuesto' : 'Vencimientos'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {alertas.map(a => (
          <div key={a.id} style={{ border: `2px solid ${a.severidad === 'alta' ? C.error : C.warning}33`, borderRadius: 12, padding: 16, background: 'white' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 20 }}>
              <span>{a.tipo === 'secop' ? '📋' : a.tipo === 'presupuesto' ? '💰' : '⏰'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'white', background: a.severidad === 'alta' ? C.error : C.warning, padding: '3px 8px', borderRadius: 4 }}>{a.severidad.toUpperCase()}</span>
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 700, color: C.navy }}>{a.titulo}</h4>
            <p style={{ margin: 0, fontSize: 13, color: '#666', marginBottom: 8 }}>{a.desc}</p>
            <div style={{ fontSize: 11, color: '#999' }}>📅 {a.fecha}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
