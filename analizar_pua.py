import pandas as pd

archivo = r'C:\Users\richb\proyecto_concejales\pua_datos.xlsx'
df = pd.read_excel(archivo, sheet_name=0)

print("ANALISIS PUA POR LOCALIDAD:")
por_loc = df.groupby(['CODLOCALIDAD_ATENCION', 'LOCALIDAD_ATENCION']).size().reset_index(name='Total')
print(por_loc.sort_values('Total', ascending=False))

print("\nTEMATICAS:")
print(df['TEMATICA'].value_counts())

print("\nGuardando...")
df_summary = df.groupby('LOCALIDAD_ATENCION').size()
df_summary.to_csv('pua_por_localidad.csv')
print("OK")
