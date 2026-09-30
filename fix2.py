ruta = r"frontend\src\pages\entidades.ts"
with open(ruta, "r", encoding="utf-8") as f:
    txt = f.read()

# Quitar el MOSQUERA duplicado (segunda aparicion en la misma linea)
txt = txt.replace('"MADRID","MOSQUERA",', '"MADRID",')

with open(ruta, "w", encoding="utf-8") as f:
    f.write(txt)

print("OK - duplicado corregido")
