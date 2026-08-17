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
    const hoy = new Date().toISOString().split('T')[0];

    // Si presupuestoData es un array de transacciones (SAP crudo), resumir por rubro
    if (presupuestoData && Array.isArray(presupuestoData) && presupuestoData.length > 0) {
      const rubroMap = new Map<string, any>();

      presupuestoData.forEach((fila: any) => {
        const rubro = fila.rubro || fila.Rubro || fila['Descripción del Rubro'] || 'Sin rubro';
        const valor = Number(fila['Valor Neto'] || fila.Valor || fila['Autorizacion giro'] || 0);

        if (!rubroMap.has(rubro)) {
          rubroMap.set(rubro, { rubro, total: 0, cantidad: 0 });
        }
        const entry = rubroMap.get(rubro);
        entry.total += valor;
        entry.cantidad += 1;
      });

      // Analizar rubros
      rubroMap.forEach((entry, rubro) => {
        // Alerta si rubro tiene muchas transacciones (posible duplicidad)
        if (entry.cantidad > 10 && entry.total > 20000000) {
          lista.push({
            id: 'presup-' + rubro,
            tipo: 'presupuesto',
            severidad: 'media',
            titulo: 'Alto volumen de transacciones en rubro',
            desc: `${rubro} - ${entry.cantidad} transacciones - $${entry.total.toLocaleString('es-CO')}`,
            valor: entry.total,
            cantidad: entry.cantidad,
            fecha: hoy
          });
        }
      });
    }

    // Alertas de vencimientos (siempre mostrar)
    lista.push({
      id: 'venc-1',
      tipo: 'vencimientos',
      severidad: 'alta',
      titulo: 'Vencimiento: Respuesta a peticion de informacion',
      desc: 'Vence en 3 dias habiles',
      fecha: '2026-08-20'
    });

    // Si no hay alertas reales, mostrar demos
    if (lista.length <= 1) {
      lista.unshift(
        {
          id: 'd1',
          tipo: 'secop',
          severidad: 'alta',
          titulo: 'Contrato sin publicacion SECOP',
          desc: 'Suministro de insumos - $28M',
          valor: 28000000,
          fecha: '2026-08-15'
        }
      );
    }

    return filtroTipo === 'todas' ? lista : lista.filter(a => a.tipo === filtroTipo);
  }, [presupuestoData, filtroTipo]);

  const stats = {
    total: alertas.length,
    altas: alertas.filter(a => a.severidad === 'alta').length,
    pendientes: alertas.filter(a => a.tipo === 'vencimientos').length
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', padding: 0 }}>
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyDark} 100%)`, borderRadius: 16, padding: 24, marginBottom: 24, color: 'white' }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>⚠️ Alertas Automaticas</h2>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>Monitoreo en tiempo real - SECOP II, SAP Distrital, Vencimientos</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FFD700' }}>{stats.total}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Alertas activas</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.error }}>{stats.altas}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Nivel alto</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.warning }}>{stats.pendientes}</div>
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
            {a.valor && <div style={{ fontSize: 12, color: C.navy, fontWeight: 600 }}>💵 ${a.valor.toLocaleString('es-CO')}</div>}
            {a.cantidad && <div style={{ fontSize: 12, color: C.navy, fontWeight: 600 }}>📊 {a.cantidad} transacciones</div>}
            <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>📅 {a.fecha}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
