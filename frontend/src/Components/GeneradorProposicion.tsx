import React, { useState } from 'react';
import { generarProposicionWord } from './generarProposicionWord';

interface DatosProposicion {
  presupuestoData?: any;
  contratacionData?: any;
  anomaliasData?: any;
  localidad?: string;
  edil?: string;
}

export default function GeneradorProposicion(props: DatosProposicion) {
  const localidad = props.localidad || 'FDL Usme';
  const edil = props.edil || 'Edil';

  const [tipoProposicion, setTipoProposicion] = useState('control-presupuestal');
  const [anomaliaSeleccionada, setAnomaliaSeleccionada] = useState<any>(null);
  const [generando, setGenerando] = useState(false);
  const [exito, setExito] = useState(false);

  // Campos manuales para crear anomalia sin depender de datos externos
  const [manualTitulo, setManualTitulo] = useState('');
  const [manualMonto, setManualMonto] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  const tiposProposicion = [
    { id: 'control-presupuestal', nombre: 'Control Presupuestal', desc: 'Cuestionar ejecucion presupuestal irregular' },
    { id: 'pedir-informacion', nombre: 'Peticion de Informacion', desc: 'Solicitar detalles de contrato/pago' },
    { id: 'mocion-orden-dia', nombre: 'Mocion de Orden del Dia', desc: 'Llevar tema urgente a discusion' },
    { id: 'acuerdo-investigacion', nombre: 'Acuerdo para Investigacion', desc: 'Activar comision de investigacion' },
  ];

  // Extraer anomalias de forma segura sin importar el formato
  let anomaliasDetectadas: any[] = [];
  try {
    const raw = props.anomaliasData;
    let lista: any[] = [];
    if (Array.isArray(raw)) {
      lista = raw;
    } else if (raw && Array.isArray(raw.anomalias)) {
      lista = raw.anomalias;
    } else if (raw && Array.isArray(raw.alertas)) {
      lista = raw.alertas;
    } else if (raw && Array.isArray(raw.detalle)) {
      lista = raw.detalle;
    }
    anomaliasDetectadas = lista.slice(0, 10).map((a: any) => ({
      id: a.id || Math.random(),
      titulo: a.titulo || a.concepto || a.rubro || a.descripcion || 'Anomalia detectada',
      monto: Number(a.monto || a.valor || a.valorCRP || 0),
      fecha: a.fecha || new Date().toISOString().split('T')[0],
      descripcion: a.descripcion || 'Deteccion automatica de irregularidad'
    }));
  } catch (e) {
    anomaliasDetectadas = [];
  }

  const crearAnomaliaManual = () => {
    if (!manualTitulo) {
      alert('Escribe al menos el titulo de la anomalia');
      return;
    }
    setAnomaliaSeleccionada({
      id: 'manual',
      titulo: manualTitulo,
      monto: Number(manualMonto.replace(/[^\d]/g, '')) || 0,
      fecha: new Date().toISOString().split('T')[0],
      descripcion: manualDesc || 'Irregularidad identificada por el Edil'
    });
  };

  const handleGenerar = async () => {
    if (!anomaliaSeleccionada) {
      alert('Selecciona o crea una anomalia primero');
      return;
    }
    setGenerando(true);
    try {
      await generarProposicionWord({
        tipoProposicion,
        anomalia: anomaliaSeleccionada,
        localidad,
        edil,
        fecha: new Date().toISOString().split('T')[0]
      });
      setExito(true);
      setTimeout(() => setExito(false), 3000);
    } catch (error) {
      alert('Error al generar: ' + String(error));
    } finally {
      setGenerando(false);
    }
  };

  const card = { background: 'rgba(139,0,0,0.3)', borderRadius: 8, padding: 16 };
  const gold = { color: '#FFD700' };

  return (
    <div style={{ background: 'linear-gradient(to bottom right, #B91C1C, #991B1B)', borderRadius: 12, padding: 24, color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>📝</span>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>Generador de Proposiciones</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', margin: '4px 0 0 0' }}>Crea proposiciones con datos SECOP II/SAP</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={card}>
          <h3 style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12, ...gold }}>1. Tipo de Proposicion</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tiposProposicion.map(tipo => (
              <label key={tipo.id} style={{ display: 'flex', alignItems: 'flex-start', padding: 8, borderRadius: 6, cursor: 'pointer', background: tipoProposicion === tipo.id ? '#FFD700' : 'rgba(0,0,0,0.2)', color: tipoProposicion === tipo.id ? '#B91C1C' : 'white' }}>
                <input type="radio" name="tipo" value={tipo.id} checked={tipoProposicion === tipo.id} onChange={(e) => setTipoProposicion(e.target.value)} style={{ marginRight: 8, marginTop: 3 }} />
                <div>
                  <p style={{ fontWeight: 'bold', margin: 0 }}>{tipo.nombre}</p>
                  <p style={{ fontSize: 12, margin: '2px 0 0 0', opacity: 0.9 }}>{tipo.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={card}>
          <h3 style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12, ...gold }}>2. Anomalia / Asunto</h3>

          {anomaliasDetectadas.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Detectadas automaticamente:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
                {anomaliasDetectadas.map(anom => (
                  <button key={anom.id} onClick={() => setAnomaliaSeleccionada(anom)} style={{ textAlign: 'left', padding: 10, borderRadius: 6, border: 'none', cursor: 'pointer', background: anomaliaSeleccionada?.id === anom.id ? '#FFD700' : 'rgba(0,0,0,0.2)', color: anomaliaSeleccionada?.id === anom.id ? '#B91C1C' : 'white' }}>
                    <p style={{ fontWeight: 'bold', fontSize: 13, margin: 0 }}>{anom.titulo}</p>
                    <p style={{ fontSize: 11, margin: '3px 0 0 0', opacity: 0.9 }}>${anom.monto.toLocaleString('es-CO')} - {anom.fecha}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: anomaliasDetectadas.length > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none', paddingTop: anomaliasDetectadas.length > 0 ? 12 : 0 }}>
            <p style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>O escribe una manualmente:</p>
            <input placeholder="Titulo del asunto" value={manualTitulo} onChange={e => setManualTitulo(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: 'none', marginBottom: 8, boxSizing: 'border-box', color: '#333' }} />
            <input placeholder="Monto (ej: 50000000)" value={manualMonto} onChange={e => setManualMonto(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: 'none', marginBottom: 8, boxSizing: 'border-box', color: '#333' }} />
            <textarea placeholder="Descripcion (opcional)" value={manualDesc} onChange={e => setManualDesc(e.target.value)} rows={2} style={{ width: '100%', padding: 8, borderRadius: 6, border: 'none', marginBottom: 8, boxSizing: 'border-box', resize: 'vertical', color: '#333' }} />
            <button onClick={crearAnomaliaManual} style={{ width: '100%', padding: 10, borderRadius: 6, border: '2px solid #FFD700', background: 'transparent', color: '#FFD700', fontWeight: 'bold', cursor: 'pointer' }}>Usar este asunto</button>
          </div>
        </div>
      </div>

      {anomaliaSeleccionada && (
        <div style={{ ...card, marginBottom: 24 }}>
          <h4 style={{ fontWeight: 'bold', ...gold, marginBottom: 8 }}>Vista previa</h4>
          <p style={{ fontSize: 14, margin: 0, lineHeight: 1.7 }}>
            <strong>Tipo:</strong> {tiposProposicion.find(t => t.id === tipoProposicion)?.nombre}<br />
            <strong>Asunto:</strong> {anomaliaSeleccionada.titulo}<br />
            <strong>Monto:</strong> ${Number(anomaliaSeleccionada.monto).toLocaleString('es-CO')}<br />
            <strong>Citas legales:</strong> SECOP II y SAP Distrital
          </p>
        </div>
      )}

      <button onClick={handleGenerar} disabled={!anomaliaSeleccionada || generando} style={{ width: '100%', padding: 16, fontSize: 16, fontWeight: 'bold', borderRadius: 8, border: 'none', background: !anomaliaSeleccionada || generando ? 'rgba(255,209,0,0.4)' : '#FFD700', color: '#B91C1C', cursor: !anomaliaSeleccionada || generando ? 'not-allowed' : 'pointer' }}>
        {generando ? 'Generando...' : '📥 Descargar Proposicion (Word)'}
      </button>

      {exito && (
        <div style={{ marginTop: 16, background: '#2E7D32', color: 'white', padding: 12, borderRadius: 8 }}>
          ✓ Proposicion descargada correctamente
        </div>
      )}
    </div>
  );
}
