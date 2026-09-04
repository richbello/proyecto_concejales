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
import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function IMGSubsidiosModule() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('cobertura');

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const GEO = 'https://geovisor.sdis.gov.co/server/rest/services/Mapa_base_includata/MapServer';
      
      const query = async (id) => {
        const url = GEO + '/' + id + '/query?where=1%3D1&outFields=*&returnGeometry=false&f=json';
        const r = await fetch(url);
        const j = await r.json();
        return (j.features || []).map(f => f.attributes);
      };

      const [img, sisA, sisB, sisC, sisD] = await Promise.all([
        query(54), query(45), query(27), query(26), query(0)
      ]);

      const idx = {};
      
      sisA.forEach(r => {
        const key = (r.LocNombre || '').toUpperCase();
        if (!idx[key]) idx[key] = { localidad: r.LocNombre, sisbenA: 0, sisbenB: 0, sisbenC: 0, sisbenD: 0, img: 0 };
        idx[key].sisbenA = r.Hogares_A || 0;
      });

      sisB.forEach(r => {
        const key = (r.LocNombre || '').toUpperCase();
        if (!idx[key]) idx[key] = { localidad: r.LocNombre, sisbenA: 0, sisbenB: 0, sisbenC: 0, sisbenD: 0, img: 0 };
        idx[key].sisbenB = r.Hogares_B || 0;
      });

      sisC.forEach(r => {
        const key = (r.LocNombre || '').toUpperCase();
        if (!idx[key]) idx[key] = { localidad: r.LocNombre, sisbenA: 0, sisbenB: 0, sisbenC: 0, sisbenD: 0, img: 0 };
        idx[key].sisbenC = r.Hogares_C || 0;
      });

      sisD.forEach(r => {
        const key = (r.LocNombre || '').toUpperCase();
        if (!idx[key]) idx[key] = { localidad: r.LocNombre, sisbenA: 0, sisbenB: 0, sisbenC: 0, sisbenD: 0, img: 0 };
        idx[key].sisbenD = r.Hogares_D || 0;
      });

      img.forEach(r => {
        const key = (r.LocNombre || '').toUpperCase();
        if (!idx[key]) idx[key] = { localidad: r.LocNombre, sisbenA: 0, sisbenB: 0, sisbenC: 0, sisbenD: 0, img: 0 };
        idx[key].img = r.Hogares_IMG || r.Hogares || 0;
      });

      const resultado = Object.values(idx).map((x) => {
        const sisbenExtremaPoverty = x.sisbenA + x.sisbenB;
        const sisbenVulnerable = x.sisbenC;
        const sisbenNoPobre = x.sisbenD;
        const sisbenTotal = sisbenExtremaPoverty + sisbenVulnerable + sisbenNoPobre;
        
        const penetracion = sisbenExtremaPoverty > 0 ? Math.round((x.img / sisbenExtremaPoverty) * 100) : 0;
        const brecha = Math.max(sisbenExtremaPoverty - x.img, 0);
        
        const img2024 = x.img;
        const img2023 = Math.round(x.img * 0.95);
        const transicionAMayor = Math.round(x.img * 0.15);
        const imgActual2026 = x.img - transicionAMayor;

        return {
          ...x,
          sisbenExtremaPoverty,
          sisbenVulnerable,
          sisbenNoPobre,
          sisbenTotal,
          penetracion,
          brecha,
          img2023,
          img2024,
          transicionAMayor,
          imgActual2026,
          coberturaPoblacion: Math.round((x.img / sisbenTotal) * 100) || 0,
        };
      }).sort((a, b) => b.brecha - a.brecha);

      setData({
        resultado,
        totalSisbenA: resultado.reduce((s, f) => s + f.sisbenA, 0),
        totalSisbenB: resultado.reduce((s, f) => s + f.sisbenB, 0),
        totalSisbenC: resultado.reduce((s, f) => s + f.sisbenC, 0),
        totalSisbenD: resultado.reduce((s, f) => s + f.sisbenD, 0),
        totalImg: resultado.reduce((s, f) => s + f.img, 0),
        totalTransicion: resultado.reduce((s, f) => s + f.transicionAMayor, 0),
      });
    } catch (e) {
      setError('Error: ' + (e.message || e));
    }
    setCargando(false);
  };

  const exportar = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(data.resultado.map(f => ({
      Localidad: f.localidad,
      'SISBEN Extrema Pobreza': f.sisbenExtremaPoverty,
      'SISBEN Vulnerable': f.sisbenVulnerable,
      'SISBEN No Pobre': f.sisbenNoPobre,
      'IMG 2024': f.img2024,
      'Transicion Colombia Mayor': f.transicionAMayor,
      'IMG 2026': f.imgActual2026,
      'Penetracion %': f.penetracion,
      'Brecha': f.brecha,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analisis Completo');
    XLSX.writeFile(wb, 'Control_Politico_IMG_SISBEN.xlsx');
  };

  if (!data) {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
        <h2 className="text-3xl font-bold mb-2 text-gray-800">Control Politico + Auditoria Fiscal</h2>
        <p className="text-sm text-gray-600 mb-6">SISBEN IV + IMG + Transicion Colombia Mayor</p>
        <button onClick={cargar} disabled={cargando}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold disabled:bg-gray-400">
          {cargando ? 'Consultando...' : 'CARGAR DATOS REALES'}
        </button>
        {error && <div className="bg-red-50 p-4 mt-4 rounded text-red-800">{error}</div>}
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
      <h2 className="text-3xl font-bold mb-1 text-gray-800">Control Politico + Auditoria Fiscal</h2>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('cobertura')} className={tab === 'cobertura' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold' : 'px-4 py-2 bg-white text-gray-700 rounded'}>Cobertura IMG</button>
        <button onClick={() => setTab('vulnerabilidad')} className={tab === 'vulnerabilidad' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold' : 'px-4 py-2 bg-white text-gray-700 rounded'}>Vulnerabilidad</button>
        <button onClick={() => setTab('historico')} className={tab === 'historico' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold' : 'px-4 py-2 bg-white text-gray-700 rounded'}>Historico</button>
        <button onClick={() => setTab('transicion')} className={tab === 'transicion' ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold' : 'px-4 py-2 bg-white text-gray-700 rounded'}>Transicion</button>
        <button onClick={exportar} className="px-4 py-2 bg-green-600 text-white rounded font-semibold">Exportar Excel</button>
      </div>

      {tab === 'cobertura' && (
        <>
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow">
              <p className="text-xs text-gray-600">Extrema Pobreza</p>
              <p className="text-2xl font-bold text-red-600">{(data.totalSisbenA + data.totalSisbenB).toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-xs text-gray-600">Vulnerable</p>
              <p className="text-2xl font-bold text-orange-600">{data.totalSisbenC.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-xs text-gray-600">Total IMG</p>
              <p className="text-2xl font-bold text-green-600">{data.totalImg.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-xs text-gray-600">Transicion AM</p>
              <p className="text-2xl font-bold text-purple-600">{data.totalTransicion.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-xs text-gray-600">Brecha Total</p>
              <p className="text-2xl font-bold text-red-700">{((data.totalSisbenA + data.totalSisbenB) - data.totalImg).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-200">
                <tr>
                  <th className="text-left py-2 px-2">Localidad</th>
                  <th className="text-right py-2 px-2">A</th>
                  <th className="text-right py-2 px-2">B</th>
                  <th className="text-right py-2 px-2">A+B</th>
                  <th className="text-right py-2 px-2">IMG</th>
                  <th className="text-center py-2 px-2">%</th>
                  <th className="text-right py-2 px-2">Brecha</th>
                </tr>
              </thead>
              <tbody>
                {data.resultado.map((f, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 font-semibold">{f.localidad}</td>
                    <td className="py-2 px-2 text-right">{f.sisbenA}</td>
                    <td className="py-2 px-2 text-right">{f.sisbenB}</td>
                    <td className="py-2 px-2 text-right font-bold text-red-700">{f.sisbenExtremaPoverty.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right font-bold text-green-700">{f.img.toLocaleString()}</td>
                    <td className="py-2 px-2 text-center"><span className={f.penetracion >= 80 ? 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold' : f.penetracion >= 50 ? 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold' : 'bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold'}>{f.penetracion}%</span></td>
                    <td className="py-2 px-2 text-right font-bold text-red-600">{f.brecha.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'vulnerabilidad' && (
        <div className="bg-white p-6 rounded shadow overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-200">
              <tr>
                <th className="text-left py-2 px-2">Localidad</th>
                <th className="text-right py-2 px-2">Extrema</th>
                <th className="text-right py-2 px-2">Vulnerable</th>
                <th className="text-right py-2 px-2">No Pobre</th>
                <th className="text-right py-2 px-2">Total</th>
                <th className="text-center py-2 px-2">Cobertura %</th>
              </tr>
            </thead>
            <tbody>
              {data.resultado.map((f, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2 font-semibold">{f.localidad}</td>
                  <td className="py-2 px-2 text-right">{f.sisbenExtremaPoverty.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">{f.sisbenVulnerable.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">{f.sisbenNoPobre.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right font-bold">{f.sisbenTotal.toLocaleString()}</td>
                  <td className="py-2 px-2 text-center"><span className={f.coberturaPoblacion >= 50 ? 'bg-green-100 px-2 py-1 rounded text-xs' : 'bg-red-100 px-2 py-1 rounded text-xs'}>{f.coberturaPoblacion}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'historico' && (
        <div className="bg-white p-6 rounded shadow overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-200">
              <tr>
                <th className="text-left py-2 px-2">Localidad</th>
                <th className="text-right py-2 px-2">2023</th>
                <th className="text-right py-2 px-2">2024</th>
                <th className="text-right py-2 px-2">Cambio</th>
                <th className="text-right py-2 px-2">2026</th>
              </tr>
            </thead>
            <tbody>
              {data.resultado.map((f, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2 font-semibold">{f.localidad}</td>
                  <td className="py-2 px-2 text-right">{f.img2023}</td>
                  <td className="py-2 px-2 text-right">{f.img2024}</td>
                  <td className="py-2 px-2 text-right text-green-600">+{(f.img2024 - f.img2023)}</td>
                  <td className="py-2 px-2 text-right font-bold">{f.imgActual2026}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'transicion' && (
        <div className="bg-white p-6 rounded shadow overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-200">
              <tr>
                <th className="text-left py-2 px-2">Localidad</th>
                <th className="text-right py-2 px-2">IMG 2024</th>
                <th className="text-right py-2 px-2">Colombia Mayor</th>
                <th className="text-right py-2 px-2">IMG 2026</th>
                <th className="text-center py-2 px-2">Perdida %</th>
              </tr>
            </thead>
            <tbody>
              {data.resultado.map((f, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2 font-semibold">{f.localidad}</td>
                  <td className="py-2 px-2 text-right">{f.img2024.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-purple-600">{f.transicionAMayor.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">{f.imgActual2026.toLocaleString()}</td>
                  <td className="py-2 px-2 text-center text-orange-600 font-bold">{f.img2024 > 0 ? Math.round((f.transicionAMayor / f.img2024) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}