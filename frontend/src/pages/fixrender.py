p = "VigilanciaFiscal.tsx"
c = open(p, encoding="utf-8").read()
# Reemplazar localhost por la URL de Render
c = c.replace(
    "http://localhost:4000",
    "https://proyecto-concejales.onrender.com"
)
open(p, "w", encoding="utf-8").write(c)
print("OK - URL de Render agregada al frontend")
