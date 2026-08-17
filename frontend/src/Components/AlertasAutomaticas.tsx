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
  error: '#EF4444',
  success: '#10B981',
  border: '#e2e8f0'
};

export default function AlertasAutomaticas({ pacData, contratosData, presupuestoData }: AlertasProps) {
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'secop' | 'presupuesto' | 'vencimientos'>('todas');

  // Generar alertas automáticamente
  const alertas = useMemo(() => {
    const lista: any[] = [];

    // Alertas de SECOP (contratos sin publicación)
    if (contratosData && Array.isArray(contratosData)) {
      contratosData.slice(0, 50).forEach((c: any) => {
        if (!c.secopPublicado && c.valor > 10000000) {
          lista.push({
            id: 'secop-' + c.id,
            tipo: 'secop',
            severidad: 'alta',
            titulo: 'Contrato sin publicacion SECOP',
            descripcion: c.concepto || c.descripcion || 'N/A',
            valor: c.valor,
            fecha: c.fecha || new Date().toISOString().split('T')[0],
            accion: 'Publicar en SECOP II inmediatamente'
          });
        }
      });
    }

    // Alertas de presupuesto (ejecución baja)
    if (presupuestoData && Array.isArray(presupuestoData)) {
      presupuestoData.forEach((p: any) => {
        const pctEjec = (p.ejecutado / p.autorizado) * 100;
        if (pctEjec < 30 && p.autorizado > 50000000) {
          lista.push({
            id: 'presup-' + p.rubro,
            tipo: 'presupuesto',
            severidad: 'media',
            titulo: 'Ejecucion presupuestal baja',
            descripcion: p.rubro || 'Rubro sin nombre',
            valor: p.autorizado,
            pctEjec: Math.round(pctEjec),
            fecha: new Date().toISOString().split('T')[0],
            accion: 'Revisar causas de baja ejecucion'
          });
        }
      });
    }

    // Alertas de vencimientos (demo)
    lista.push({
      id: 'venc-1',
      tipo: 'vencimientos',
      severidad: 'alta',
      titulo: 'Vencimiento: Respuesta a peticion de informacion',
      descripcion: 'Vence en 3 dias habiles',
      fecha: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      accion: 'Seguimiento a alcaldia'
    });

    // Si no hay datos, agregar demos
    if (lista.length === 0) {
      lista.push(
        {
          id: 'demo-1',
          tipo: 'secop',
          severidad: 'alta',
          titulo: 'Contrato sin publicacion SECOP',
          descripcion: 'Suministro de insumos oficina local - Valor: $28M',
          valor: 28000000,
          fecha: '2026-08-15',
          accion: 'Publicar en SECOP II'
        },
        {
          id: 'demo-2',
          tipo: 'presupuesto',
          severidad: 'media',
          titulo: 'Ejecucion presupuestal baja',
          descripcion: 'Rubro: Inversión en infraestructura',
          valor: 150000000,
          pctEjec: 22,
          fecha: '2026-08-17',
          accion: 'Revisar causas de baja ejecucion'
        },
        {
          id: 'demo-3',
          tipo: 'vencimientos',
          severidad: 'alta',
          titulo: 'Vencimiento: Respuesta a peticion de informacion',
          descripcion: 'Vence en 3 dias habiles',
          fecha: '2026-08-20',
          accion: 'Seguimiento a alcaldia'
        }
      );
    }

    return lista.filter(a => filtroTipo === 'todas' || a.tipo === filtroTipo);
  }, [pacData, contratosData, presupuestoData, filtroTipo]);

  const colorSeveridad = (sev: string) => sev === 'alta' ? C.error : sev === 'media' ? C.warning : C.success;
  const iconoSeveridad = (sev: string) => sev === 'alta' ? '🔴' : sev === 'media' ? '🟡' : '🟢';
  const iconoTipo = (tipo: string) => tipo === 'secop' ? '📋' : tipo === 'presupuesto' ? '💰' : '⏰';

  const stats = {
    total: alertas.length,
    altas: alertas.filter(a => a.severidad === 'alta').length,
    pendientes: alertas.filter(a => a.tipo === 'vencimientos').length
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: C.navy }}>
      {/* Header Premium */}
      <div style={{
        background: `linear-gradient(135deg,${C.navy} 0%,${C.navyDark} 100%)`,
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 10px 30px rgba(27,58,107,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 32 }}>⚠️</span>
          <h2 style={{ margin: 0, color: 'white', fontSize: 24, fontWeight: 700 }}>Alertas Automáticas</h2>
        </div>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>Detección automática de irregularidades presupuestales y contractuales en SECOP II y SAP Distrital</p>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#FFD700' }}>{stats.total}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Alertas activas</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.error }}>{stats.altas}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Nivel alto</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.warning }}>{stats.pendientes}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Vencimientos</div>
          </div>
        </div>
      </div>

      {/* Filtros tipo chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { val: 'todas', label: 'Todas' },
          { val: 'secop', label: 'Sin SECOP' },
          { val: 'presupuesto', label: 'Presupuesto' },
          { val: 'vencimientos', label: 'Vencimientos' }
        ].map(chip => (
          <button
            key={chip.val}
            onClick={() => setFiltroTipo(chip.val as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: `1.5px solid ${filtroTipo === chip.val ? C.cyan : C.border}`,
              background: filtroTipo === chip.val ? `${C.cyan}20` : 'white',
              color: filtroTipo === chip.val ? C.cyan : C.navy,
              fontWeight: filtroTipo === chip.val ? 600 : 500,
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.2s'
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Lista de Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {alertas.map(alerta => (
          <div
            key={alerta.id}
            style={{
              background: `linear-gradient(135deg,rgba(27,58,107,0.05) 0%,rgba(18,41,77,0.02) 100%)`,
              border: `2px solid ${colorSeveridad(alerta.severidad)}33`,
              borderRadius: 12,
              padding: 16,
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {/* Badge severidad */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{iconoTipo(alerta.tipo)}</span>
              <span style={{ fontSize: 18 }}>{iconoSeveridad(alerta.severidad)}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'white', background: colorSeveridad(alerta.severidad), padding: '3px 8px', borderRadius: 4 }}>
                {alerta.severidad.toUpperCase()}
              </span>
            </div>

            {/* Contenido */}
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 700, color: C.navy }}>{alerta.titulo}</h4>
            <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#666' }}>{alerta.descripcion}</p>

            {alerta.valor && (
              <div style={{ fontSize: 12, color: C.navy, fontWeight: 600, marginBottom: 8 }}>
                Valor: ${alerta.valor.toLocaleString('es-CO')}
              </div>
            )}

            {alerta.pctEjec !== undefined && (
              <div style={{ fontSize: 12, color: C.navy, fontWeight: 600, marginBottom: 8 }}>
                Ejecución: {alerta.pctEjec}%
              </div>
            )}

            {/* Acción */}
            <div style={{ background: C.cyanSoft + '20', borderRadius: 6, padding: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.navy, fontWeight: 600 }}>Acción recomendada:</div>
              <div style={{ fontSize: 12, color: C.navy }}>{alerta.accion}</div>
            </div>

            {/* Fecha */}
            <div style={{ fontSize: 11, color: '#999' }}>📅 {alerta.fecha}</div>
          </div>
        ))}
      </div>

      {alertas.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          <p style={{ fontSize: 16, fontWeight: 600 }}>✓ Sin alertas críticas</p>
          <p style={{ fontSize: 13 }}>Carga datos del módulo PAC o Contratación para activar detección automática</p>
        </div>
      )}
    </div>
  );
}
