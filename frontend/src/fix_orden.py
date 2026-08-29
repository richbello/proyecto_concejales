import re
path = "App.tsx"
content = open(path, encoding="utf-8").read()
content = content.replace("label:\"7. Ciberseguridad\"", "label:\"8. Ciberseguridad\"")
content = content.replace("label:\"8. Gestor de Licencias\"", "label:\"9. Gestor de Licencias\"")
content = re.sub(r"\{ key:\"vigilancia-fiscal\", label:\"[^\"]*\", icon:\"[^\"]*\" \}", "{ key:\"vigilancia-fiscal\", label:\"7. Vigilancia Fiscal IA\", icon:\"BALANZA\" }", content)
open(path, "w", encoding="utf-8").write(content)
print("OK - orden corregido")
