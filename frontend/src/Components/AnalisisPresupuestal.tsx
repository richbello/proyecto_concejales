import React, { useState } from "react";
import ExcelJS from "exceljs";
import ChartDataLabels from "chartjs-plugin-datalabels";

interface RowData {
  [key: string]: any;
}

const AnalisisPresupuestal: React.FC = () => {
  const [data, setData] = useState<RowData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [labelField, setLabelField] = useState<string>("");
  const [valueField1, setValueField1] = useState<string>("");
  const [valueField2, setValueField2] = useState<string>("");
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Leer Excel
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(cell.value?.toString() || "");
    });

    const rows: RowData[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData: RowData = {};
      row.eachCell((cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });
      rows.push(rowData);
    });

    setHeaders(headers);
    setData(rows);
  };

  // Dibujar gráficas
  const renderCharts = () => {
    const Chart = (window as any).Chart;
    if (!Chart) {
      alert("Chart.js no está cargado. Revisa tu index.html");
      return;
    }

    Chart.register(ChartDataLabels);

    ["chartBar", "chartLine", "chartPie"].forEach(id => {
      const existing = Chart.getChart(id);
      if (existing) existing.destroy();
    });

    if (!labelField || !valueField1 || !valueField2) {
      alert("Debes seleccionar 3 variables: etiquetas, valores 1 y valores 2");
      return;
    }

    const labels = data.map(r => r[labelField]?.toString() || "Sin dato");
    const valores1 = data.map(r => Number(r[valueField1]) || 0);
    const valores2 = data.map(r => Number(r[valueField2]) || 0);
    const porcentajes = valores1.map((v, i) => v > 0 ? (valores2[i] / v) * 100 : 0);

    const textColor = darkMode ? "#ecf0f1" : "#2c3e50";
    const bgTooltip = darkMode ? "rgba(0,0,0,0.8)" : "rgba(44,62,80,0.9)";

    // Barras comparativas
    new Chart(document.getElementById("chartBar"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: valueField1, data: valores1, backgroundColor: "#3A6EA5" },
          { label: valueField2, data: valores2, backgroundColor: "#2ECC71" }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: textColor } },
          tooltip: { backgroundColor: bgTooltip, titleColor: "#fff", bodyColor: "#fff" },
          datalabels: {
            color: textColor,
            anchor: "end",
            align: "top",
            formatter: (val: number) => val.toLocaleString("es-CO")
          }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: "#eee" } },
          y: { ticks: { color: textColor }, grid: { color: "#eee" } }
        }
      }
    });

    // Línea de % Ejecución
    new Chart(document.getElementById("chartLine"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "% Ejecución",
          data: porcentajes,
          borderColor: "#E74C3C",
          backgroundColor: "rgba(231,76,60,0.3)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#E74C3C"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: bgTooltip, bodyColor: "#fff" },
          datalabels: {
            color: textColor,
            anchor: "end",
            align: "top",
            formatter: (val: number) => val.toFixed(1) + "%"
          }
        },
        scales: {
          y: { ticks: { color: textColor } },
          x: { ticks: { color: textColor } }
        }
      }
    });

    // Doughnut con % etiquetas
    new Chart(document.getElementById("chartPie"), {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          label: "% Ejecución",
          data: porcentajes,
          backgroundColor: ["#3A6EA5","#2ECC71","#F1C40F","#E74C3C","#9B59B6","#16A085"],
          borderColor: "#fff",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: { position: "right", labels: { color: textColor } },
          datalabels: {
            color: "#fff",
            formatter: (val: number) => val.toFixed(1) + "%"
          }
        }
      }
    });
  };

  return (
    <div className={`dashboard ${darkMode ? "dark" : ""}`}>
      <h2>📊 Dashboard Presupuestal Avanzado</h2>
      <input type="file" accept=".xlsx" onChange={handleFileUpload} style={{ marginBottom: 20 }} />

      {data.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label>Etiquetas (X): </label>
          <select value={labelField} onChange={e => setLabelField(e.target.value)}>
            <option value="">-- Seleccione --</option>
            {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
          </select>

          <label style={{ marginLeft: 20 }}>Valores 1 (Y1): </label>
          <select value={valueField1} onChange={e => setValueField1(e.target.value)}>
            <option value="">-- Seleccione --</option>
            {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
          </select>

          <label style={{ marginLeft: 20 }}>Valores 2 (Y2): </label>
          <select value={valueField2} onChange={e => setValueField2(e.target.value)}>
            <option value="">-- Seleccione --</option>
            {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
          </select>

          <button onClick={renderCharts}>🎨 Generar gráficas</button>
          <button onClick={() => setDarkMode(!darkMode)} style={{ marginLeft: 10 }}>
            {darkMode ? "☀️ Modo Claro" : "🌙 Modo Oscuro"}
          </button>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:"25px", marginTop:20 }}>
        <div style={{ height:"220px" }}><canvas id="chartBar"></canvas></div>
        <div style={{ height:"220px" }}><canvas id="chartLine"></canvas></div>
        <div style={{ height:"220px" }}><canvas id="chartPie"></canvas></div>
      </div>
    </div>
  );
};

export default AnalisisPresupuestal;















