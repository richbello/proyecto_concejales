ruta = r"backend\motor_cruce.py"
with open(ruta, "r", encoding="utf-8") as f:
    txt = f.read()

txt = txt.replace(
    "maxr = int(args[1]) if len(args) > 1 else 5000",
    "maxr = int(args[1]) if len(args) > 1 else 40000"
)

with open(ruta, "w", encoding="utf-8") as f:
    f.write(txt)

print("OK - tope subido a 40000")
