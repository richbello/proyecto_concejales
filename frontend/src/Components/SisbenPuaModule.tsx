import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function SisbenPuaModule() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Datos PUA 2024 por localidad
  const puaPorLocalidad = {
    '1': { pua: 36587, tematica: { img: 24500, vejez: 3200, infancia: 4100, comisarias: 2100 } },
    '5': { pua: 93579, tematica: { img: 62700, vejez: 8900, infancia: 12200, comisarias: 5600 } },
    '7': { pua: 133673, tematica: { img: 89400, vejez: 12100, infancia: 16800, comisarias: 8200 } },
    '8': { pua: 121075, tematica: { img: 81000, vejez: 10900, infancia: 15300, comisarias: 7600 } },
    '11': { pua: 100911, tematica: { img: 67500, vejez: 9600, infancia: 12800, comisarias: 6200 } },
    '19': { pua: 152623, tematica: { img: 102200, vejez: 14600, infancia: 19400, comisarias: 9400 } },
    '4': { pua: 78989, tematica: { img: 52900, vejez: 7600, infancia: 10000, comisarias: 4800 } },
    '10': { pua: 72162, tematica: { img: 48300, vejez: 6900, infancia: 9100, comisarias: 4400 } },
    '18': { pua: 70030, tematica: { img: 46900, vejez: 6700, infancia: 8900, comisarias: 4300 } },
    '6': { pua: 29278, tematica: { img: 19600, vejez: 2800, infancia: 3600, comisarias: 1800 } },
    '9': { pua: 28504, tematica: { img: 19100, vejez: 2700, infancia: 3600, comisarias: 1700 } },
    '3': { pua: 26081, tematica: { img: 17500, vejez: 2500, infancia: 3300, comisarias: 1600 } },
    '14': { pua: 24810, tematica: { img: 16600, vejez: 2400, infancia: 3100, comisarias: 1500 } },
    '16': { pua: 19086, tematica: { img: 12800, vejez: 1800, infancia: 2400, comisarias: 1200 } },
    '17': { pua: 15064, tematica: { img: 10100, vejez: 1400, infancia: 1900, comisarias: 900 } },
    '12': { pua: 10572, tematica: { img: 7100, vejez: 1000, infancia: 1300, comisarias: 650 } },
    '15': { pua: 10314, tematica: { img: 6900, vejez: 990, infancia: 1300, comisarias: 630 } },
    '2': { pua: 10161, tematica: { img: 6800, vejez: 970, infancia: 1300, comisarias: 620 } },
    '13': { pua: 3980, tematica: { img: 2670, vejez: 380, infancia: 500, comisarias: 250 } },
    '20': { pua: 2024, tematica: { img: 1355, vejez: 195, infancia: 260, comisarias: 130 } },
  };

  const LOCALIDADES = [
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

  const cargar = async () => {
    setCargando(true);
    try {
      const GEO = 'https://geovisor.sdis.gov.co/server/rest/services/Mapa_base_includata/MapServer';
      
      const query = async (id) => {
        const url = GEO + '/' + id + '/query?where=1%3D1&outFields=*&returnGeometry=false&f=json';
        const r = await fetch(url);
        const j = await r.json();
        return (j.features || []).map(f => f.attributes);
      };

      const [sisA, sisB] = await Promise.all([query(45), query(27)]);

      const idx = {};
      
      sisA.forEach(r => {
        const key = (r.LocNombre || '').toUpperCase();
        if (!idx[key]) idx[key] = { localidad: r.LocNombre, sisbenA: 0, sisbenB: 0, pua: 0 };
        idx[key].sisbenA = r.Hogares_A || 0;
      });

      sisB.forEach(r => {
        const key = (r.LocNombre || '').toUpperCase();
        if (!idx[key]) idx[key] = { localidad: r.LocNombre, sisbenA: 0, sisbenB: 0, pua: 0 };
        idx[key].sisbenB = r.Hogares_B || 0;
      });

      // Agregar datos PUA
      Object.keys(puaPorLocalidad).forEach(locId => {
        const loc = LOCALIDADES.find(l => l.id === locId);
        if (loc) {
          const key = loc.nombre.toUpperCase();
          if (!idx[key]) idx[key] = { localidad: loc.nombre, sisbenA: 0, sisbenB: 0, pua: 0 };
          idx[key].pua = puaPorLocalidad[locId].pua;
          idx[key].puaTematica = puaPorLocalidad[locId].tematica;
        }
      });

      const resultado = Object.values(idx).map((x) => {
        const sisbenTotal = x.sisbenA + x.sisbenB;
        const brecha = Math.max(sisbenTotal - x.pua, 0);
        const coberturaPUA = sisbenTotal > 0 ? Math.round((x.pua / sisbenTotal) * 100) : 0;
        return { ...x, sisbenTotal, brecha, coberturaPUA };
      }).sort((a, b) => b.brecha - a.brecha);

      setData(resultado);
    } catch (e) {
      console.error(e);
    }
    setCargando(false);
  };

  const exportar = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(data.map(f => ({
      Localidad: f.localidad,
      'SISBEN A': f.sisbenA,
      'SISBEN B': f.sisbenB,
      'Total SISBEN': f.sisbenTotal,
      'PUA Atendidos': f.pua,
      'Cobertura %': f.coberturaPUA,
      'Brecha (sin servicios)': f.brecha,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SISBEN vs PUA');
    XLSX.writeFile(wb, 'SISBEN_vs_PUA_2024.xlsx');
  };

  if (!data) {
    return (
      <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
        <h2 className="text-3xl font-bold mb-2 text-gray-800">🔗 SISBEN × PUA 2024</h2>
        <p className="text-sm text-gray-600 mb-6">Cruce: Pobres (SISBEN) vs Atendidos (PUA/SDIS)</p>
        <button onClick={cargar} disabled={cargando}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold">
          {cargando ? 'Cargando...' : 'Cargar Cruce SISBEN × PUA'}
        </button>
      </div>
    );
  }

  const totalSisben = data.reduce((s, f) => s + f.sisbenTotal, 0);
  const totalPUA = data.reduce((s, f) => s + f.pua, 0);
  const brechaTotal = data.reduce((s, f) => s + f.brecha, 0);

  return (
    <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
      <h2 className="text-3xl font-bold mb-1 text-gray-800">🔗 SISBEN × PUA 2024</h2>
      <div className="flex gap-2 mb-6">
        <button onClick={exportar} className="px-4 py-2 bg-green-600 text-white rounded font-semibold">📥 Exportar</button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">SISBEN Pobres</p>
          <p className="text-2xl font-bold text-red-600">{totalSisben.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">PUA Atendidos</p>
          <p className="text-2xl font-bold text-green-600">{totalPUA.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">Cobertura %</p>
          <p className="text-2xl font-bold text-blue-600">{totalSisben > 0 ? Math.round((totalPUA / totalSisben) * 100) : 0}%</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">BRECHA CRÍTICA</p>
          <p className="text-2xl font-bold text-orange-600">{brechaTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-200">
            <tr>
              <th className="text-left py-2 px-2">Localidad</th>
              <th className="text-right py-2 px-2">SISBEN</th>
              <th className="text-right py-2 px-2">PUA</th>
              <th className="text-center py-2 px-2">%</th>
              <th className="text-right py-2 px-2">Brecha</th>
            </tr>
          </thead>
          <tbody>
            {data.map((f, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="py-2 px-2 font-semibold">{f.localidad}</td>
                <td className="py-2 px-2 text-right text-red-600">{f.sisbenTotal.toLocaleString()}</td>
                <td className="py-2 px-2 text-right text-green-600">{f.pua.toLocaleString()}</td>
                <td className="py-2 px-2 text-center"><span className={f.coberturaPUA >= 100 ? 'bg-green-100 px-2 py-1 rounded' : f.coberturaPUA >= 50 ? 'bg-yellow-100 px-2 py-1 rounded' : 'bg-red-100 px-2 py-1 rounded'}>{f.coberturaPUA}%</span></td>
                <td className="py-2 px-2 text-right font-bold text-orange-600">{f.brecha.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}