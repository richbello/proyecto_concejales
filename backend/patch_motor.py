import sys
path = "motor_cruce.py"
c = open(path, encoding="utf-8").read()
c = c.replace(
    "SIRI_CSV = \"datos_entrada/siri_antecedentes.csv\"",
    "SIRI_CSV = \"../datos_entrada/siri_antecedentes.csv\""
)
c = c.replace(
    "BOLETIN_CSV = \"datos_entrada/boletin_responsables_fiscales.csv\"",
    "BOLETIN_CSV = \"../datos_entrada/boletin_responsables_fiscales.csv\""
)
c = c.replace(
    "def log(msg):\n    print(f\"[{datetime.now():%H:%M:%S}] {msg}\")",
    "def log(msg):\n    print(f\"[{datetime.now():%H:%M:%S}] {msg}\", file=sys.stderr)"
)
if "import sys" not in c:
    c = c.replace("import requests", "import sys\nimport requests")
old_main = "if __name__ == \"__main__\":\n    ap = argparse.ArgumentParser()\n    ap.add_argument(\"--entidad\", default=\"USME\", help=\"Nombre (o parte) de la entidad\")\n    ap.add_argument(\"--max\", type=int, default=5000, help=\"MÃ¡ximo de contratos\")\n    args = ap.parse_args()\n    procesar(args.entidad, args.max)"
new_main = "if __name__ == \"__main__\":\n    ap = argparse.ArgumentParser()\n    ap.add_argument(\"entidad_pos\", nargs=\"?\", default=None)\n    ap.add_argument(\"max_pos\", nargs=\"?\", default=None)\n    ap.add_argument(\"--entidad\", default=\"USME\")\n    ap.add_argument(\"--max\", type=int, default=5000)\n    args = ap.parse_args()\n    entidad = args.entidad_pos or args.entidad\n    maxr = int(args.max_pos) if args.max_pos else args.max\n    resumen = procesar(entidad, maxr)\n    print(json.dumps(resumen, ensure_ascii=False))"
c = c.replace(old_main, new_main)
open(path, "w", encoding="utf-8").write(c)
print("OK - motor ajustado")
