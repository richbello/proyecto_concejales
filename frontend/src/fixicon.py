p = "App.tsx"
c = open(p, encoding="utf-8").read()
c = c.replace(
    "label:\"7. Vigilancia Fiscal IA\", icon:\"scale\"",
    "label:\"7. Vigilancia Fiscal IA\", icon:\"\u2696\ufe0f\""
)
open(p, "w", encoding="utf-8").write(c)
print("OK - icono cambiado a balanza")
