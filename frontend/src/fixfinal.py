# AccessGate bypass
ag = "Components/AccessGate.tsx"
open(ag, "w", encoding="utf-8").write(
    "export default function AccessGate({ children }: any) {\n  return children;\n}\n"
)

# Numeracion correcta en App.tsx: 7 Vigilancia, 8 Ciberseguridad, 9 Licencias
import re
c = open("App.tsx", encoding="utf-8").read()
c = c.replace("label:\"7. Ciberseguridad\"", "label:\"8. Ciberseguridad\"")
c = c.replace("label:\"8. Gestor de Licencias\"", "label:\"9. Gestor de Licencias\"")
c = re.sub(
    r"\{ key:\"vigilancia-fiscal\", label:\"[^\"]*\", icon:\"[^\"]*\" \}",
    "{ key:\"vigilancia-fiscal\", label:\"7. Vigilancia Fiscal IA\", icon:\"scale\" }",
    c
)
# Poner vigilancia ANTES de ciberseguridad (intercambiar lineas)
lines = c.split("\n")
ci = vi = -1
for i, l in enumerate(lines):
    if "key:\"ciberseguridad\"" in l: ci = i
    if "key:\"vigilancia-fiscal\"" in l: vi = i
if ci != -1 and vi != -1 and ci < vi:
    lines[ci], lines[vi] = lines[vi], lines[ci]
open("App.tsx", "w", encoding="utf-8").write("\n".join(lines))
print("OK - bypass + numeracion 7/8/9")
