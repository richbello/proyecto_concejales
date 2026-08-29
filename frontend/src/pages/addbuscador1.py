p = "VigilanciaFiscal.tsx"
c = open(p, encoding="utf-8").read()

# 1. Agregar estados para busqueda por documento (despues de const [abierta...])
if "docBusca" not in c:
    c = c.replace(
        "const [abierta, setAbierta] = useState<number | null>(null);",
        "const [abierta, setAbierta] = useState<number | null>(null);\n  const [docBusca, setDocBusca] = useState('');\n  const [docResult, setDocResult] = useState<any>(null);\n  const [docLoading, setDocLoading] = useState(false);"
    )

# 2. Agregar la funcion buscarDoc (despues de la funcion analizar)
funcion = """
  const buscarDoc = async () => {
    if (!docBusca.trim()) return;
    setDocLoading(true);
    setDocResult(null);
    try {
      const r = await fetch(`http://localhost:4000/api/vfi/buscar?doc=${encodeURIComponent(docBusca)}`, { method: 'POST' });
      const data = await r.json();
      setDocResult(data);
    } catch {
      alert('Error conectando al backend.');
    }
    setDocLoading(false);
  };
"""
c = c.replace("  const alertas = (resultado?.alertas || [])", funcion + "\n  const alertas = (resultado?.alertas || [])")

open(p, "w", encoding="utf-8").write(c)
print("OK - estados y funcion de busqueda agregados" if "buscarDoc" in c else "ERROR")
