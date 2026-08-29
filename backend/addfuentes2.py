p = "motor_cruce.py"
lines = open(p, encoding="utf-8").readlines()
# Buscar la linea con "total_contratos": len(contratos),
for i, l in enumerate(lines):
    if "\"total_contratos\": len(contratos)," in l:
        indent = l[:len(l) - len(l.lstrip())]
        nuevas = [
            indent + "\"registros_siri\": len(siri),\n",
            indent + "\"registros_boletin\": len(boletin),\n",
        ]
        lines[i+1:i+1] = nuevas
        break
open(p, "w", encoding="utf-8").writelines(lines)
c = open(p, encoding="utf-8").read()
print("OK - conteos agregados" if "registros_siri" in c else "ERROR")
