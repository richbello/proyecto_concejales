p = "server.js"
c = open(p, encoding="utf-8").read()

endpoint = """
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
    const lines = chunk.toString().split("\\n");
    for (const line of lines) {
      const t = line.trim();
      if (t) res.write(`event: progress\\ndata: ${JSON.stringify(t)}\\n\\n`);
    }
  });
  python.stdout.on("data", (chunk) => { jsonData += chunk.toString(); });
  python.on("close", () => {
    try {
      const result = JSON.parse(jsonData);
      res.write(`event: done\\ndata: ${JSON.stringify(result)}\\n\\n`);
    } catch (e) {
      res.write(`event: error\\ndata: ${JSON.stringify({ error: "Error procesando" })}\\n\\n`);
    }
    res.end();
  });
});
"""

c = c.replace('app.get("/api/proyectos"', endpoint + '\napp.get("/api/proyectos"')
open(p, "w", encoding="utf-8").write(c)
print("OK - endpoint streaming agregado" if "analizar-stream" in c else "ERROR")
