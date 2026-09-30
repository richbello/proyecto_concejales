ruta = r"frontend\src\pages\entidades.ts"
with open(ruta, "r", encoding="utf-8") as f:
    txt = f.read()

grupo_cundinamarca = """  { grupo: "Cundinamarca (Municipios)", items: [
    "SOACHA","GIRARDOT","FUNZA","COTA","CHIA","MOSQUERA",
    "FUSAGASUGA","CAJICA","FACATATIVA","ZIPAQUIRA","MADRID","MOSQUERA",
    "TOCANCIPA","SOPO","LA CALERA","SIBATE","TENJO","EL ROSAL",
    "SUBACHOQUE","BOJACA","GACHANCIPA"
  ]},
];"""

# Reemplazar el cierre final "];" por el grupo nuevo + cierre
txt = txt.rstrip()
if txt.endswith("];"):
    txt = txt[:-2].rstrip() + "\n" + grupo_cundinamarca + "\n"

with open(ruta, "w", encoding="utf-8") as f:
    f.write(txt)

print("OK - grupo Cundinamarca agregado")
