import urllib.request, json, urllib.parse
params = urllib.parse.urlencode({'$select':'count(*)', '$where':"upper(nombre_entidad) like upper('%SOACHA%')"})
req = urllib.request.Request('https://www.datos.gov.co/resource/jbjy-vk9h.json?'+params, headers={'User-Agent':'VFI/1.0'})
print('SOACHA:', json.loads(urllib.request.urlopen(req, timeout=60).read()))
