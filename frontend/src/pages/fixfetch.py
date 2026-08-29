path = "VigilanciaFiscal.tsx"
c = open(path, encoding="utf-8").read()
c = c.replace(
    "const response = await fetch(`http://localhost:4000/api/vfi/analizar?entidad=${entidad}`);",
    "const response = await fetch(`http://localhost:4000/api/vfi/analizar?entidad=${entidad}`, { method: 'POST' });"
)
open(path, "w", encoding="utf-8").write(c)
print("OK - cambiado a POST")
