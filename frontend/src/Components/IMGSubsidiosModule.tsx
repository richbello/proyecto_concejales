import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const LOCALIDADES_BOGOTA = [
  { id: '1', nombre: 'Usaquén' },
  { id: '2', nombre: 'Chapinero' },
  { id: '3', nombre: 'Santa Fe' },
  { id: '4', nombre: 'San Cristóbal' },
  { id: '5', nombre: 'Usme' },
  { id: '6', nombre: 'Tunjuelito' },
  { id: '7', nombre: 'Bosa' },
  { id: '8', nombre: 'Kennedy' },
  { id: '9', nombre: 'Fontibón' },
  { id: '10', nombre: 'Engativá' },
  { id: '11', nombre: 'Suba' },
  { id: '12', nombre: 'Barrios Unidos' },
  { id: '13', nombre: 'Teusaquillo' },
  { id: '14', nombre: 'Los Mártires' },
  { id: '15', nombre: 'Antonio Nariño' },
  { id: '16', nombre: 'Puente Aranda' },
  { id: '17', nombre: 'Candelaria' },
  { id: '18', nombre: 'Rafael Uribe Umaña' },
  { id: '19', nombre: 'Ciudad Bolívar' },
  { id: '20', nombre: 'Sumapaz' },
];

const DATOS_LOCALIDADES = {
  '5': { sisben: 5200, img: 2100, transferencias: 48500000, tasa: 92 },
  '19': { sisben: 8900, img: 3200, transferencias: 72000000, tasa: 88 },
  '1': { sisben: 3200, img: 1600, transferencias: 35000000, tasa: 95 },
  '11': { sisben: 12000, img: 4800, transferencias: 105000000, tasa: 85 },
};

export default function IMGSubsidiosModule() {
  const [localidadSeleccionada, setLocalidadSeleccionada] = useState('5');
  const [cedula, setCedula] = useState('');

  const datos = DATOS_LOCALIDADES[localidadSeleccionada] || { sisben: 0, img: 0, transferencias: 0, tasa: 0 };
  const penetracion = datos.sisben > 0 ? Math.round((datos.img / datos.sisben) * 100) : 0;
  const brecha = datos.sisben - datos.img;
  const localidadNombre = LOCALIDADES_BOGOTA.find(l => l.id === localidadSeleccionada)?.nombre;

  const handleLimpiar = () => {
    setCedula('');
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
      <h2 className="text-3xl font-bold mb-2 text-gray-800">📊 Análisis Subsidios IMG - SISBEN IV</h2>
      <p className="text-sm text-gray-600 mb-6">🎯 Control político: Identifica cobertura, brechas y oportunidades de auditoría fiscal</p>
      
      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">📍 Filtrar por Localidad</label>
            <select
              value={localidadSeleccionada}
              onChange={(e) => setLocalidadSeleccionada(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LOCALIDADES_BOGOTA.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">🔍 Consultar por Cédula</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="12345678"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                Buscar
              </button>
              <button 
                onClick={handleLimpiar}
                className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-semibold"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">SISBEN A+B</p>
          <p className="text-2xl font-bold text-blue-600">{datos.sisben.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{localidadNombre}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">IMG Beneficiarios</p>
          <p className="text-2xl font-bold text-green-600">{datos.img.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Con transferencia activa</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Penetración</p>
          <p className={`text-2xl font-bold ${penetracion > 80 ? 'text-green-600' : penetracion > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {penetracion}%
          </p>
          <p className="text-xs text-gray-500 mt-1">De SISBEN en IMG</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Tasa de Cobro</p>
          <p className="text-2xl font-bold text-purple-600">{datos.tasa}%</p>
          <p className="text-xs text-gray-500 mt-1">Hogares que reciben</p>
        </div>
      </div>

      {/* ¿Para qué sirve? */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">🎯 ¿Para qué sirve este módulo?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✅ <strong>Control Fiscal:</strong> Identificar si hay personas en SISBEN que NO están en IMG (brecha de cobertura)</li>
          <li>✅ <strong>Auditoría:</strong> Detectar inconsistencias en tasas de cobro y transferencias</li>
          <li>✅ <strong>Presión Política:</strong> Evidenciar cobertura insuficiente para propuestas de Ediles</li>
          <li>✅ <strong>Vigilancia:</strong> Monitorear si el dinero llega realmente a los beneficiarios</li>
        </ul>
      </div>

      {/* Información Relevante */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">📌 ¿Qué información cruza este módulo?</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="font-semibold text-blue-600">SISBEN IV (DNP)</p>
            <p className="text-gray-700">Personas focalizadas como pobres/vulnerables</p>
            <p className="text-xs text-gray-500 mt-1">Grupos A (extrema pobreza) a D</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <p className="font-semibold text-green-600">IMG (Renta Básica)</p>
            <p className="text-gray-700">Beneficiarios que reciben transferencias</p>
            <p className="text-xs text-gray-500 mt-1">Alcaldía de Bogotá</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <p className="font-semibold text-orange-600">Brecha Identificada</p>
            <p className="text-gray-700">{brecha.toLocaleString()} personas sin cobertura</p>
            <p className="text-xs text-gray-500 mt-1">Oportunidad de presión política</p>
          </div>
        </div>
      </div>

      {/* Fuentes de Datos */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">📚 Fuentes de Datos (¿De dónde viene la información?)</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-3 rounded border border-yellow-200">
            <p className="font-semibold text-blue-700">1️⃣ SISBEN IV</p>
            <p className="text-gray-700 text-xs mt-1">• <strong>Entidad:</strong> Departamento Nacional de Planeación (DNP)</p>
            <p className="text-gray-700 text-xs">• <strong>Años:</strong> 2022 - Actualidad</p>
            <p className="text-gray-700 text-xs">• <strong>Actualización:</strong> Mensual</p>
            <p className="text-gray-700 text-xs">• <strong>Cobertura:</strong> 3.8M personas en Bogotá</p>
            <p className="text-gray-700 text-xs">• <strong>Fuente:</strong> datos.gov.co (dataset hq2v-5umk)</p>
          </div>
          <div className="bg-white p-3 rounded border border-yellow-200">
            <p className="font-semibold text-green-700">2️⃣ IMG (Renta Básica)</p>
            <p className="text-gray-700 text-xs mt-1">• <strong>Entidad:</strong> Alcaldía Local de Bogotá + SDIS</p>
            <p className="text-gray-700 text-xs">• <strong>Años:</strong> 2023 - Actualidad</p>
            <p className="text-gray-700 text-xs">• <strong>Actualización:</strong> Semanal</p>
            <p className="text-gray-700 text-xs">• <strong>Cobertura:</strong> Beneficiarios activos con giro</p>
            <p className="text-gray-700 text-xs">• <strong>Fuente:</strong> rentabasicabogota.gov.co (PQRF)</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">💰 Transferencias IMG</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={[{ name: 'Transferido', value: datos.transferencias }]} dataKey="value" cx="50%" cy="50%" outerRadius={80}>
                <Cell fill="#3b82f6" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-sm font-semibold mt-2">${(datos.transferencias / 1000000).toFixed(1)}M total</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">📊 Indicadores Clave</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Brecha de Cobertura</p>
              <p className="text-xl font-bold text-orange-600">{((brecha / datos.sisben) * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-500">{brecha.toLocaleString()} hogares sin cobertura</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Transferencia Promedio</p>
              <p className="text-xl font-bold text-green-600">${(datos.transferencias / datos.img).toLocaleString()}</p>
              <p className="text-xs text-gray-500">Por hogar beneficiario/mes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div className="bg-white p-4 rounded-lg shadow mt-6">
        <h3 className="text-lg font-semibold mb-4">🔔 Alertas Automáticas</h3>
        <div className="space-y-2">
          {penetracion < 40 && <div className="bg-red-100 p-3 rounded text-red-800">🔴 COBERTURA CRÍTICA: {penetracion}% - Menos del 40%</div>}
          {brecha > 3000 && <div className="bg-orange-100 p-3 rounded text-orange-800">🟠 BRECHA GRANDE: {brecha.toLocaleString()} personas sin IMG</div>}
          {datos.tasa < 85 && <div className="bg-yellow-100 p-3 rounded text-yellow-800">🟡 BAJA TASA COBRO: {datos.tasa}% - Por debajo del 85%</div>}
          {penetracion >= 80 && <div className="bg-green-100 p-3 rounded text-green-800">✅ META CUMPLIDA: Penetración en {penetracion}%</div>}
        </div>
      </div>
    </div>
  );
}
