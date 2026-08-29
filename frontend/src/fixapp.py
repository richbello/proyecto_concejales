path = "App.tsx"
c = open(path, encoding="utf-8").read()

# 1. Habilitar todos los modulos (sin filtro por licencia)
c = c.replace(
    "return (modulos.includes(m.key) || m.key === \"licencias\") ? m : null;",
    "return m;"
)
# 2. Hijos de grupos siempre visibles
c = c.replace(
    "const kids = (m.children || []).filter(c => modulos.includes(c.key));",
    "const kids = (m.children || []);"
)
# 3. Quitar bloque "Modulo no disponible" (renderiza siempre)
import re
c = re.sub(
    r"\s*// Verificar acceso\s*if \(!modulos\.includes\(tab\)\) \{.*?\n    \}",
    "",
    c,
    flags=re.DOTALL
)

open(path, "w", encoding="utf-8").write(c)
print("OK - App.tsx: modulos habilitados, sin bloqueo")
