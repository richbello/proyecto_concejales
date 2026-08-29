p = "motor_cruce.py"
c = open(p, encoding="utf-8").read()

# Todos los print(...) del reporte que NO son el json.dumps final -> mandarlos a stderr
import re
lines = c.split("\n")
out = []
for l in lines:
    stripped = l.strip()
    # El print del JSON final se conserva en stdout
    if stripped.startswith("print(json.dumps"):
        out.append(l)
    # Cualquier otro print( -> agregar file=sys.stderr
    elif re.match(r"\s*print\(", l) and "file=sys.stderr" not in l:
        # insertar , file=sys.stderr antes del ultimo )
        idx = l.rfind(")")
        l = l[:idx] + ", file=sys.stderr" + l[idx:]
        out.append(l)
    else:
        out.append(l)
c = "\n".join(out)
open(p, "w", encoding="utf-8").write(c)
print("OK - reportes a stderr, stdout solo JSON")
