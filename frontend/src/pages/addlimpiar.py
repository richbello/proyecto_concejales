p = "VigilanciaFiscal.tsx"
c = open(p, encoding="utf-8").read()

# 1. Agregar funcion limpiar despues de buscarDoc
if "const limpiar" not in c:
    funcion = """
  const limpiar = () => {
    setResultado(null);
    setDocResult(null);
    setDocBusca('');
    setBusqueda('');
    setFiltro('TODAS');
    setAbierta(null);
  };
"""
    c = c.replace(
        "  const alertas = (resultado?.alertas || [])",
        funcion + "\n  const alertas = (resultado?.alertas || [])"
    )

# 2. Agregar boton Limpiar junto a Analizar
old_btn = """          <button onClick={analizar} disabled={loading}
            style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 26px', fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
            {loading ? 'Analizando…' : 'Analizar'}
          </button>"""

new_btn = """          <button onClick={analizar} disabled={loading}
            style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 26px', fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
            {loading ? 'Analizando…' : 'Analizar'}
          </button>
          <button onClick={limpiar}
            style={{ background: '#f1f5f9', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: 9, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Limpiar
          </button>"""

c = c.replace(old_btn, new_btn)
open(p, "w", encoding="utf-8").write(c)
print("OK - boton limpiar agregado" if "limpiar" in c else "ERROR")
