import React, { useState, useMemo } from 'react';

interface AlertasProps {
  pacData?: any;
  contratosData?: any;
  presupuestoData?: any;
}

const C = {
  rojo: '#1B3A6B',
  rojoOsc: '#1e3a6e',
  dorado: '#5dade2',
  doradoOsc: '#3498db',
  warning: '#E8871E',
  error: '#C0392B',
  gris: '#666'
};

const fmtCOP = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export default function AlertasAutomaticas({ pacData, contratosData, presupuestoData }: AlertasProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>('todas');

  const alertas = useMemo(() => {
    const lista: any[] = [];
    const hoy = new Date().toISOString().split('T')[0];

    // ========= MODULO 1: PRESUPUESTO CRP (transacciones SAP) =========
    if (presupuestoData && Array.isArray(presupuestoData) && presupuestoData.length > 0) {
      const rubroMap = new Map<string, { total: number, cantidad: number }>();
      presupuestoData.forEach((fila: any) => {
        const rubro = fila['Descripción del Rubro'] || fila.rubro || fila.Rubro || 'Sin rubro';
        const valor = Number(fila['Valor Neto'] || fila['Autorizacion giro'] || fila.valor || 0);
        if (!rubroMap.has(rubro)) rubroMap.set(rubro, { total: 0, cantidad: 0 });
        const e = rubroMap.get(rubro)!;
        e.total += valor;
        e.cantidad += 1;
      });
      rubroMap.forEach((e, rubro) => {
        if (e.cantidad > 15 && e.total > 20000000) {
          lista.push({
            id: 'p1-vol-' + rubro.slice(0, 20),
            tipo: 'presupuesto',
            severidad: 'media',
            titulo: 'Alto volumen de transacciones',
            desc: `${rubro} — ${e.cantidad} movimientos por ${fmtCOP(e.total)}. Revisar posible fraccionamiento.`,
            valor: e.total,
            fecha: hoy
          });
        }
      });
    }

    // ========= MODULO 2: PAC (consolidado, rezago) =========
    if (pacData && pacData.consolidado) {
      const con = pacData.consolidado;
      const pctEjec = con.pacActual > 0 ? (con.girado / con.pacActual) : 0;

      if (pctEjec < 0.60) {
        lista.push({
          id: 'p2-ejec',
          tipo: 'presupuesto',
          severidad: 'alta',
          titulo: 'Ejecucion PAC por debajo del 60%',
          desc: `Solo se ha girado el ${(pctEjec * 100).toFixed(1)}% del PAC (${fmtCOP(con.girado)} de ${fmtCOP(con.pacActual)}). Rezago que puede causar perdida de recursos al cierre.`,
          valor: con.pacActual,
          fecha: hoy
        });
      }

      // Variacion del PAC (reduccion sospechosa)
      if (con.pacInicial > 0 && con.pacActual < con.pacInicial) {
        const reduccion = con.pacInicial - con.pacActual;
        const pct = (reduccion / con.pacInicial) * 100;
        if (pct > 5) {
          lista.push({
            id: 'p2-reduc',
            tipo: 'presupuesto',
            severidad: 'alta',
            titulo: 'Reduccion neta del PAC',
            desc: `El PAC se redujo ${fmtCOP(reduccion)} (${pct.toFixed(1)}%) respecto al inicial. Posible recorte de proyectos — preguntar que rubros fueron afectados.`,
            valor: reduccion,
            fecha: hoy
          });
        }
      }

      // Rezago de vigencias anteriores
      if (pacData.rezago && pacData.rezago.pacActual > 0) {
        lista.push({
          id: 'p2-rezago',
          tipo: 'presupuesto',
          severidad: 'media',
          titulo: 'Rezago de vigencias anteriores',
          desc: `Compromisos sin girar por ${fmtCOP(pacData.rezago.pacActual)}. Ponen en riesgo la ejecucion del año actual.`,
          valor: pacData.rezago.pacActual,
          fecha: hoy
        });
      }
    }

    // ========= MODULO 3: CONTRATACION (sobrecostos) =========
    if (contratosData && contratosData.contratos && Array.isArray(contratosData.contratos)) {
      contratosData.contratos.forEach((c: any, idx: number) => {
        // Sobrecosto: valorFinal muy por encima del inicial
        if (c.pctVariacion > 20 && c.valorFinal > 10000000) {
          lista.push({
            id: 'p3-sobre-' + idx,
            tipo: 'contratacion',
            severidad: 'alta',
            titulo: 'Contrato con sobrecosto',
            desc: `${c.contrato || 'Contrato'} (${c.contratista || 'N/D'}) subio ${c.pctVariacion.toFixed(1)}%: de ${fmtCOP(c.valorInicial)} a ${fmtCOP(c.valorFinal)}.`,
            valor: c.valorFinal,
            fecha: hoy
          });
        }
      });

      // Resumen global de sobrecostos
      if (contratosData.contratosSobrecosto > 0) {
        lista.push({
          id: 'p3-resumen',
          tipo: 'contratacion',
          severidad: 'media',
          titulo: 'Contratos con adiciones',
          desc: `${contratosData.contratosSobrecosto} contratos presentan sobrecostos. Variacion global: ${(contratosData.pctVariacionGlobal || 0).toFixed(1)}%.`,
          valor: contratosData.valorFinalTotal || 0,
          fecha: hoy
        });
      }
    }

    // ========= VENCIMIENTOS (plazos legales) =========
    const v = new Date();
    lista.push({
      id: 'venc-peticion',
      tipo: 'vencimientos',
      severidad: 'alta',
      titulo: 'Vencimiento: peticion de informacion',
      desc: 'Plazo legal de respuesta: 10 dias habiles (Ley 1755 de 2015). Hacer seguimiento a la Alcaldia.',
      fecha: new Date(v.getTime() + 3 * 864e5).toISOString().split('T')[0]
    });

    const filtrada = filtroTipo === 'todas' ? lista : lista.filter(a => a.tipo === filtroTipo);
    return filtrada;
  }, [pacData, contratosData, presupuestoData, filtroTipo]);

  const hayDatos = !!(pacData || contratosData || (presupuestoData && presupuestoData.length));

  const stats = {
    total: alertas.length,
    altas: alertas.filter(a => a.severidad === 'alta').length,
    pendientes: alertas.filter(a => a.tipo === 'vencimientos').length
  };

  const sevColor = (s: string) => s === 'alta' ? C.error : C.warning;
  const tipoIcon = (t: string) => t === 'contratacion' ? '📋' : t === 'presupuesto' ? '💰' : t === 'vencimientos' ? '⏰' : '📊';

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ background: `linear-gradient(135deg, ${C.rojo} 0%, ${C.rojoOsc} 100%)`, borderRadius: 16, padding: 24, marginBottom: 24, color: 'white', boxShadow: '0 8px 24px rgba(160,27,27,0.25)' }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, marginBottom: 8, color: C.dorado }}>⚠️ Alertas Automaticas</h2>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.92 }}>Conectadas a Presupuesto, PAC y Contratacion — se actualizan al cargar los Excel</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          {[
            { n: stats.total, l: 'Alertas activas', c: C.dorado },
            { n: stats.altas, l: 'Nivel alto', c: '#FF6B6B' },
            { n: stats.pendientes, l: 'Vencimientos', c: '#FFD97D' }
          ].map((k, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: k.c }}>{k.n}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>

      {!hayDatos && (
        <div style={{ background: '#FFF8E7', border: `2px solid ${C.dorado}`, borderRadius: 12, padding: 16, marginBottom: 20, color: C.rojoOsc, fontSize: 14 }}>
          💡 Carga los Excel en los modulos <strong>Presupuesto</strong>, <strong>PAC</strong> y <strong>Contratacion</strong> para activar las alertas reales. Por ahora solo se muestran los vencimientos legales.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { v: 'todas', l: 'Todas' },
          { v: 'presupuesto', l: 'Presupuesto/PAC' },
          { v: 'contratacion', l: 'Contratacion' },
          { v: 'vencimientos', l: 'Vencimientos' }
        ].map(t => (
          <button key={t.v} onClick={() => setFiltroTipo(t.v)} style={{ padding: '8px 16px', borderRadius: 20, border: `2px solid ${filtroTipo === t.v ? C.rojo : '#ddd'}`, background: filtroTipo === t.v ? C.rojo : 'white', color: filtroTipo === t.v ? 'white' : C.rojo, fontWeight: 600, cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {alertas.map(a => (
          <div key={a.id} style={{ border: `1px solid #eee`, borderLeft: `5px solid ${sevColor(a.severidad)}`, borderRadius: 10, padding: 16, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>{tipoIcon(a.tipo)}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: sevColor(a.severidad), padding: '3px 10px', borderRadius: 12, letterSpacing: '0.5px' }}>{a.severidad.toUpperCase()}</span>
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: C.rojoOsc }}>{a.titulo}</h4>
            <p style={{ margin: 0, fontSize: 13, color: C.gris, lineHeight: 1.5, marginBottom: 10 }}>{a.desc}</p>
            {a.valor > 0 && <div style={{ fontSize: 13, color: C.rojo, fontWeight: 700 }}>{fmtCOP(a.valor)}</div>}
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>📅 {a.fecha}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
