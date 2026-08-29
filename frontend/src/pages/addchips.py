p = "VigilanciaFiscal.tsx"
c = open(p, encoding="utf-8").read()

# 1. Agregar campos a la interface Resultado
if "registros_siri" not in c:
    c = c.replace(
        "criticas: number; altas: number; medias: number; info: number; alertas: Alerta[];",
        "criticas: number; altas: number; medias: number; info: number; registros_siri?: number; registros_boletin?: number; alertas: Alerta[];"
    )

# 2. Agregar banda de fuentes debajo del subtitulo del header
old = """          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Cruce en tiempo real · SECOP II × SIRI (Procuraduría) × Boletín (Contraloría)</p>
        </div>
      </div>"""

new = """          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Cruce en tiempo real · SECOP II × SIRI (Procuraduría) × Boletín (Contraloría)</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <FuenteChip color="#2563eb" titulo="SECOP II" detalle="Contratación pública · tiempo real" />
        <FuenteChip color="#7c3aed" titulo="SIRI · Procuraduría" detalle={resultado?.registros_siri ? `${resultado.registros_siri.toLocaleString('es-CO')} registros disciplinarios` : 'Antecedentes disciplinarios · refresco periódico'} />
        <FuenteChip color="#ca8a04" titulo="Boletín · Contraloría" detalle={resultado?.registros_boletin ? `${resultado.registros_boletin.toLocaleString('es-CO')} responsables fiscales · trimestral` : 'Responsables fiscales · trimestral'} />
      </div>"""

c = c.replace(old, new)

# 3. Agregar el componente FuenteChip al final del archivo
if "function FuenteChip" not in c:
    componente = """
function FuenteChip({ color, titulo, detalle }: { color: string; titulo: string; detalle: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '10px 14px', flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color }}>{titulo}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{detalle}</div>
    </div>
  );
}
"""
    c = c.rstrip() + "\n" + componente

open(p, "w", encoding="utf-8").write(c)
print("OK - indicador de fuentes agregado" if "FuenteChip" in c else "ERROR")
