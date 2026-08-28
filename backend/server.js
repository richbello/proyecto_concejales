const express = require("express");
const { spawn } = require("child_process");
const app = express();
const PORT = 4000;

app.post("/api/vfi/analizar", (req, res) => {
  const entidad = req.query.entidad || "USME";
  const python = spawn("python3", ["motor_vfi.py", entidad]);
  let data = "";
  python.stdout.on("data", (chunk) => { data += chunk.toString(); });
  python.on("close", () => {
    try { res.json(JSON.parse(data)); }
    catch (e) { res.json({ error: "Error VFI" }); }
  });
});

app.get("/api/proyectos", (req, res) => {
  res.json([
    { nombre: "Parque Central", estado: "En ejecución", avance: 45 },
    { nombre: "Colegio Nuevo", estado: "Planeado", avance: 0 }
  ]);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
