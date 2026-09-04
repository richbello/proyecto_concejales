import React, { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import puaData from '../data_pua_completo.json';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function PuaAnalisisDetailadoModule() {
  const [tab, setTab] = useState('servicios');
  const [localidadSeleccionada, setLocalidadSeleccionada] = useState(puaData[0].localidad);

  const localidad = puaData.find(x => x.localidad === localidadSeleccionada);

  // Gráfico 1: Servicios por localidad (top 10)
  const serviciosData = Object.entries(localidad?.por_servicio || {})
    .map(([k, v]) => ({ nombre: k.substring(0, 30), valor: v as number }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  // Gráfico 2: Sexo (donuts)
  const sexoData = Object.entries(localidad?.por_sexo || {})
    .map(([k, v]) => ({ name: k, value: v as number }));

  // Gráfico 3: Temáticas (barras horizontales)
  const tematicaData = Object.entries(localidad?.por_tematica || {})
    .map(([k, v]) => ({ tematica: k.substring(0, 25), atendidos: v as number }))
    .sort((a, b) => b.atendidos - a.atendidos);

  // Gráfico 4: Comparativa localidades por total
  const comparivaData = puaData.slice(0, 10).map(x => ({
    localidad: x.localidad.substring(0, 12),
    total: x.total,
  }));

  const exportarDatos = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Localidad: localidad?.localidad, Total: localidad?.total },
      { ...localidad?.por_servicio },
      { ...localidad?.por_sexo },
      { ...localidad?.por_tematica },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PUA Detallado');
    XLSX.writeFile(wb, `PUA_Detallado_${localidadSeleccionada}.xlsx`);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
      <h2 className="text-3xl font-bold mb-1 text-gray-800">📊 Análisis PUA Detallado</h2>
      <p className="text-xs text-gray-600 mb-4">Visualizaciones interactivas de atención SDIS 2024 por servicio, sexo, UPZ y temática</p>

      <div className="mb-6 flex gap-4 items-center">
        <select 
          value={localidadSeleccionada} 
          onChange={(e) => setLocalidadSeleccionada(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {puaData.map(x => (
            <option key={x.localidad} value={x.localidad}>{x.localidad} ({x.total.toLocaleString()})</option>
          ))}
        </select>
        <button onClick={exportarDatos} className="px-4 py-2 bg-green-600 text-white rounded font-semibold">Exportar Excel</button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setTab('servicios')} className={tab === 'servicios' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm' : 'px-4 py-2 bg-white text-gray-700 rounded text-sm'}>Servicios</button>
        <button onClick={() => setTab('sexo')} className={tab === 'sexo' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm' : 'px-4 py-2 bg-white text-gray-700 rounded text-sm'}>Sexo</button>
        <button onClick={() => setTab('tematica')} className={tab === 'tematica' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm' : 'px-4 py-2 bg-white text-gray-700 rounded text-sm'}>Temáticas</button>
        <button onClick={() => setTab('comparativa')} className={tab === 'comparativa' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm' : 'px-4 py-2 bg-white text-gray-700 rounded text-sm'}>Comparativa</button>
      </div>

      {tab === 'servicios' && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Servicios más atendidos en {localidadSeleccionada}</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={serviciosData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="valor" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'sexo' && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Distribución por sexo en {localidadSeleccionada}</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie data={sexoData} cx="50%" cy="50%" labelLine={false} label={({name, value}) => `${name}: ${(value as number).toLocaleString()}`} outerRadius={120} fill="#8884d8" dataKey="value">
                {sexoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'tematica' && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Temáticas de atención en {localidadSeleccionada}</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={tematicaData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="tematica" type="category" width={200} />
              <Tooltip />
              <Bar dataKey="atendidos" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'comparativa' && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Comparativa: Top 10 localidades por total atendidos</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparivaData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="localidad" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}