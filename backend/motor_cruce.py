#!/usr/bin/env python3
"""Motor VFI compacto para Express backend"""
import requests
import csv
import re
import json
from datetime import datetime
from pathlib import Path

SECOP_BASE = "https://www.datos.gov.co/resource/jbjy-vk9h.json"
SIRI_CSV = "../datos_entrada/siri_antecedentes.csv"
BOLETIN_CSV = "../datos_entrada/boletin_responsables_fiscales.csv"

def norm(v):
    if v is None: return ""
    s = str(v)
    if "-" in s: s = s.split("-")[0]
    return re.sub(r"[^0-9]", "", s)

def procesar(entidad, max_reg=3500):
    """Ejecuta cruce y retorna JSON de alertas"""
    try:
        # Cargar SIRI
        siri = {}
        with open(SIRI_CSV, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                doc = norm(row.get("numero_identificacion",""))
                if doc: siri.setdefault(doc, []).append(row)
        
        # Cargar Boletín
        boletin = {}
        with open(BOLETIN_CSV, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                doc = norm(row.get("documento",""))
                if doc: boletin.setdefault(doc, []).append(row)
        
        # Descargar SECOP
        contratos = []
        for offset in range(0, max_reg, 500):
            try:
                r = requests.get(SECOP_BASE, params={
                    "$where": f"upper(nombre_entidad) like upper('%{entidad}%')",
                    "$limit": 500, "$offset": offset, "$order": ":id"
                }, timeout=120)
                lote = r.json()
                if not lote: break
                contratos.extend(lote)
            except: break
        
        # Cruzar
        alertas = []
        for c in contratos:
            doc = norm(c.get("documento_proveedor",""))
            if doc in siri:
                for s in siri[doc]:
                    alertas.append({
                        "nivel": "ALTA",
                        "documento": doc,
                        "proveedor": c.get("proveedor_adjudicado",""),
                        "tipo": s.get("tipo_inhabilidad",""),
                        "sancion": s.get("sanciones",""),
                        "fecha": s.get("fecha_efectos_juridicos",""),
                        "vigente": "SÍ",
                        "valor": c.get("valor_del_contrato",""),
                        "estado": c.get("estado_contrato","")
                    })
            if doc in boletin:
                for b in boletin[doc]:
                    alertas.append({
                        "nivel": "ALTA",
                        "documento": doc,
                        "proveedor": c.get("proveedor_adjudicado",""),
                        "tipo": "FISCAL",
                        "sancion": "RESPONSABILIDAD FISCAL",
                        "fecha": "",
                        "vigente": "SÍ",
                        "valor": c.get("valor_del_contrato",""),
                        "estado": c.get("estado_contrato","")
                    })
        
        return {
            "entidad": entidad,
            "total_contratos": len(contratos),
            "total_alertas": len(alertas),
            "criticas": 0,
            "altas": len(alertas),
            "medias": 0,
            "info": 0,
            "alertas": alertas
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import sys
    entidad = sys.argv[1] if len(sys.argv) > 1 else "USME"
    result = procesar(entidad)
    print(json.dumps(result, ensure_ascii=False, indent=2))
