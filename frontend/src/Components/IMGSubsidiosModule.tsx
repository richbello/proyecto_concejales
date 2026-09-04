import React, { useState } from 'react';
import * as XLSX from 'xlsx';

// Capas reales del Geovisor SDIS (Mapa_base_includata)
const GEO = 'https://geovisor.sdis.gov.co/server/rest/services/Mapa_base_includata/MapServer';
const LAYER_IMG = 54;      // Hogares Beneficiarios IMG 2024
const LAYER_SISBEN_A = 45; // SISBEN IV Grupo A por Localidad
const LAYER_SISBEN_B = 27; // SISBEN IV Grupo B por Localidad

async function queryLayer(layerId: number) {
  const url = `${GEO}/${layerId}/query?where=1%3D1&outFields=*&returnGeometry=false&f=json`;
  const r = await fetch(url);
  const j = await r.json();
  return (j.features || []).map((f: any) => f.attributes);
}

export default function IMGSubsidiosModule() {
  const [filas, setFilas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const [imgRows, sisA, sisB] = await Promise.all([
        queryLayer(LAYER_IMG),
        queryLayer(LAYER_SISBEN_A),
        queryLayer(LAYER_SISBEN_B),
      ]);

      // Indexar por nombre de localidad
      const idx: Record<string, any> = {};

      const setVal = (loc: string, campo: string, val: number) => {
        const key = (loc || '').trim().toUpperCase();
        if (!key) return;
        if (!idx[key]) idx[key] = { localidad: loc.trim(), sisbenA: 0, sisbenB: 0, img: 0 };
        idx[key][campo] = val || 0;
      };

      sisA.forEach((r: any) => setVal(r.LocNombre, 'sisbenA', r.Hogares_A));
      sisB.forEach((r: any) => setVal(r.LocNombre, 'sisbenB', r.Hogares_B));
      // La capa IMG puede traer el conteo en Hogares_A o en un campo propio; tomamos el primer entero > 0
      imgRows.forEach((r: any) => {
        const posible = r.Hogares_IMG ?? r.Hogares ?? r.Total ?? r.Hogares_A ?? 0;
        setVal(r.LocNombre, 'img', posible);
      });

      const resultado = Object.values(idx).map((x: any) => {
        const sisbenAB = x.sisbenA + x.sisbenB;
        const penetracion = sisbenAB > 0 ? Math.round((x.img / sisbenAB) * 100) : 0;
        const brecha = Math.max(sisbenAB - x.img, 0);
        return { ...x, sisbenAB, penetracion, brecha };
      }).sort((a: any, b: any) => b.brecha - a.brecha);

      if (resultado.length === 0) {
        setError('El geovisor respondió sin filas. Revisa la consola (F12) para ver la respuesta cruda.');
      }
      setFilas(resultado);
      setCargado(true);
    } catch (e: any) {
      setError('Error consultando el geovisor SDIS: ' + e.message);
    }
    setCargando(false);
  };

  const exportar = () => {
    if (filas.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(filas.map(f => ({
      Localidad: f.localidad,
      'SISBEN A': f.sisbenA,
      'SISBEN B': f.sisbenB,
      'SISBEN A+B': f.sisbenAB,
      'Hogares IMG': f.img,
      'Penetración %': f.penetracion,
      'Brecha (sin IMG)': f.brecha,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'IMG vs SISBEN');
    XLSX.writeFile(wb, `IMG_vs_SISBEN_Bogota_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalSisben = filas.reduce((s, f) => s + f.sisbenAB, 0);
  const totalImg = filas.reduce((s, f) => s + f.img, 0);
  const penTotal = totalSisben > 0 ? Math.round((totalImg / totalSisben) * 100) : 0;

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
      <h2 className="text-3xl font-bold mb-2 text-gray-800">Analisis Subsidios IMG - SISBEN IV</h2>
      <p className="text-sm text-gray-600 mb-1">Cobertura por localidad: hogares SISBEN A+B frente a hogares beneficiarios IMG.</p>
      <p className="text-xs text-gray-500 mb-6">Fuente: Geovisor SDIS (Mapa_base_includata) + SISBEN IV. Datos agregados por localidad, no individuales.</p>

      <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-3">
        <button onClick={cargar} disabled={cargando}
          className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400">
          {cargando ? 'Consultando SDIS...' : 'Cargar datos reales de las 20 localidades'}
        </button>
        <button onClick={exportar} disabled={filas.length === 0}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400">
          Exportar Excel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {cargado && filas.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total SISBEN A+B (Bogota)</p>
              <p className="text-2xl font-bold text-blue-600">{totalSisben.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Hogares IMG</p>
              <p className="text-2xl font-bold text-green-600">{totalImg.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Penetracion global</p>
              <p className="text-2xl font-bold text-orange-600">{penTotal}%</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Cobertura por localidad (ordenado por brecha)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="text-left py-2 px-2">Localidad</th>
                    <th className="text-right py-2 px-2">SISBEN A</th>
                    <th className="text-right py-2 px-2">SISBEN B</th>
                    <th className="text-right py-2 px-2">SISBEN A+B</th>
                    <th className="text-right py-2 px-2">Hogares IMG</th>
                    <th className="text-center py-2 px-2">Penetracion</th>
                    <th className="text-right py-2 px-2">Brecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-semibold">{f.localidad}</td>
                      <td className="py-2 px-2 text-right">{f.sisbenA.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right">{f.sisbenB.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-semibold text-blue-700">{f.sisbenAB.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-semibold text-green-700">{f.img.toLocaleString()}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={'px-2 py-1 rounded text-xs font-semibold ' + (f.penetracion >= 60 ? 'bg-green-100 text-green-800' : f.penetracion >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}>
                          {f.penetracion}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-orange-700">{f.brecha.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mt-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Nota sobre datos individuales</h3>
        <p className="text-sm text-yellow-800">Este modulo muestra conteos agregados por localidad (dato publico). La consulta por cedula individual (quien recibe y quien no) requiere solicitud formal PQRF a servicioalciudadano@sdis.gov.co bajo Ley 1712, por tratarse de datos personales protegidos.</p>
      </div>
    </div>
  );
}
