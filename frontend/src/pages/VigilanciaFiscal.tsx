import { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Alerta {
  nivel: string;
  documento: string;
  proveedor: string;
  tipo: string;
  sancion: string;
  fecha: string;
  vigente: string;
  valor: string;
  estado: string;
  fuente: string;
}

interface ResultadoVFI {
  entidad: string;
  total_contratos: number;
  total_alertas: number;
  criticas: number;
  altas: number;
  medias: number;
  info: number;
  alertas: Alerta[];
}

export default function VigilanciaFiscal() {
  const [entidad, setEntidad] = useState('USME');
  const [resultado, setResultado] = useState<ResultadoVFI | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('TODAS');

  const analizarEntidad = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/vfi/analizar?entidad=${entidad}`);
      const data = await response.json();
      setResultado(data);
    } catch (error) {
      alert('Error conectando al backend');
    }
    setLoading(false);
  };

  const alertasFiltradas = resultado?.alertas.filter(a => 
    filtro === 'TODAS' || a.nivel === filtro
  ) || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">⚖️ Vigilancia Fiscal IA</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={entidad}
              onChange={(e) => setEntidad(e.target.value)}
              placeholder="Ej: USME"
              className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
            />
            <button
              onClick={analizarEntidad}
              disabled={loading}
              className="bg-blue-600 px-6 py-2 rounded font-semibold"
            >
              {loading ? 'Analizando...' : 'Analizar'}
            </button>
          </div>
        </div>

        {resultado && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-900 rounded-lg p-6">
                <div className="text-4xl font-bold">{resultado.total_alertas}</div>
                <div className="text-gray-400">Alertas totales</div>
              </div>
              <div className="bg-red-900 rounded-lg p-6">
                <div className="text-4xl font-bold">🔴 {resultado.criticas}</div>
                <div className="text-gray-400">Críticas</div>
              </div>
              <div className="bg-orange-900 rounded-lg p-6">
                <div className="text-4xl font-bold">🟠 {resultado.altas}</div>
                <div className="text-gray-400">Altas</div>
              </div>
              <div className="bg-yellow-900 rounded-lg p-6">
                <div className="text-4xl font-bold">🟡 {resultado.medias}</div>
                <div className="text-gray-400">Medias</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="text-left py-3">Nivel</th>
                    <th className="text-left py-3">Proveedor</th>
                    <th className="text-left py-3">Antecedente</th>
                    <th className="text-left py-3">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {alertasFiltradas.map((a, i) => (
                    <tr key={i} className="border-b border-gray-700">
                      <td className="py-3"><span className="bg-orange-900 px-3 py-1 rounded">{a.nivel}</span></td>
                      <td className="py-3">{a.proveedor}</td>
                      <td className="py-3">{a.sancion}</td>
                      <td className="py-3">${a.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
