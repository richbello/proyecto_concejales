path = "motor_cruce.py"
c = open(path, encoding="utf-8").read()
idx = c.find("if __name__ ==")
if idx == -1:
    print("ERROR: no encontro main")
else:
    nuevo = (
        "if __name__ == \"__main__\":\n"
        "    import sys as _sys\n"
        "    args = [a for a in _sys.argv[1:] if not a.startswith(\"-\")]\n"
        "    entidad = args[0] if len(args) > 0 else \"USME\"\n"
        "    maxr = int(args[1]) if len(args) > 1 else 5000\n"
        "    resumen = procesar(entidad, maxr)\n"
        "    print(json.dumps(resumen, ensure_ascii=False))\n"
    )
    c = c[:idx] + nuevo
    open(path, "w", encoding="utf-8").write(c)
    print("OK - main reemplazado")
