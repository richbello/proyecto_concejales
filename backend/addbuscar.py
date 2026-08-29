p = "server.js"
c = open(p, encoding="utf-8").read()

endpoint = """
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
"""

# Insertar el endpoint justo antes de app.get("/api/proyectos"
c = c.replace('app.get("/api/proyectos"', endpoint + '\napp.get("/api/proyectos"')
open(p, "w", encoding="utf-8").write(c)
print("OK - endpoint /api/vfi/buscar agregado")
