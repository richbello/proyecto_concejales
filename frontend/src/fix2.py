path = "App.tsx"
c = open(path, encoding="utf-8").read()
c = c.replace("BALANZA", "VF")
c = c.replace(', label:"7. Vigilancia Fiscal IA", icon:"VF"', ', label:"7. Vigilancia Fiscal IA", icon:"VF"')
open(path, "w", encoding="utf-8").write(c)
print("OK")
