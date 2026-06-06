const express = require("express");
const app = express();
const PORT = 4000;

app.get("/api/proyectos", (req, res) => {
  res.json([
    { nombre: "Parque Central Soacha", estado: "En ejecución", avance: 45, coords: [4.586, -74.214] },
    { nombre: "Colegio Nuevo Horizonte", estado: "Planeado", avance: 0, coords: [4.61, -74.2] },
    { nombre: "Hospital Regional", estado: "Finalizado", avance: 100, coords: [4.59, -74.22] }
  ]);
});

app.get("/api/sesiones", (req, res) => {
  res.json([
    { fecha: "2026-06-01", tema: "Debate sobre presupuesto de salud" },
    { fecha: "2026-06-03", tema: "Control político a la Secretaría de Educación" },
    { fecha: "2026-06-05", tema: "Discusión sobre movilidad urbana" }
  ]);
});

app.get("/api/denuncias", (req, res) => {
  res.json([
    { ciudadano: "María López", descripcion: "Demora en la construcción del colegio en la comuna 3" },
    { ciudadano: "Carlos Pérez", descripcion: "Falta de iluminación en el parque central" },
    { ciudadano: "Ana Rodríguez", descripcion: "Contratos de mantenimiento sin ejecución visible" }
  ]);
});

app.get("/api/presupuesto", (req, res) => {
  res.json([
    { sector: "Salud", monto: 500000000 },
    { sector: "Educación", monto: 750000000 },
    { sector: "Infraestructura", monto: 1200000000 }
  ]);
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
