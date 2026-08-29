path = "App.tsx"
c = open(path, encoding="utf-8").read()
c = c.replace(
    "const kids = (m.children || []).filter(c => modulos.includes(c.key));",
    "const kids = (m.children || []);"
)
c = c.replace(', icon:"VF" }', ' }')
open(path, "w", encoding="utf-8").write(c)
print("OK - grupo presupuesto restaurado, VF removido")
