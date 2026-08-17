import React, { useState } from 'react';
import { FileDown, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    { 
      id: 'control-presupuestal', 
      nombre: 'Control Presupuestal',
      desc: 'Cuestionar ejecucion presupuestal irregular'
    },
    { 
      id: 'pedir-informacion', 
      nombre: 'Peticion de Informacion',
      desc: 'Solicitar detalles de contrato/pago sospechoso'
    },
    { 
      id: 'mocion-orden-dia', 
      nombre: 'Mocion de Orden del Dia',
      desc: 'Llevar tema urgente a discusion plenaria'
    },
    { 
      id: 'acuerdo-investigacion', 
      nombre: 'Acuerdo para Investigacion',
      desc: 'Activar comision de investigacion'
    },
  ];

  const anomaliasDetectadas = anomaliasData.slice(0, 10).map(a => ({
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
      console.error('Error generando proposicion:', error);
      alert('Error al generar proposicion');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow-lg p-6 text-white">
      <div className="flex items-center gap-3 mb-6">
        <FileDown size={32} className="text-yellow-300" />
        <div>
          <h2 className="text-2xl font-bold">Generador de Proposiciones</h2>
          <p className="text-red-100 text-sm">Crea proposiciones automaticamente con datos reales SECOP II/SAP</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-red-800 bg-opacity-50 rounded-lg p-4">
          <h3 className="font-bold text-lg mb-4 text-yellow-300">Tipo de Proposicion</h3>
          <div className="space-y-3">
            {tiposProposicion.map(tipo => (
              <label 
                key={tipo.id}
                className={`flex items-start p-3 rounded cursor-pointer transition ${
                  tipoProposicion === tipo.id 
                    ? 'bg-yellow-300 text-red-900' 
                    : 'bg-red-900 bg-opacity-50 hover:bg-opacity-70'
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={tipo.id}
                  checked={tipoProposicion === tipo.id}
                  onChange={(e) => setTipoProposicion(e.target.value)}
                  className="mt-1 mr-3"
                />
                <div>
                  <p className="font-semibold">{tipo.nombre}</p>
                  <p className="text-xs opacity-90">{tipo.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-red-800 bg-opacity-50 rounded-lg p-4">
          <h3 className="font-bold text-lg mb-4 text-yellow-300">Anomalias Detectadas</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {anomaliasDetectadas.length === 0 ? (
              <p className="text-red-100 text-sm italic">No hay anomalias detectadas</p>
            ) : (
              anomaliasDetectadas.map(anom => (
                <button
                  key={anom.id}
                  onClick={() => setAnomaliaSeleccionada(anom)}
                  className={`w-full text-left p-3 rounded transition ${
                    anomaliaSeleccionada?.id === anom.id
                      ? 'bg-yellow-300 text-red-900 ring-2 ring-yellow-400'
                      : 'bg-red-900 bg-opacity-50 hover:bg-opacity-70 text-white'
                  }`}
                >
                  <p className="font-semibold text-sm">{anom.titulo}</p>
                  <p className="text-xs opacity-90">
                    ${anom.monto?.toLocaleString('es-CO') || '0'} - {anom.fecha}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {anomaliaSeleccionada && (
        <div className="mt-6 bg-red-800 bg-opacity-50 rounded-lg p-4">
          <h4 className="font-bold text-yellow-300 mb-2">Preview</h4>
          <p className="text-sm text-red-50">
            <strong>Tipo:</strong> {tiposProposicion.find(t => t.id === tipoProposicion)?.nombre}<br/>
            <strong>Asunto:</strong> {anomaliaSeleccionada.titulo}<br/>
            <strong>Monto:</strong> ${anomaliaSeleccionada.monto?.toLocaleString('es-CO') || '0'}<br/>
            <strong>Radicado:</strong> El documento incluira citas reales de SECOP II y SAP Distrital
          </p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleGenerar}
          disabled={!anomaliaSeleccionada || generando}
          className="flex-1 bg-yellow-300 text-red-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {generando ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-red-900 border-t-transparent rounded-full"></div>
              Generando...
            </>
          ) : (
            <>
              <FileDown size={20} />
              Descargar Proposicion (Word)
            </>
          )}
        </button>
      </div>

      {exito && (
        <div className="mt-4 bg-green-500 text-white p-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={20} />
          <span>Proposicion generada y descargada correctamente</span>
        </div>
      )}
    </div>
  );
}
