const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const app = express();
const PORT = 4000;

app.use(cors());

app.post("/api/vfi/analizar", (req, res) => {
  const entidad = req.query.entidad || "USME";
  const max = req.query.max || 3500;
  
  const python = spawn("python", ["motor_cruce.py", entidad, String(max)]);
  let data = "";
  let error = "";
  
  python.stdout.on("data", (chunk) => {
    data += chunk.toString();
  });
  
  python.stderr.on("data", (chunk) => {
    error += chunk.toString();
  });
  
  python.on("close", (code) => {
    try {
      const result = JSON.parse(data);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Error VFI", details: error || e.message });
    }
  });
});


app.post("/api/vfi/buscar", (req, res) => {
  const doc = req.query.doc || "";
  const python = spawn("python", ["buscar_documento.py", String(doc)]);
  let data = "";
  let error = "";
  python.stdout.on("data", (chunk) => { data += chunk.toString(); });
  python.stderr.on("data", (chunk) => { error += chunk.toString(); });
  python.on("close", () => {
    try { res.json(JSON.parse(data)); }
    catch (e) { res.status(500).json({ error: "Error busqueda", details: error || e.message }); }
  });
});


app.get("/api/vfi/analizar-stream", (req, res) => {
  const entidad = req.query.entidad || "USME";
  const max = req.query.max || 3500;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const python = spawn("python", ["motor_cruce.py", entidad, String(max)]);
  let jsonData = "";

  python.stderr.on("data", (chunk) => {
    const lines = chunk.toString().split("\n");
    for (const line of lines) {
      const t = line.trim();
      if (t) res.write(`event: progress\ndata: ${JSON.stringify(t)}\n\n`);
    }
  });
  python.stdout.on("data", (chunk) => { jsonData += chunk.toString(); });
  python.on("close", () => {
    try {
      const result = JSON.parse(jsonData);
      res.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
    } catch (e) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Error procesando" })}\n\n`);
    }
    res.end();
  });
});

app.get("/api/proyectos", (req, res) => {
  res.json([
    { nombre: "Parque Central", estado: "En ejecución", avance: 45 }
  ]);
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
