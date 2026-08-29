p = "VigilanciaFiscal.tsx"
c = open(p, encoding="utf-8").read()

# 1. Quitar el boton Limpiar que quedo junto a Analizar
c = c.replace(
    """          <button onClick={limpiar}
            style={{ background: '#f1f5f9', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: 9, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Limpiar
          </button>""",
    ""
)

# 2. Agregar el boton Limpiar junto a "Buscar documento"
old = """          <button onClick={buscarDoc} disabled={docLoading}
            style={{ background: docLoading ? '#94a3b8' : 'linear-gradient(135deg,#059669,#047857)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 26px', fontWeight: 700, fontSize: 14, cursor: docLoading ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
            {docLoading ? 'Buscando…' : 'Buscar documento'}
          </button>"""

new = """          <button onClick={buscarDoc} disabled={docLoading}
            style={{ background: docLoading ? '#94a3b8' : 'linear-gradient(135deg,#059669,#047857)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 26px', fontWeight: 700, fontSize: 14, cursor: docLoading ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
            {docLoading ? 'Buscando…' : 'Buscar documento'}
          </button>
          <button onClick={limpiar}
            style={{ background: '#f1f5f9', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: 9, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Limpiar
          </button>"""

c = c.replace(old, new)
open(p, "w", encoding="utf-8").write(c)
print("OK - boton limpiar movido al buscador" if new in c else "ERROR - revisar")
