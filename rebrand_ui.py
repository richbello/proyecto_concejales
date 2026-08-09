#!/usr/bin/env python3
import re
from pathlib import Path

REPLACEMENTS = [
    (r'📊 Control Político', '📊 XBOG CONTROL'),
    (r'Informe Control Político', 'Informe XBOG CONTROL'),
    (r'Informe de Control Político', 'Informe de XBOG CONTROL'),
    (r'Simulador Presupuestal — Control Político', 'Simulador Presupuestal — XBOG CONTROL'),
    (r'<h1>🧮 Simulador Presupuestal — Control Político', '<h1>🧮 Simulador Presupuestal — XBOG CONTROL'),
    (r'Control Político · XBOG Technologies', 'XBOG CONTROL · Codespage'),
    (r'IA para Control Político', 'IA para XBOG CONTROL'),
    (r'Asistente IA · Control Político', 'Asistente IA · XBOG CONTROL'),
    (r'Proposición de Control Político', 'Proposición de XBOG CONTROL'),
]

files = [
    'frontend/src/Components/Dashboard.tsx',
    'frontend/src/Components/ExportarPDF.tsx',
    'frontend/src/Components/SimuladorPresupuestal.tsx',
    'frontend/src/Components/Politiko.tsx',
]

for file_path in files:
    try:
        p = Path(file_path)
        if not p.exists():
            print(f"⚠️  No encontrado: {file_path}")
            continue
        
        with open(p, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        for pattern, replacement in REPLACEMENTS:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            with open(p, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ {file_path}")
    except Exception as e:
        print(f"❌ {file_path}: {e}")
