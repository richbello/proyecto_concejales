path = "server.js"
c = open(path, encoding="utf-8").read()
c = c.replace('spawn("python3"', 'spawn("python"')
open(path, "w", encoding="utf-8").write(c)
print("OK - python3 cambiado a python")
