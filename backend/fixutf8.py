p = "motor_cruce.py"
c = open(p, encoding="utf-8").read()
if "reconfigure" not in c:
    c = c.replace(
        "import requests",
        "import sys\nsys.stdout.reconfigure(encoding=\"utf-8\")\nsys.stderr.reconfigure(encoding=\"utf-8\")\nimport requests",
        1
    )
open(p, "w", encoding="utf-8").write(c)
print("OK - salida forzada a UTF-8")
