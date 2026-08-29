p = "VigilanciaFiscal.tsx"
c = open(p, encoding="utf-8").read()

# 1. Agregar import de ENTIDADES
if "from \x27./entidades\x27" not in c:
    c = c.replace(
        "import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from \x27recharts\x27;",
        "import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from \x27recharts\x27;\nimport { ENTIDADES } from \x27./entidades\x27;"
    )

# 2. Reemplazar el input por un select agrupado
old_input = """            <input value={entidad} onChange={e => setEntidad(e.target.value)} onKeyDown={e => e.key === \x27Enter\x27 && analizar()}
              placeholder="USME, IDU, SECRETARIA DE EDUCACION…"
              style={{ width: \x27100%\x27, padding: \x2711px 14px\x27, border: \x271.5px solid #cbd5e1\x27, borderRadius: 9, fontSize: 14, boxSizing: \x27border-box\x27 }} />"""

new_select = """            <select value={entidad} onChange={e => setEntidad(e.target.value)}
              style={{ width: \x27100%\x27, padding: \x2711px 14px\x27, border: \x271.5px solid #cbd5e1\x27, borderRadius: 9, fontSize: 14, boxSizing: \x27border-box\x27, background: \x27#fff\x27 }}>
              {ENTIDADES.map(g => (
                <optgroup key={g.grupo} label={g.grupo}>
                  {g.items.map(it => <option key={it} value={it}>{it}</option>)}
                </optgroup>
              ))}
            </select>"""

c = c.replace(old_input, new_select)
open(p, "w", encoding="utf-8").write(c)
print("OK - dropdown agregado" if "optgroup" in c else "ATENCION: no se reemplazo el input")
