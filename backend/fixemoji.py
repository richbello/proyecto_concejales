p = "motor_cruce.py"
c = open(p, encoding="utf-8").read()
# Reemplazar emojis por texto plano en los prints de consola
reemplazos = {
    "\U0001f534": "[CRIT]",
    "\U0001f7e0": "[ALTA]",
    "\U0001f7e1": "[MEDIA]",
    "\u26aa": "[INFO]",
    "\U0001f7e2": "[OK]",
}
for emoji, txt in reemplazos.items():
    c = c.replace(emoji, txt)
open(p, "w", encoding="utf-8").write(c)
print("OK - emojis removidos de los prints")
