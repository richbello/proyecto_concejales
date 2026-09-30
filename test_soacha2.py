import urllib.request, json, urllib.parse
params = urllib.parse.urlencode({'$select':'nombre_entidad, count(*)', '$where':"upper(nombre_entidad) like upper('%SOACHA%')", '$group':'nombre_entidad', '$order':'count(*) DESC', '$limit':15})
req = urllib.request.Request('https://www.datos.gov.co/resource/jbjy-vk9h.json?'+params, headers={'User-Agent':'VFI/1.0'})
for e in json.loads(urllib.request.urlopen(req, timeout=60).read()):
    print(e.get('count',''), '->', e.get('nombre_entidad',''))
