import pandas as pd
import json

df = pd.read_excel(r"C:\Users\richb\proyecto_concejales\pua_datos.xlsx", sheet_name=0)
df = df[df["CODLOCALIDAD_ATENCION"].between(1, 20)]

def cuenta_si(sub, col):
    return int((sub[col].astype(str).str.upper() == "SI").sum())

out = []
for loc in df["LOCALIDAD_ATENCION"].unique():
    s = df[df["LOCALIDAD_ATENCION"] == loc]
    tematica = s.groupby("TEMATICA").size().to_dict()
    out.append({
        "localidad": loc,
        "total": int(len(s)),
        "img": int(tematica.get("INGRESO MINIMO GARANTIZADO", 0)),
        "por_tematica": {k: int(v) for k, v in tematica.items()},
        "por_servicio": {k: int(v) for k, v in s.groupby("SERVICIO").size().to_dict().items()},
        "por_sexo": {k: int(v) for k, v in s.groupby("SEXO_ACTUAL").size().to_dict().items()},
        "discapacidad": cuenta_si(s, "SITUACION_DISCAPACIDAD_ACTUAL"),
        "victimas": cuenta_si(s, "VICTIMA_ACTUAL"),
        "lgbti": cuenta_si(s, "LGBTI_ACTUAL"),
        "migrantes": cuenta_si(s, "MIGRANTE_ACTUAL"),
        "etario": {k: int(v) for k, v in s.groupby("GRUPO_ETAREO_1D_ANUAL_ACTUAL").size().to_dict().items()},
    })

out.sort(key=lambda x: x["total"], reverse=True)

with open(r"C:\Users\richb\proyecto_concejales\frontend\src\data_social.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print("OK - data_social.json con", len(out), "localidades")
