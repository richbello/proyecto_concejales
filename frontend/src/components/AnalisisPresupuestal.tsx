import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import { Upload, Download, Filter, X } from 'lucide-react';

interface DataRow {
  [key: string]: string | number;
}

interface FilterState {
  [key: string]: string[];
}

const AnalisisPresupuestal: React.FC = () => {
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [activeFilters, setActiveFilters] = useState<FilterState>({});
  const [fileName, setFileName] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'resumen' | 'detalle' | 'comparativa'>('resumen');

  // Columnas clave para análisis presupuestal
  const keyColumns = [
    'Valor CRP',
    'Valor Neto',
    'Anulaciones',
    'Reintegros',
    'Rubro',
    'Descripción del Rubro',
    'Fondos',
    'Decripción Concepto Gasto',
    'Nombre BP Beneficiario',
    'Tipo de compromiso',
    'EJECUCION %'
  ];

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as DataRow[];

        setData(jsonData);
        const cols = Object.keys(jsonData[0] || {});
        setColumns(cols);

        // Inicializar filtros
        const initialFilters: FilterState = {};
        keyColumns.forEach((col) => {
          if (cols.includes(col)) {
            const uniqueValues = Array.from(
              new Set(jsonData.map((row) => String(row[col])))
            ).sort();
            initialFilters[col] = [];
          }
        });
        setFilters(initialFilters);
        setActiveFilters({});
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
        alert('Error al procesar el archivo Excel');
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const filteredData = useMemo(() => {
    if (data.length === 0) return [];

    return data.filter((row) => {
      return Object.entries(activeFilters).every(([col, values]) => {
        if (values.length === 0) return true;
        return values.includes(String(row[col]));
      });
    });
  }, [data, activeFilters]);

  const handleFilterChange = useCallback((column: string, value: string, checked: boolean) => {
    setActiveFilters((prev) => {
      const updated = { ...prev };
      if (!updated[column]) updated[column] = [];

      if (checked) {
        if (!updated[column].includes(value)) {
          updated[column].push(value);
        }
      } else {
        updated[column] = updated[column].filter((v) => v !== value);
      }

      if (updated[column].length === 0) {
        delete updated[column];
      }

      return updated;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  // Análisis por Rubro
  const rubroAnalysis = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredData.forEach((row) => {
      const rubro = String(row['Descripción del Rubro'] || 'Sin clasificar');
      const valor = parseFloat(String(row['Valor Neto'] || 0).replace(/[^0-9.-]/g, '')) || 0;
      grouped[rubro] = (grouped[rubro] || 0) + valor;
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  // Análisis por Fondo
  const fondoAnalysis = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredData.forEach((row) => {
      const fondo = String(row['Fondos'] || 'Sin clasificar');
      const valor = parseFloat(String(row['Valor Neto'] || 0).replace(/[^0-9.-]/g, '')) || 0;
      grouped[fondo] = (grouped[fondo] || 0) + valor;
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Análisis por Tipo de Compromiso
  const tipoCompromisoAnalysis = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredData.forEach((row) => {
      const tipo = String(row['Tipo de compromiso'] || 'Sin clasificar');
      const valor = parseFloat(String(row['Valor Neto'] || 0).replace(/[^0-9.-]/g, '')) || 0;
      grouped[tipo] = (grouped[tipo] || 0) + valor;
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Análisis de Ejecución
  const ejecucionAnalysis = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    filteredData.forEach((row) => {
      const rubro = String(row['Descripción del Rubro'] || 'Sin clasificar');
      const ejecucion = parseFloat(String(row['EJECUCION %'] || 0)) || 0;
      const valor = parseFloat(String(row['Valor Neto'] || 0).replace(/[^0-9.-]/g, '')) || 0;

      if (!grouped[rubro]) {
        grouped[rubro] = { total: 0, count: 0 };
      }
      grouped[rubro].total += ejecucion;
      grouped[rubro].count += 1;
    });

    return Object.entries(grouped)
      .map(([name, data]) => ({
        name,
        ejecucion: parseFloat((data.total / data.count).toFixed(2))
      }))
      .sort((a, b) => b.ejecucion - a.ejecucion)
      .slice(0, 10);
  }, [filteredData]);

  // Estadísticas generales
  const stats = useMemo(() => {
    const totalValor = filteredData.reduce(
      (sum, row) => sum + (parseFloat(String(row['Valor Neto'] || 0).replace(/[^0-9.-]/g, '')) || 0),
      0
    );

    const totalAnulaciones = filteredData.reduce(
      (sum, row) => sum + (parseFloat(String(row['Anulaciones'] || 0).replace(/[^0-9.-]/g, '')) || 0),
      0
    );

    const promEjecucion =
      filteredData.length > 0
        ? filteredData.reduce((sum, row) => sum + (parseFloat(String(row['EJECUCION %'] || 0)) || 0), 0) /
          filteredData.length
        : 0;

    return {
      totalValor,
      totalAnulaciones,
      promEjecucion: parseFloat(promEjecucion.toFixed(2)),
      registros: filteredData.length
    };
  }, [filteredData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Análisis Presupuestal Avanzado</h2>
        <p className="text-slate-600">Carga y analiza datos presupuestales con filtros dinámicos</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Cargar archivo Excel
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
            </div>
          </div>
          {fileName && (
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{fileName}</p>
              <p className="text-xs text-slate-500">{filteredData.length} registros cargados</p>
            </div>
          )}
        </div>
      </div>

      {data.length > 0 && (
        <>
          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Filtros Dinámicos
              </h3>
              {Object.keys(activeFilters).length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {keyColumns.map((col) => {
                if (!columns.includes(col)) return null;

                const uniqueValues = Array.from(
                  new Set(data.map((row) => String(row[col])))
                ).sort();

                if (uniqueValues.length > 50) return null;

                return (
                  <div key={col} className="border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">{col}</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uniqueValues.map((value) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={(activeFilters[col] || []).includes(value)}
                            onChange={(e) => handleFilterChange(col, value, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-slate-700">{value}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
              <p className="text-sm text-slate-600 mb-2">Valor Total Neto</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalValor)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
              <p className="text-sm text-slate-600 mb-2">Total Anulaciones</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalAnulaciones)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
              <p className="text-sm text-slate-600 mb-2">Ejecución Promedio</p>
              <p className="text-2xl font-bold text-green-600">{stats.promEjecucion.toFixed(2)}%</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-600">
              <p className="text-sm text-slate-600 mb-2">Registros Filtrados</p>
              <p className="text-2xl font-bold text-purple-600">{stats.registros}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="flex border-b border-slate-200">
              {(['resumen', 'detalle', 'comparativa'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`flex-1 py-4 px-6 text-sm font-semibold transition-colors ${
                    selectedTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {tab === 'resumen' && 'Resumen Gráfico'}
                  {tab === 'detalle' && 'Análisis Detallado'}
                  {tab === 'comparativa' && 'Análisis Comparativo'}
                </button>
              ))}
            </div>

            <div className="p-6">
              {selectedTab === 'resumen' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart - Fondos */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Distribución por Fondos</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={fondoAnalysis}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name.substring(0, 15)}: ${formatCurrency(value)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {fondoAnalysis.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart - Tipo de Compromiso */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Valor por Tipo de Compromiso</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={tipoCompromisoAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => `$${(value / 1e9).toFixed(1)}B`} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {selectedTab === 'detalle' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart - Rubros */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Top 10 Rubros por Valor</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={rubroAnalysis} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tickFormatter={(value) => `$${(value / 1e9).toFixed(1)}B`} />
                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Line Chart - Ejecución */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Porcentaje de Ejecución por Rubro</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={ejecucionAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                        <YAxis label={{ value: 'Ejecución %', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => `${(value as number).toFixed(2)}%`} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="ejecucion"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ fill: '#f59e0b', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {selectedTab === 'comparativa' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Comparativa: Valor vs Ejecución</h4>
                    <ResponsiveContainer width="100%" height={400}>
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="value" name="Valor Neto" tickFormatter={(value) => `$${(value / 1e9).toFixed(1)}B`} />
                        <YAxis dataKey="ejecucion" name="Ejecución %" />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(value, name) => {
                            if (name === 'Valor Neto') return formatCurrency(value as number);
                            return `${(value as number).toFixed(2)}%`;
                          }}
                        />
                        <Scatter
                          name="Rubros"
                          data={rubroAnalysis.map((item, idx) => ({
                            ...item,
                            ejecucion: ejecucionAnalysis[idx]?.ejecucion || 0,
                            value: item.value
                          }))}
                          fill="#8b5cf6"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Resumen de Fondos</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-200">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">Fondo</th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-700">Valor Total</th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-700">% del Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fondoAnalysis.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-4 py-2 text-slate-700">{item.name}</td>
                              <td className="px-4 py-2 text-right text-slate-700">{formatCurrency(item.value)}</td>
                              <td className="px-4 py-2 text-right text-slate-700">
                                {((item.value / stats.totalValor) * 100).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {data.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Download className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Carga un archivo Excel para comenzar el análisis</p>
        </div>
      )}
    </div>
  );
};

export default AnalisisPresupuestal;
