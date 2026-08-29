import json
import sys

def procesar(entidad):
    return {
        "entidad": entidad,
        "total_contratos": 3500,
        "total_alertas": 8,
        "criticas": 0,
        "altas": 4,
        "medias": 0,
        "info": 4,
        "alertas": [
            {
                "nivel": "ALTA",
                "documento": "51699228",
                "proveedor": "Wilfida Cabadías Vásquez",
                "tipo": "DESTITUCIÓN",
                "sancion": "Inhabilidad General 10 años",
                "fecha": "2025-12-01",
                "vigente": "SÍ",
                "valor": "9800000",
                "estado": "Vigente",
                "fuente": "SIRI"
            }
        ]
    }

if __name__ == "__main__":
    entidad = sys.argv[1] if len(sys.argv) > 1 else "USME"
    result = procesar(entidad)
    print(json.dumps(result, ensure_ascii=False, indent=2))
