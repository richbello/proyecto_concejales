import React, { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import dataSocial from '../data_social.json';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const ETARIOS = ['0-12', '13-17', '18-59', '60+'];
const ETARIO_LABEL: Record<string, string> = {
  '0-12': 'Niños (0-12)', '13-17': 'Adolescentes (13-17)',
  '18-59': 'Adultos (18-59)', '60+': 'Mayores (60+)',
};

interface Registro {
  localidad: string;
  total: number;
  img: number;
  por_tematica: Record<string, number>;
  por_servicio: Record<string, number>;
  por_sexo: Record<string, number>;
  discapacidad: number;
  victimas: number;
  lgbti: number;
  migrantes: number;
  etario: Record<string, number>;
}

const DATA = dataSocial as Registro[];

export default function AnalisisSocialModule() {
  const [tab, setTab] = useState('cobertura');
  const [loc, setLoc] = useState(DATA[0]?.localidad || '');

  const sel = DATA.find(x => x.localidad === loc) || DATA[0];
  const totalCiudad = DATA.reduce((s, x) => s + x.total, 0);
  const totalImg = DATA.reduce((s, x) => s + x.img, 0);
  const promImg = Math.round(totalImg / DATA.length);

  const exportar = () => {
    let rows: any[];
    if (tab === 'cobertura') {
      rows = DATA.map(x => ({
        Localidad: x.localidad,
        'Total atendidos': x.total,
        'IMG (Ingreso Minimo Garantizado)': x.img,
        '% IMG del total local': x.total ? Math.round((x.img / x.total) * 100) : 0,
      }));
    } else if (tab === 'vulnerables') {
      rows = DATA.map(x => ({
        Localidad: x.localidad, Total: x.total,
        Discapacidad: x.discapacidad, Victimas: x.victimas,
        LGBTI: x.lgbti, Migrantes: x.migrantes,
      }));
    } else if (tab === 'etario') {
      rows = DATA.map(x => {
        const r: any = { Localidad: x.localidad, Total: x.total };
        ETARIOS.forEach(e => { r[ETARIO_LABEL[e]] = x.etario[e] || 0; });
        return r;
      });
    } else {
      rows = DATA.map(x => {
        const r: any = { Localidad: x.localidad, Total: x.total };
        Object.keys(x.por_tematica).forEach(t => { r[t] = x.por_tematica[t]; });
        return r;
      });
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analisis Social');
    XLSX.writeFile(wb, `Analisis_Social_${tab}.xlsx`);
  };

  const btn = (id: string, txt: string) =>
    <button onClick={() => setTab(id)} className={tab === id
      ? 'px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm'
      : 'px-4 py-2 bg-white text-gray-700 rounded text-sm'}>{txt}</button>;

  // datos para graficas de la localidad seleccionada
  const gServicios = Object.entries(sel.por_servicio)
    .map(([k, v]) => ({ nombre: k.substring(0, 22), valor: v }))
    .sort((a, b) => b.valor - a.valor).slice(0, 8);
  const gSexo = Object.entries(sel.por_sexo).map(([name, value]) => ({ name, value }));
  const gTematica = Object.entries(sel.por_tematica)
    .map(([k, v]) => ({ tematica: k.substring(0, 20), valor: v }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
      <h2 className="text-3xl font-bold mb-1 text-gray-800">Análisis Social por Localidad</h2>
      <p className="text-xs text-gray-600 mb-1">Total atendidos por SDIS en Bogotá 2024: {totalCiudad.toLocaleString()} personas · IMG: {totalImg.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mb-4">Fuente: SDIS - Registro PUA anonimizado 2024. Datos reales agregados por localidad.</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {btn('cobertura', 'Cobertura IMG')}
        {btn('servicios', 'Servicios')}
        {btn('vulnerables', 'Poblaciones vulnerables')}
        {btn('etario', 'Grupo etario')}
        {btn('graficas', 'Gráficas')}
        <button onClick={exportar} className="px-4 py-2 bg-green-600 text-white rounded font-semibold text-sm">Exportar Excel</button>
      </div>

      {tab === 'cobertura' && (
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <p className="text-xs text-gray-600 mb-3">IMG = personas atendidas por Ingreso Mínimo Garantizado. El semáforo compara cada localidad con el promedio de la ciudad ({promImg.toLocaleString()}).</p>
          <table className="w-full text-xs">
            <thead className="bg-gray-200">
              <tr>
                <th className="text-left py-2 px-2">Localidad</th>
                <th className="text-right py-2 px-2">Total atendidos</th>
                <th className="text-right py-2 px-2">IMG</th>
                <th className="text-center py-2 px-2">% del total local</th>
                <th className="text-center py-2 px-2">vs promedio ciudad</th>
              </tr>
            </thead>
            <tbody>
              {DATA.map((x, i) => {
                const pct = x.total ? Math.round((x.img / x.total) * 100) : 0;
                const ratio = promImg ? x.img / promImg : 0;
                const semaforo = ratio >= 1 ? 'bg-green-100 text-green-800' : ratio >= 0.5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
                const etiqueta = ratio >= 1 ? 'Sobre promedio' : ratio >= 0.5 ? 'Bajo promedio' : 'Muy bajo';
                return (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 font-semibold">{x.localidad}</td>
                    <td className="py-2 px-2 text-right text-blue-700">{x.total.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right font-bold text-green-700">{x.img.toLocaleString()}</td>
                    <td className="py-2 px-2 text-center">{pct}%</td>
                    <td className="py-2 px-2 text-center"><span className={`${semaforo} px-2 py-1 rounded font-semibold`}>{etiqueta}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'servicios' && (
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-200">
              <tr>
                <th className="text-left py-2 px-2">Localidad</th>
                <th className="text-right py-2 px-2">Total</th>
                <th className="text-right py-2 px-2">IMG</th>
                <th className="text-right py-2 px-2">Comisarías</th>
                <th className="text-right py-2 px-2">Vejez</th>
                <th className="text-right py-2 px-2">Infancia</th>
                <th className="text-right py-2 px-2">Jóvenes</th>
              </tr>
            </thead>
            <tbody>
              {DATA.map((x, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2 font-semibold">{x.localidad}</td>
                  <td className="py-2 px-2 text-right font-bold text-blue-700">{x.total.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">{(x.por_tematica['INGRESO MINIMO GARANTIZADO'] || 0).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">{(x.por_tematica['COMISARIAS'] || 0).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">{(x.por_tematica['VEJEZ'] || 0).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">{(x.por_tematica['INFANCIA'] || 0).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">{(x.por_tematica['JÓVENES'] || 0).toLocaleString()}</td>
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
                <th className="text-right py-2 px-2">Víctimas</th>
                <th className="text-right py-2 px-2">LGBTI</th>
                <th className="text-right py-2 px-2">Migrantes</th>
              </tr>
            </thead>
            <tbody>
              {DATA.map((x, i) => (
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
                {ETARIOS.map(e => <th key={e} className="text-right py-2 px-2">{ETARIO_LABEL[e]}</th>)}
              </tr>
            </thead>
            <tbody>
              {DATA.map((x, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2 font-semibold">{x.localidad}</td>
                  <td className="py-2 px-2 text-right font-bold text-blue-700">{x.total.toLocaleString()}</td>
                  {ETARIOS.map(e => <td key={e} className="py-2 px-2 text-right">{(x.etario[e] || 0).toLocaleString()}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'graficas' && (
        <div>
          <div className="mb-4">
            <select value={loc} onChange={e => setLoc(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              {DATA.map(x => <option key={x.localidad} value={x.localidad}>{x.localidad} ({x.total.toLocaleString()})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm font-semibold mb-2">Servicios más atendidos</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gServicios} margin={{ top: 10, right: 20, left: 0, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={90} fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="valor" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm font-semibold mb-2">Distribución por sexo</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={gSexo} cx="50%" cy="50%" labelLine={false}
                    label={({ name, value }) => `${name}: ${(value as number).toLocaleString()}`}
                    outerRadius={90} dataKey="value">
                    {gSexo.map((e, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-4 rounded shadow lg:col-span-2">
              <h3 className="text-sm font-semibold mb-2">Temáticas de atención</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gTematica} layout="vertical" margin={{ top: 10, right: 20, left: 140, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={10} />
                  <YAxis dataKey="tematica" type="category" width={130} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="valor" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}