#!/usr/bin/env python3
"""
Script de rebrand: XBOG CONTROL (Codespage) → XBOG CONTROL (Codespage)
Cambios:
  - XBOG CONTROL → XBOG CONTROL
  - Codespage → Codespage
  - xbogtechnologies@zohomail.com → xbogtechnologies@zohomail.com
"""

import os
import re
from pathlib import Path

# Definir los cambios
REPLACEMENTS = {
    r'XBOG CONTROL': 'XBOG CONTROL',
    r'Codespage': 'Codespage',
    r'gerencia@gestionyreclamoscolombia\.org': 'xbogtechnologies@zohomail.com',
    r'Control Política - Codespage': 'XBOG CONTROL - Codespage',
    r'Plataforma de Control Político - Codespage': 'Plataforma de Control Político - Codespage',
}

# Extensiones de archivo a procesar
FILE_EXTENSIONS = {'.html', '.js', '.json', '.py', '.txt', '.md', '.css', '.jsx', '.ts', '.tsx', '.yml', '.yaml'}

def process_file(file_path):
    """Procesa un archivo individual con los reemplazos."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Aplicar todos los reemplazos
        for pattern, replacement in REPLACEMENTS.items():
            content = re.sub(pattern, replacement, content)
        
        # Si hubo cambios, guardar el archivo
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Actualizado: {file_path}")
            return True
        return False
    
    except Exception as e:
        print(f"❌ Error en {file_path}: {e}")
        return False

def rebrand_project(root_dir='.'):
    """Rebrandea todo el proyecto."""
    root = Path(root_dir)
    files_updated = 0
    files_skipped = 0
    
    print("🚀 Iniciando rebrand a XBOG CONTROL - Codespage...")
    print(f"📁 Directorio raíz: {root.absolute()}\n")
    
    for file_path in root.rglob('*'):
        # Saltar directorios y archivos de sistema
        if file_path.is_dir():
            if any(skip in file_path.parts for skip in ['.git', 'node_modules', '.env', '__pycache__', '.venv', 'venv']):
                continue
            continue
        
        # Procesar solo archivos con extensiones permitidas
        if file_path.suffix in FILE_EXTENSIONS:
            if process_file(file_path):
                files_updated += 1
            else:
                files_skipped += 1
        else:
            files_skipped += 1
    
    print(f"\n{'='*50}")
    print(f"✅ Rebrand completado")
    print(f"📝 Archivos actualizados: {files_updated}")
    print(f"⏭️  Archivos sin cambios: {files_skipped}")
    print(f"{'='*50}")

if __name__ == '__main__':
    rebrand_project()
