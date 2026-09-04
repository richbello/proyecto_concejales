import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import puaData from '../data_pua.json';

const TEMATICAS = [
  'INGRESO MINIMO GARANTIZADO', 'COMISARIAS', 'VEJEZ', 'INFANCIA',
  'FORTALECIMIENTO GESTION TERRITORIAL', 'BIENESTAR ALIMENTARIO',
  'JÓVENES', 'INCLUSIÓN SOCIAL', 'HABITANTE DE CALLE',
];

const ETARIOS = ['0-12', '13-17', '18-59', '60+'];

export default function SisbenPuaModule() {
  const [tab, setTab] = useState('servicios');

  const totalGeneral = puaData.reduce((s, x) => s + x.total, 0);

  const exportar = () => {
    let rows;
    if (tab === 'servicios') {
      rows = puaData.map(x => {
        const r: any = { Localidad: x.localidad, Total: x.total };
        TEMATICAS.forEach(t => { r[t] = (x.servicios as any)[t] || 0; });
        return r;
      });
    } else if (tab === 'vulnerables') {
      rows = puaData.map(x => ({
        Localidad: x.localidad, Total: x.total,
        Discapacidad: x.discapacidad, Victimas: x.victimas,
        LGBTI: x.lgbti, Migrantes: x.migrantes,
      }));
    } else {
      rows = puaData.map(x => {
        const r: any = { Localidad: x.localidad, Total: x.total };
        ETARIOS.forEach(e => { r[e] = (x.etario as any)[e] || 0; });
        return r;
      });
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PUA');
    XLSX.writeFile(wb, `PUA_${tab}_2024.xlsx`);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
      <h2 className="text-3xl font-bold mb-1 text-gray-800">Personas Atendidas por SDIS (PUA 2024)</h2>
      <p className="text-xs text-gray-600 mb-1">Total atendidos en Bogota: {totalGeneral.toLocaleString()} personas</p>
      <p className="text-xs text-gray-500 mb-4">Fuente: SDIS - Registro PUA anonimizado 2024. Datos reales agregados por localidad.</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setTab('servicios')} className={tab === 'servicios' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold' : 'px-4 py-2 bg-white text-gray-700 rounded'}>Servicios por localidad</button>
        <button onClick={() => setTab('vulnerables')} className={tab === 'vulnerables' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold' : 'px-4 py-2 bg-white text-gray-700 rounded'}>Poblaciones vulnerables</button>
        <button onClick={() => setTab('etario')} className={tab === 'etario' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold' : 'px-4 py-2 bg-white text-gray-700 rounded'}>Grupo etario</button>
        <button onClick={exportar} className="px-4 py-2 bg-green-600 text-white rounded font-semibold">Exportar Excel</button>
      </div>

      {tab === 'servicios' && (
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-200">
              <tr>
                <th className="text-left py-2 px-2">Localidad</th>
                <th className="text-right py-2 px-2">Total</th>
                {TEMATICAS.map(t => <th key={t} className="text-right py-2 px-1" style={{fontSize:'9px'}}>{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {puaData.map((x, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2 font-semibold">{x.localidad}</td>
                  <td className="py-2 px-2 text-right font-bold text-blue-700">{x.total.toLocaleString()}</td>
                  {TEMATICAS.map(t => <td key={t} className="py-2 px-1 text-right">{((x.servicios as any)[t] || 0).toLocaleString()}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'vulnerables' && (
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-200">
              <tr>
                <th className="text-left py-2 px-2">Localidad</th>
                <th className="text-right py-2 px-2">Total</th>
                <th className="text-right py-2 px-2">Discapacidad</th>
                <th className="text-right py-2 px-2">Victimas</th>
                <th className="text-right py-2 px-2">LGBTI</th>
                <th className="text-right py-2 px-2">Migrantes</th>
              </tr>
            </thead>
            <tbody>
              {puaData.map((x, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2 font-semibold">{x.localidad}</td>
                  <td className="py-2 px-2 text-right font-bold text-blue-700">{x.total.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-purple-700">{x.discapacidad.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-red-700">{x.victimas.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-pink-700">{x.lgbti.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-orange-700">{x.migrantes.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'etario' && (
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-200">
              <tr>
                <th className="text-left py-2 px-2">Localidad</th>
                <th className="text-right py-2 px-2">Total</th>
                <th className="text-right py-2 px-2">Ninos (0-12)</th>
                <th className="text-right py-2 px-2">Adolescentes (13-17)</th>
                <th className="text-right py-2 px-2">Adultos (18-59)</th>
                <th className="text-right py-2 px-2">Mayores (60+)</th>
              </tr>
            </thead>
            <tbody>
              {puaData.map((x, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2 font-semibold">{x.localidad}</td>
                  <td className="py-2 px-2 text-right font-bold text-blue-700">{x.total.toLocaleString()}</td>
                  {ETARIOS.map(e => <td key={e} className="py-2 px-2 text-right">{((x.etario as any)[e] || 0).toLocaleString()}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}