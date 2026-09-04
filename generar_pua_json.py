import pandas as pd
import json

df = pd.read_excel(r"C:\Users\richb\proyecto_concejales\pua_datos.xlsx", sheet_name=0)

# Filtrar solo localidades reales (codigos 1-20)
df = df[df["CODLOCALIDAD_ATENCION"].between(1, 20)]

def si(col):
    return df.groupby("LOCALIDAD_ATENCION")[col].apply(lambda x: (x.astype(str).str.upper() == "SI").sum())

# Total atendidos por localidad
total = df.groupby("LOCALIDAD_ATENCION").size()

# Vista 1: servicios (tematica) por localidad
serv = df.groupby(["LOCALIDAD_ATENCION", "TEMATICA"]).size().unstack(fill_value=0)

# Vista 2: poblaciones vulnerables
disc = si("SITUACION_DISCAPACIDAD_ACTUAL")
vict = si("VICTIMA_ACTUAL")
lgbti = si("LGBTI_ACTUAL")
migr = si("MIGRANTE_ACTUAL")

# Vista 3: grupo etario
eta = df.groupby(["LOCALIDAD_ATENCION", "GRUPO_ETAREO_1D_ANUAL_ACTUAL"]).size().unstack(fill_value=0)

out = []
for loc in total.index:
    out.append({
        "localidad": loc,
        "total": int(total[loc]),
        "servicios": {k: int(v) for k, v in serv.loc[loc].items() if v > 0},
        "discapacidad": int(disc.get(loc, 0)),
        "victimas": int(vict.get(loc, 0)),
        "lgbti": int(lgbti.get(loc, 0)),
        "migrantes": int(migr.get(loc, 0)),
        "etario": {k: int(v) for k, v in eta.loc[loc].items() if v > 0},
    })

out.sort(key=lambda x: x["total"], reverse=True)

with open(r"C:\Users\richb\proyecto_concejales\frontend\src\data_pua.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print("OK - generado data_pua.json con", len(out), "localidades")
print("Tematicas encontradas:", list(serv.columns))
print("Grupos etarios:", list(eta.columns))
