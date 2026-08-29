import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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

// Datos de beneficiarios de ejemplo por cédula
const BENEFICIARIOS = {
  '2986631': {
    cedula: '2986631',
    nombre: 'María González López',
    edad: 45,
    localidad: 'Usme',
    sisbenGrupo: 'A',
    sisbenFecha: '2024-01-15',
    imgBeneficiario: true,
    imgFechaInicio: '2023-08-01',
    imgTransferenciaMensual: 350000,
    transferenciasRecibidas: [
      { mes: 'Ago 2026', monto: 350000, estado: 'Pagado' },
      { mes: 'Jul 2026', monto: 350000, estado: 'Pagado' },
      { mes: 'Jun 2026', monto: 350000, estado: 'Pagado' },
      { mes: 'May 2026', monto: 350000, estado: 'Pagado' },
    ],
    hogar: { personas: 5, menores: 2 },
    barrio: 'San Cristóbal Usme',
    alertas: ['SISBEN A (extrema pobreza)', 'Beneficiario activo en IMG', 'Transferencias al día'],
  },
  '1234567': {
    cedula: '1234567',
    nombre: 'Juan Martínez Rodríguez',
    edad: 52,
    localidad: 'Ciudad Bolívar',
    sisbenGrupo: 'B',
    sisbenFecha: '2024-02-10',
    imgBeneficiario: false,
    imgFechaInicio: null,
    imgTransferenciaMensual: 0,
    transferenciasRecibidas: [],
    hogar: { personas: 4, menores: 1 },
    barrio: 'Julio Roa',
    alertas: ['SISBEN B (vulnerable)', '⚠️ EN SISBEN PERO SIN IMG', 'Brecha identificada'],
  },
};

export default function IMGSubsidiosModule() {
  const [localidadSeleccionada, setLocalidadSeleccionada] = useState('5');
  const [cedula, setCedula] = useState('');
  const [beneficiarioEncontrado, setBeneficiarioEncontrado] = useState(null);

  const datos = DATOS_LOCALIDADES[localidadSeleccionada] || { sisben: 0, img: 0, transferencias: 0, tasa: 0 };
  const penetracion = datos.sisben > 0 ? Math.round((datos.img / datos.sisben) * 100) : 0;
  const brecha = datos.sisben - datos.img;
  const localidadNombre = LOCALIDADES_BOGOTA.find(l => l.id === localidadSeleccionada)?.nombre;

  const handleBuscar = () => {
    if (cedula.length >= 7) {
      const beneficiario = BENEFICIARIOS[cedula];
      setBeneficiarioEncontrado(beneficiario || { error: true });
    }
  };

  const handleLimpiar = () => {
    setCedula('');
    setBeneficiarioEncontrado(null);
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
            <label className="block text-sm font-semibold mb-2">🔍 Consultar por Cédula (Prueba: 2986631 o 1234567)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="12345678"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleBuscar()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleBuscar}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
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

      {/* Resultado de Búsqueda */}
      {beneficiarioEncontrado && (
        <div className={`p-6 rounded-lg shadow mb-6 ${beneficiarioEncontrado.error ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
          {beneficiarioEncontrado.error ? (
            <div>
              <h3 className="text-lg font-semibold text-red-800">❌ Beneficiario no encontrado</h3>
              <p className="text-sm text-red-700 mt-2">No hay registros para la cédula {cedula} en las bases de datos integradas.</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-6">
                {/* Información Personal */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">👤 Información Personal</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nombre:</strong> {beneficiarioEncontrado.nombre}</p>
                    <p><strong>Cédula:</strong> {beneficiarioEncontrado.cedula}</p>
                    <p><strong>Edad:</strong> {beneficiarioEncontrado.edad} años</p>
                    <p><strong>Localidad:</strong> {beneficiarioEncontrado.localidad}</p>
                    <p><strong>Barrio:</strong> {beneficiarioEncontrado.barrio}</p>
                    <p><strong>Hogar:</strong> {beneficiarioEncontrado.hogar.personas} personas ({beneficiarioEncontrado.hogar.menores} menores)</p>
                  </div>
                </div>

                {/* SISBEN IV */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 SISBEN IV (DNP)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="bg-blue-100 p-2 rounded">
                      <p className="font-semibold text-blue-900">Grupo: {beneficiarioEncontrado.sisbenGrupo}</p>
                      <p className="text-xs text-blue-700">
                        {beneficiarioEncontrado.sisbenGrupo === 'A' && 'Extrema pobreza'}
                        {beneficiarioEncontrado.sisbenGrupo === 'B' && 'Pobreza/Vulnerable'}
                      </p>
                    </div>
                    <p><strong>Focalización:</strong> {new Date(beneficiarioEncontrado.sisbenFecha).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* IMG (Renta Básica) */}
                <div>
                  <h3 className="text-lg font-semibold text-green-800 mb-3">💰 IMG (Renta Básica)</h3>
                  <div className="space-y-2 text-sm">
                    {beneficiarioEncontrado.imgBeneficiario ? (
                      <div className="bg-green-100 p-2 rounded">
                        <p className="font-semibold text-green-900">✅ BENEFICIARIO ACTIVO</p>
                        <p className="text-xs text-green-700 mt-1">Transferencia: ${beneficiarioEncontrado.imgTransferenciaMensual.toLocaleString()}/mes</p>
                        <p className="text-xs text-green-700">Desde: {new Date(beneficiarioEncontrado.imgFechaInicio).toLocaleDateString()}</p>
                      </div>
                    ) : (
                      <div className="bg-red-100 p-2 rounded">
                        <p className="font-semibold text-red-900">❌ SIN COBERTURA IMG</p>
                        <p className="text-xs text-red-700 mt-1">⚠️ Está en SISBEN pero NO recibe transferencias</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Historial de Transferencias */}
              {beneficiarioEncontrado.transferenciasRecibidas.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 Historial de Transferencias (últimos 4 meses)</h3>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-300">
                        <tr>
                          <th className="text-left py-2 px-2">Mes</th>
                          <th className="text-right py-2 px-2">Monto</th>
                          <th className="text-center py-2 px-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {beneficiarioEncontrado.transferenciasRecibidas.map((t, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-2 px-2">{t.mes}</td>
                            <td className="text-right py-2 px-2 font-semibold text-green-600">${t.monto.toLocaleString()}</td>
                            <td className="text-center py-2 px-2">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{t.estado}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Alertas Específicas */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🔔 Alertas Específicas del Beneficiario</h3>
                <div className="space-y-2">
                  {beneficiarioEncontrado.alertas.map((alerta, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded text-sm ${
                        alerta.includes('⚠️') 
                          ? 'bg-red-100 text-red-800' 
                          : alerta.includes('activo') 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {alerta}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
          <li>✅ <strong>Control Fiscal:</strong> Identificar si hay personas en SISBEN que NO están en IMG</li>
          <li>✅ <strong>Auditoría:</strong> Verificar si transferencias se están entregando realmente</li>
          <li>✅ <strong>Presión Política:</strong> Evidenciar brechas para propuestas de Ediles</li>
          <li>✅ <strong>Denuncias:</strong> Documentar a beneficiarios que no reciben dinero</li>
        </ul>
      </div>

      {/* Información Relevante */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">📌 ¿Qué información cruza este módulo?</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="font-semibold text-blue-600">SISBEN IV (DNP)</p>
            <p className="text-gray-700">Personas focalizadas como pobres/vulnerables</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <p className="font-semibold text-green-600">IMG (Renta Básica)</p>
            <p className="text-gray-700">Beneficiarios que reciben transferencias</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <p className="font-semibold text-orange-600">Brecha Identificada</p>
            <p className="text-gray-700">{brecha.toLocaleString()} personas sin cobertura</p>
          </div>
        </div>
      </div>

      {/* Fuentes de Datos */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">📚 Fuentes de Datos</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-3 rounded border border-yellow-200">
            <p className="font-semibold text-blue-700">1️⃣ SISBEN IV (DNP)</p>
            <p className="text-gray-700 text-xs mt-1">• Entidad: Departamento Nacional de Planeación</p>
            <p className="text-gray-700 text-xs">• Años: 2022 - Actualidad</p>
            <p className="text-gray-700 text-xs">• Actualización: Mensual</p>
            <p className="text-gray-700 text-xs">• Fuente: datos.gov.co</p>
          </div>
          <div className="bg-white p-3 rounded border border-yellow-200">
            <p className="font-semibold text-green-700">2️⃣ IMG (SDIS Bogotá)</p>
            <p className="text-gray-700 text-xs mt-1">• Entidad: Alcaldía de Bogotá + SDIS</p>
            <p className="text-gray-700 text-xs">• Años: 2023 - Actualidad</p>
            <p className="text-gray-700 text-xs">• Actualización: Semanal</p>
            <p className="text-gray-700 text-xs">• Fuente: rentabasicabogota.gov.co</p>
          </div>
        </div>
      </div>
    </div>
  );
}
