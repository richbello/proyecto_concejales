import pandas as pd
import json

df = pd.read_excel(r"C:\Users\richb\proyecto_concejales\pua_datos.xlsx", sheet_name=0)
df = df[df["CODLOCALIDAD_ATENCION"].between(1, 20)]

out = []
for loc in df["LOCALIDAD_ATENCION"].unique():
    loc_df = df[df["LOCALIDAD_ATENCION"] == loc]
    
    # Por servicio
    por_servicio = loc_df.groupby("SERVICIO").size().to_dict()
    
    # Por temática
    por_tematica = loc_df.groupby("TEMATICA").size().to_dict()
    
    # Por UPZ
    por_upz = loc_df.groupby("NOMUPZ_UNDOPE").size().to_dict()
    
    # Por sexo
    por_sexo = loc_df.groupby("SEXO_ACTUAL").size().to_dict()
    
    out.append({
        "localidad": loc,
        "total": len(loc_df),
        "por_servicio": por_servicio,
        "por_tematica": por_tematica,
        "por_upz": por_upz,
        "por_sexo": por_sexo,
    })

out.sort(key=lambda x: x["total"], reverse=True)

with open(r"C:\Users\richb\proyecto_concejales\frontend\src\data_pua_completo.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print("OK - data_pua_completo.json con TEMATICA, SERVICIO, UPZ, SEXO")
print("Total localidades:", len(out))
