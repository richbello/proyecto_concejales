import urllib.request, json, urllib.parse
municipios = ["SOACHA","MOSQUERA","FUNZA","MADRID","FACATATIVA","CHIA","ZIPAQUIRA","CAJICA","COTA","TENJO","SIBATE","LA CALERA","FUSAGASUGA","GIRARDOT","TOCANCIPA","GACHANCIPA","SOPO","BOJACA","EL ROSAL","SUBACHOQUE"]
for m in municipios:
    params = urllib.parse.urlencode({'$select':'count(*)', '$where':"upper(nombre_entidad) like upper('%"+m+"%')"})
    req = urllib.request.Request('https://www.datos.gov.co/resource/jbjy-vk9h.json?'+params, headers={'User-Agent':'VFI/1.0'})
    try:
        n = json.loads(urllib.request.urlopen(req, timeout=60).read())[0]['count']
    except Exception as e:
        n = 'ERROR'
    print(f"{m:15} {n}")
