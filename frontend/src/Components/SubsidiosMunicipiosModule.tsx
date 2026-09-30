import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SubsidiosMunicipiosModule = () => {
  const [selectedMunicipo, setSelectedMunicpio] = useState('Usme');
  const [activeTab, setActiveTab] = useState('cobertura');
  const [sisbenData, setSisbenData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Datos mock para demostración
  const municipiosData: Record<string, any> = {
    // BOGOTÁ - 20 localidades
    'Usme': { dept: 'Bogotá', total: 93579, sisben: 65230, grupos: { A: 12453, B: 28940, C: 18230, D: 5607 } },
    'Ciudad Bolívar': { dept: 'Bogotá', total: 152623, sisben: 108230, grupos: { A: 21540, B: 45230, C: 32890, D: 8570 } },
    'Bosa': { dept: 'Bogotá', total: 133673, sisben: 94450, grupos: { A: 18970, B: 39560, C: 28340, D: 7580 } },
    'Kennedy': { dept: 'Bogotá', total: 121075, sisben: 85670, grupos: { A: 17230, B: 36780, C: 24620, D: 7040 } },
    'Suba': { dept: 'Bogotá', total: 100911, sisben: 71230, grupos: { A: 14890, B: 30560, C: 19780, D: 6000 } },
    'San Cristóbal': { dept: 'Bogotá', total: 78989, sisben: 55870, grupos: { A: 11230, B: 23560, C: 15670, D: 5410 } },
    'Engativá': { dept: 'Bogotá', total: 72162, sisben: 50980, grupos: { A: 10230, B: 21890, C: 14560, D: 4300 } },
    'Rafael Uribe': { dept: 'Bogotá', total: 70030, sisben: 49560, grupos: { A: 9890, B: 21230, C: 14120, D: 4320 } },
    'Usaquén': { dept: 'Bogotá', total: 36587, sisben: 25890, grupos: { A: 5120, B: 11230, C: 7450, D: 2090 } },
    'Tunjuelito': { dept: 'Bogotá', total: 29278, sisben: 20710, grupos: { A: 4140, B: 8960, C: 5890, D: 1720 } },
    
    // CUNDINAMARCA
    'Soacha': { dept: 'Cundinamarca', total: 580000, sisben: 340000, grupos: { A: 68000, B: 142000, C: 102000, D: 28000 } },
    'Mosquera': { dept: 'Cundinamarca', total: 112000, sisben: 67200, grupos: { A: 13440, B: 28560, C: 20160, D: 5040 } },
    'Zipaquirá': { dept: 'Cundinamarca', total: 95000, sisben: 57000, grupos: { A: 11400, B: 24300, C: 17100, D: 4200 } },
    'Facatativá': { dept: 'Cundinamarca', total: 87000, sisben: 52200, grupos: { A: 10440, B: 22290, C: 15660, D: 4200 } },
    'Madrid': { dept: 'Cundinamarca', total: 68000, sisben: 40800, grupos: { A: 8160, B: 17640, C: 12360, D: 2640 } },
    'Funza': { dept: 'Cundinamarca', total: 62000, sisben: 37200, grupos: { A: 7440, B: 15960, C: 11160, D: 2640 } },
    'Cota': { dept: 'Cundinamarca', total: 48000, sisben: 28800, grupos: { A: 5760, B: 12240, C: 8640, D: 2160 } },
    'Cajicá': { dept: 'Cundinamarca', total: 55000, sisben: 33000, grupos: { A: 6600, B: 14100, C: 9900, D: 2400 } },
  };

  const muni = municipiosData[selectedMunicipo];

  const coberturaSisben = muni ? ((muni.sisben / muni.total) * 100).toFixed(1) : 0;
  const promedioCiudad = 72.5;
  const estado = coberturaSisben >= promedioCiudad ? '✓ Sobre promedio' : '⚠ Bajo promedio';
  const colorEstado = coberturaSisben >= promedioCiudad ? '#10b981' : '#ef4444';

  const gruposData = muni ? [
    { name: 'Grupo A (Extrema)', value: muni.grupos.A },
    { name: 'Grupo B (Moderada)', value: muni.grupos.B },
    { name: 'Grupo C (Vulnerable)', value: muni.grupos.C },
    { name: 'Grupo D (No pobre)', value: muni.grupos.D },
  ] : [];

  const coloresGrupos = ['#dc2626', '#f97316', '#eab308', '#22c55e'];

  const tablaDatos = [
    { localidad: selectedMunicipo, total: muni?.total || 0, sisben: muni?.sisben || 0, cobertura: `${coberturaSisben}%`, estado }
  ];

  return (
    <div style={{ padding: 24, fontFamily: "'Segoe UI', sans-serif", color: '#2c3e50' }}>
      
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 700 }}>11. Análisis Subsidios por Municipio</h1>
        <p style={{ margin: 0, color: '#666', fontSize: 14 }}>SISBEN cobertura y grupos vulnerables — Bogotá + Cundinamarca</p>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 14, fontWeight: 500 }}>Selecciona municipio:</label>
        <select 
          value={selectedMunicipo}
          onChange={(e) => setSelectedMunicpio(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4, fontSize: 14, cursor: 'pointer' }}
        >
          <optgroup label="BOGOTÁ (10 localidades)">
            <option>Usme</option>
            <option>Ciudad Bolívar</option>
            <option>Bosa</option>
            <option>Kennedy</option>
            <option>Suba</option>
            <option>San Cristóbal</option>
            <option>Engativá</option>
            <option>Rafael Uribe</option>
            <option>Usaquén</option>
            <option>Tunjuelito</option>
          </optgroup>
          <optgroup label="CUNDINAMARCA">
            <option>Soacha</option>
            <option>Mosquera</option>
            <option>Zipaquirá</option>
            <option>Facatativá</option>
            <option>Madrid</option>
            <option>Funza</option>
            <option>Cota</option>
            <option>Cajicá</option>
          </optgroup>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
        {[
          { id: 'cobertura', label: 'Cobertura SISBEN' },
          { id: 'grupos', label: 'Grupos de Riesgo' },
          { id: 'comparativa', label: 'Comparativa Regional' },
          { id: 'gráficas', label: 'Gráficas' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: activeTab === tab.id ? '#0d9488' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              borderRadius: '4px 4px 0 0'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'cobertura' && (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Cobertura SISBEN en {selectedMunicipo}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px 0' }}>Total población</p>
              <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{(muni?.total || 0).toLocaleString()}</p>
            </div>
            <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px 0' }}>Registrados SISBEN</p>
              <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#0d9488' }}>{(muni?.sisben || 0).toLocaleString()}</p>
            </div>
            <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px 0' }}>Cobertura %</p>
              <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{coberturaSisben}%</p>
            </div>
            <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px 0' }}>Estado</p>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: colorEstado }}>{estado}</p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Municipio</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>Población Total</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>Registrados SISBEN</th>
                <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Cobertura</th>
                <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {tablaDatos.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 12, fontSize: 13 }}>{row.localidad}</td>
                  <td style={{ padding: 12, fontSize: 13, textAlign: 'right' }}>{row.total.toLocaleString()}</td>
                  <td style={{ padding: 12, fontSize: 13, textAlign: 'right', color: '#0d9488', fontWeight: 500 }}>{row.sisben.toLocaleString()}</td>
                  <td style={{ padding: 12, fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{row.cobertura}</td>
                  <td style={{ padding: 12, fontSize: 13, textAlign: 'center', color: colorEstado, fontWeight: 600 }}>{row.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'grupos' && (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Distribución por Grupos de Riesgo SISBEN</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {gruposData.map((grupo, i) => (
              <div key={i} style={{ padding: 16, background: coloresGrupos[i], color: 'white', borderRadius: 8 }}>
                <p style={{ fontSize: 12, margin: '0 0 8px 0', opacity: 0.9 }}>{grupo.name}</p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{(grupo.value).toLocaleString()}</p>
                <p style={{ fontSize: 11, margin: '8px 0 0 0', opacity: 0.8 }}>
                  {((grupo.value / (muni?.sisben || 1)) * 100).toFixed(1)}% del SISBEN
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'comparativa' && (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Comparativa con Promedio Regional</h2>
          <div style={{ 
            padding: 16, 
            background: colorEstado === '#10b981' ? '#ecfdf5' : '#fef2f2', 
            borderLeft: `4px solid ${colorEstado}`,
            borderRadius: 4,
            marginBottom: 24
          }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: colorEstado }}>
              {colorEstado === '#10b981' 
                ? `✓ ${selectedMunicipo} tiene MAYOR cobertura que el promedio`
                : `⚠ ${selectedMunicipo} tiene MENOR cobertura que el promedio`
              }
            </p>
          </div>
        </div>
      )}

      {activeTab === 'gráficas' && (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 24 }}>Visualización Grupos SISBEN</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gruposData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0d9488" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SubsidiosMunicipiosModule;