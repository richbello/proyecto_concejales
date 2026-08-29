p = "VigilanciaFiscal.tsx"
c = open(p, encoding="utf-8").read()

bloque = """
      {/* Buscador por documento */}
      <div style={{ background: \x27#fff\x27, border: \x271px solid #e2e8f0\x27, borderRadius: 14, padding: 18, marginBottom: 18, boxShadow: \x270 1px 3px rgba(0,0,0,.06)\x27 }}>
        <label style={{ display: \x27block\x27, fontSize: 11, fontWeight: 700, color: \x27#64748b\x27, textTransform: \x27uppercase\x27, letterSpacing: 0.5, marginBottom: 6 }}>Buscar persona o empresa por documento (cedula / NIT)</label>
        <div style={{ display: \x27flex\x27, gap: 12, flexWrap: \x27wrap\x27 }}>
          <input value={docBusca} onChange={e => setDocBusca(e.target.value)} onKeyDown={e => e.key === \x27Enter\x27 && buscarDoc()}
            placeholder="Ej: 51699228"
            style={{ flex: 1, minWidth: 220, padding: \x2711px 14px\x27, border: \x271.5px solid #cbd5e1\x27, borderRadius: 9, fontSize: 14, boxSizing: \x27border-box\x27 }} />
          <button onClick={buscarDoc} disabled={docLoading}
            style={{ background: docLoading ? \x27#94a3b8\x27 : \x27linear-gradient(135deg,#059669,#047857)\x27, color: \x27#fff\x27, border: \x27none\x27, borderRadius: 9, padding: \x2712px 26px\x27, fontWeight: 700, fontSize: 14, cursor: docLoading ? \x27default\x27 : \x27pointer\x27, whiteSpace: \x27nowrap\x27 }}>
            {docLoading ? \x27Buscando...\x27 : \x27Buscar documento\x27}
          </button>
        </div>
        {docResult && (
          <div style={{ marginTop: 14 }}>
            {docResult.total === 0 ? (
              <div style={{ padding: 14, background: \x27#f0fdf4\x27, border: \x271px solid #bbf7d0\x27, borderRadius: 9, color: \x27#166534\x27, fontSize: 13 }}>
                El documento {docResult.documento} no aparece en SIRI ni en el Boletin de Responsables Fiscales.
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: \x27#b91c1c\x27, marginBottom: 10 }}>
                  {docResult.total} antecedente(s) encontrado(s) para el documento {docResult.documento}
                </div>
                <div style={{ display: \x27grid\x27, gap: 10 }}>
                  {docResult.hallazgos.map((h: any, i: number) => (
                    <div key={i} style={{ padding: 14, background: \x27#fef2f2\x27, border: \x271px solid #fecaca\x27, borderRadius: 9 }}>
                      <div style={{ display: \x27flex\x27, justifyContent: \x27space-between\x27, flexWrap: \x27wrap\x27, gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{h.nombre || \x27(sin nombre)\x27}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: \x27#64748b\x27 }}>{h.fuente}</span>
                      </div>
                      <div style={{ fontSize: 13, color: \x27#334155\x27 }}><b>Sancion:</b> {h.sancion} {h.tipo ? `(${h.tipo})` : \x27\x27}</div>
                      {h.fecha && <div style={{ fontSize: 13, color: \x27#334155\x27 }}><b>Fecha:</b> {h.fecha}</div>}
                      {h.autoridad && <div style={{ fontSize: 12, color: \x27#64748b\x27, marginTop: 4 }}>{h.autoridad}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
"""

c = c.replace("      {resultado && (", bloque + "\n      {resultado && (", 1)
open(p, "w", encoding="utf-8").write(c)
print("OK - buscador visual agregado" if "Buscar documento" in c else "ERROR")
