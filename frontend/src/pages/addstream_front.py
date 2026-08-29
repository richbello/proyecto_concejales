p = "VigilanciaFiscal.tsx"
c = open(p, encoding="utf-8").read()

# 1. Agregar estados de progreso despues de docLoading
if "progreso" not in c:
    c = c.replace(
        "const [docLoading, setDocLoading] = useState(false);",
        "const [docLoading, setDocLoading] = useState(false);\n  const [progreso, setProgreso] = useState<string[]>([]);\n  const [cronometro, setCronometro] = useState(0);"
    )

# 2. Reemplazar la funcion analizar por la version con streaming
old_analizar = """  const analizar = async () => {
    setLoading(true); setAbierta(null);
    try {
      const r = await fetch(`http://localhost:4000/api/vfi/analizar?entidad=${encodeURIComponent(entidad)}`, { method: 'POST' });
      setResultado(await r.json());
    } catch { alert('Error conectando al backend. Verifica que el servidor (puerto 4000) esté corriendo.'); }
    setLoading(false);
  };"""

new_analizar = """  const analizar = () => {
    setLoading(true); setAbierta(null); setResultado(null); setProgreso([]); setCronometro(0);
    const t0 = Date.now();
    const timer = setInterval(() => setCronometro(Math.floor((Date.now() - t0) / 1000)), 1000);
    const es = new EventSource(`http://localhost:4000/api/vfi/analizar-stream?entidad=${encodeURIComponent(entidad)}`);
    es.addEventListener('progress', (e: any) => {
      setProgreso(prev => [...prev, JSON.parse(e.data)]);
    });
    es.addEventListener('done', (e: any) => {
      setResultado(JSON.parse(e.data));
      setLoading(false); clearInterval(timer); es.close();
    });
    es.addEventListener('error', () => {
      alert('Error en el análisis. Verifica que el backend esté corriendo.');
      setLoading(false); clearInterval(timer); es.close();
    });
  };"""

c = c.replace(old_analizar, new_analizar)
open(p, "w", encoding="utf-8").write(c)
print("OK - analizar con streaming" if "EventSource" in c else "ERROR")
