import React, { useState } from 'react';
import { FileDown, CheckCircle2 } from 'lucide-react';
import { generarProposicionWord } from './generarProposicionWord';

interface DatosProposicion {
  presupuestoData?: any[];
  contratacionData?: any[];
  anomaliasData?: any[];
  localidad?: string;
  edil?: string;
}

export default function GeneradorProposicion({ 
  presupuestoData = [], 
  contratacionData = [],
  anomaliasData = [],
  localidad = 'FDL Usme',
  edil = 'Edil'
}: DatosProposicion) {
  const [tipoProposicion, setTipoProposicion] = useState('control-presupuestal');
  const [anomaliaSeleccionada, setAnomaliaSeleccionada] = useState<any>(null);
  const [generando, setGenerando] = useState(false);
  const [exito, setExito] = useState(false);

  const tiposProposicion = [
    { id: 'control-presupuestal', nombre: 'Control Presupuestal', desc: 'Cuestionar ejecucion presupuestal irregular' },
    { id: 'pedir-informacion', nombre: 'Peticion de Informacion', desc: 'Solicitar detalles de contrato/pago' },
    { id: 'mocion-orden-dia', nombre: 'Mocion de Orden del Dia', desc: 'Llevar tema urgente a discusion' },
    { id: 'acuerdo-investigacion', nombre: 'Acuerdo para Investigacion', desc: 'Activar comision de investigacion' },
  ];

  const anomaliasDetectadas = (anomaliasData || []).slice(0, 10).map((a: any) => ({
    id: a.id || Math.random(),
    titulo: a.titulo || 'Anomalia en ' + (a.concepto || a.contrato || 'N/A'),
    monto: a.monto || a.valor || 0,
    fecha: a.fecha || new Date().toISOString().split('T')[0],
    descripcion: a.descripcion || 'Deteccion automatica de irregularidad'
  }));

  const handleGenerar = async () => {
    if (!anomaliaSeleccionada) {
      alert('Selecciona una anomalia para generar la proposicion');
      return;
    }

    setGenerando(true);
    try {
      await generarProposicionWord({
        tipoProposicion,
        anomalia: anomaliaSeleccionada,
        localidad,
        edil,
        presupuestoData,
        contratacionData,
        fecha: new Date().toISOString().split('T')[0]
      });
      setExito(true);
      setTimeout(() => setExito(false), 3000);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar proposicion: ' + String(error));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div style={{background: 'linear-gradient(to bottom right, #B91C1C, #991B1B)', borderRadius: 12, padding: 24, color: 'white'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24}}>
        <span style={{fontSize: 32}}>📝</span>
        <div>
          <h2 style={{fontSize: 24, fontWeight: 'bold', margin: 0}}>Generador de Proposiciones</h2>
          <p style={{fontSize: 14, color: 'rgba(255,255,255,0.9)', margin: '4px 0 0 0'}}>Crea proposiciones con datos SECOP II/SAP</p>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24}}>
        <div style={{background: 'rgba(139,0,0,0.3)', borderRadius: 8, padding: 16}}>
          <h3 style={{fontWeight: 'bold', fontSize: 16, marginBottom: 12, color: '#FFD700'}}>Tipo de Proposicion</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {tiposProposicion.map(tipo => (
              <label key={tipo.id} style={{display: 'flex', alignItems: 'flex-start', padding: 8, borderRadius: 6, cursor: 'pointer', background: tipoProposicion === tipo.id ? '#FFD700' : 'rgba(0,0,0,0.2)', color: tipoProposicion === tipo.id ? '#B91C1C' : 'white', transition: 'all 0.2s'}}>
                <input type="radio" name="tipo" value={tipo.id} checked={tipoProposicion === tipo.id} onChange={(e) => setTipoProposicion(e.target.value)} style={{marginRight: 8, marginTop: 2}} />
                <div>
                  <p style={{fontWeight: 'bold', margin: 0}}>{tipo.nombre}</p>
                  <p style={{fontSize: 12, margin: '2px 0 0 0', opacity: 0.9}}>{tipo.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{background: 'rgba(139,0,0,0.3)', borderRadius: 8, padding: 16}}>
          <h3 style={{fontWeight: 'bold', fontSize: 16, marginBottom: 12, color: '#FFD700'}}>Anomalias Detectadas</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto'}}>
            {anomaliasDetectadas.length === 0 ? (
              <p style={{fontSize: 14, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic'}}>Sin anomalias - Carga datos del modulo PAC primero</p>
            ) : (
              anomaliasDetectadas.map(anom => (
                <button key={anom.id} onClick={() => setAnomaliaSeleccionada(anom)} style={{textAlign: 'left', padding: 12, borderRadius: 6, border: 'none', cursor: 'pointer', background: anomaliaSeleccionada?.id === anom.id ? '#FFD700' : 'rgba(0,0,0,0.2)', color: anomaliaSeleccionada?.id === anom.id ? '#B91C1C' : 'white', transition: 'all 0.2s'}}>
                  <p style={{fontWeight: 'bold', fontSize: 14, margin: 0}}>{anom.titulo}</p>
                  <p style={{fontSize: 12, margin: '4px 0 0 0', opacity: 0.9}}>${anom.monto?.toLocaleString('es-CO') || '0'} - {anom.fecha}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {anomaliaSeleccionada && (
        <div style={{background: 'rgba(139,0,0,0.3)', borderRadius: 8, padding: 16, marginBottom: 24}}>
          <h4 style={{fontWeight: 'bold', color: '#FFD700', marginBottom: 8}}>Preview</h4>
          <p style={{fontSize: 14, margin: 0, lineHeight: 1.6}}>
            <strong>Tipo:</strong> {tiposProposicion.find(t => t.id === tipoProposicion)?.nombre}<br/>
            <strong>Asunto:</strong> {anomaliaSeleccionada.titulo}<br/>
            <strong>Monto:</strong> ${anomaliaSeleccionada.monto?.toLocaleString('es-CO') || '0'}<br/>
            <strong>Citas:</strong> SECOP II y SAP Distrital
          </p>
        </div>
      )}

      <button onClick={handleGenerar} disabled={!anomaliaSeleccionada || generando} style={{width: '100%', padding: 16, fontSize: 16, fontWeight: 'bold', borderRadius: 8, border: 'none', background: !anomaliaSeleccionada || generando ? 'rgba(255,209,0,0.5)' : '#FFD700', color: '#B91C1C', cursor: !anomaliaSeleccionada || generando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}>
        {generando ? <>
          <div style={{width: 20, height: 20, border: '2px solid #B91C1C', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite'}}/>
          Generando...
        </> : <>
          📥 Descargar Proposicion (Word)
        </>}
      </button>

      {exito && (
        <div style={{marginTop: 16, background: '#4CAF50', color: 'white', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8}}>
          <span>✓</span>
          <span>Proposicion descargada correctamente</span>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
