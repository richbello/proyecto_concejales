path = "server.js"
c = open(path, encoding="utf-8").read()
c = c.replace('spawn("python", ["motor_vfi.py"', 'spawn("python", ["motor_cruce.py"')
open(path, "w", encoding="utf-8").write(c)
print("OK - backend apunta a motor_cruce real")
