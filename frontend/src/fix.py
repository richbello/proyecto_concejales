content = open('App.tsx', encoding='utf-8').read()
content = content.replace(
    'return (modulos.includes(m.key) || m.key === "licencias") ? m : null;',
    'return m;'
)
open('App.tsx', 'w', encoding='utf-8').write(content)
print('OK - modulos sin filtro')
