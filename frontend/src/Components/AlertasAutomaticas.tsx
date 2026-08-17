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

    // ============ MÓDULO 1: PRESUPUESTO CRP ============
    if (presupuestoData && Array.isArray(presupuestoData) && presupuestoData.length > 0) {
      const rubroMap = new Map<string, { total: number, ejecutado: number, cantidad: number }>();

      presupuestoData.forEach((fila: any) => {
        const rubro = fila.rubro || fila.Rubro || fila['Descripción del Rubro'] || 'Sin rubro';
        const valor = Number(fila['Valor Neto'] || fila['Autorizacion giro'] || 0);

        if (!rubroMap.has(rubro)) {
          rubroMap.set(rubro, { total: 0, ejecutado: valor, cantidad: 0 });
        }
        const entry = rubroMap.get(rubro)!;
        entry.total += valor;
        entry.cantidad += 1;
      });

      // Analizar rubros para alertas
      rubroMap.forEach((entry, rubro) => {
        // ALERTA: Alto volumen de transacciones (posible inconsistencia)
        if (entry.cantidad > 15) {
          lista.push({
            id: 'presup-vol-' + rubro,
            tipo: 'presupuesto',
            severidad: 'media',
            titulo: 'Alto volumen de transacciones en rubro',
            desc: `${rubro} - ${entry.cantidad} transacciones - Total: $${entry.total.toLocaleString('es-CO')}`,
            valor: entry.total,
            cantidad: entry.cantidad,
            fecha: hoy
          });
        }

        // ALERTA: Rubro con ejecución completa (100% = sospechoso)
        if (entry.ejecutado === entry.total && entry.total > 50000000) {
          lista.push({
            id: 'presup-100-' + rubro,
            tipo: 'presupuesto',
            severidad: 'alta',
            titulo: 'Rubro ejecutado al 100% en corto tiempo',
            desc: `${rubro} - Ejecución total: $${entry.total.toLocaleString('es-CO')}`,
            valor: entry.total,
            fecha: hoy
          });
        }
      });
    }

    // ============ MÓDULO 2: PAC - ANOMALÍAS ============
    if (pacData) {
      // Si pacData tiene array de anomalías detectadas
      const anomalias = pacData.anomalias || pacData.alertas || pacData.detalle || [];
      if (Array.isArray(anomalias)) {
        anomalias.slice(0, 20).forEach((anom: any, idx: number) => {
          lista.push({
            id: 'pac-anom-' + idx,
            tipo: 'secop',
            severidad: anom.severidad || 'media',
            titulo: anom.titulo || anom.concepto || 'Anomalia en PAC',
            desc: anom.descripcion || anom.rubro || 'Detectada en análisis PAC',
            valor: anom.monto || anom.valor || 0,
            fecha: anom.fecha || hoy
          });
        });
      }
    }

    // ============ MÓDULO 3: CONTRATACIÓN ============
    if (contratosData && Array.isArray(contratosData)) {
      contratosData.slice(0, 50).forEach((c: any, idx: number) => {
        const valor = Number(c.valor || c.Valor || c['Valor CRP'] || 0);
        const estaPublicado = c.secopPublicado || c.publicado || c.SECOP;

        // ALERTA: Contrato > $10M sin SECOP
        if (valor > 10000000 && !estaPublicado) {
          lista.push({
            id: 'secop-' + idx,
            tipo: 'secop',
            severidad: 'alta',
            titulo: 'Contrato sin publicacion SECOP II',
            desc: `${c.concepto || c.Concepto || c.Descripción || 'Contrato'} - $${valor.toLocaleString('es-CO')}`,
            valor: valor,
            fecha: hoy
          });
        }

        // ALERTA: Contrato con modalidad sospechosa
        const modalidad = c.modalidad || c.Modalidad || c['Modalidad de selección'] || '';
        if (modalidad.toUpperCase().includes('DIREC') && valor > 20000000) {
          lista.push({
            id: 'secop-directa-' + idx,
            tipo: 'secop',
            severidad: 'media',
            titulo: 'Contratacion directa por monto alto',
            desc: `${c.concepto || 'Contrato'} - Modalidad: ${modalidad} - $${valor.toLocaleString('es-CO')}`,
            valor: valor,
            fecha: hoy
          });
        }
      });
    }

    // ============ VENCIMIENTOS (Cálculo de plazos) ============
    const hoyDate = new Date();
    lista.push({
      id: 'venc-peticion',
      tipo: 'vencimientos',
      severidad: 'alta',
      titulo: 'Vencimiento: Respuesta a peticion de informacion',
      desc: 'Plazo legal: 10 dias habiles',
      fecha: new Date(hoyDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    // Si la lista está COMPLETAMENTE vacía, mostrar mensaje
    if (lista.length === 0) {
      return [{
        id: 'empty',
        tipo: 'todas',
        severidad: 'success',
        titulo: '✓ Sin alertas detectadas',
        desc: 'Carga datos de los módulos (Presupuesto, PAC, Contratación) para activar detección',
        fecha: hoy
      }];
    }

    return filtroTipo === 'todas' ? lista : lista.filter(a => a.tipo === filtroTipo);
  }, [pacData, contratosData, presupuestoData, filtroTipo]);

  const stats = {
    total: alertas.filter(a => a.id !== 'empty').length,
    altas: alertas.filter(a => a.severidad === 'alta' && a.id !== 'empty').length,
    pendientes: alertas.filter(a => a.tipo === 'vencimientos').length
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', padding: 0 }}>
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyDark} 100%)`, borderRadius: 16, padding: 24, marginBottom: 24, color: 'white' }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>⚠️ Alertas Automaticas</h2>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>100% conectadas a Módulos 1, 2, 3 - Monitoreo en tiempo real</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FFD700' }}>{stats.total}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Alertas</div>
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
          <div key={a.id} style={{ border: `2px solid ${a.severidad === 'alta' ? C.error : a.severidad === 'media' ? C.warning : '#10B98133'}`, borderRadius: 12, padding: 16, background: 'white' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 20 }}>
              <span>{a.tipo === 'secop' ? '📋' : a.tipo === 'presupuesto' ? '💰' : '⏰'}</span>
              {a.id !== 'empty' && <span style={{ fontSize: 11, fontWeight: 600, color: 'white', background: a.severidad === 'alta' ? C.error : a.severidad === 'media' ? C.warning : '#10B981', padding: '3px 8px', borderRadius: 4 }}>{a.severidad.toUpperCase()}</span>}
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
