p = "VigilanciaFiscal.tsx"
c = open(p, encoding="utf-8").read()

old = """        {loading && <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>Descargando contratos de SECOP y cruzando con antecedentes… puede tardar 1–2 minutos.</div>}"""

new = """        {loading && (
          <div style={{ marginTop: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>Procesando análisis…</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                {Math.floor(cronometro / 60)}:{String(cronometro % 60).padStart(2, '0')}
              </span>
            </div>
            <div style={{ maxHeight: 140, overflowY: 'auto', fontSize: 12, color: '#475569', fontFamily: 'monospace', lineHeight: 1.6 }}>
              {progreso.map((m, i) => {
                let texto = m;
                let color = '#64748b';
                if (m.includes('SIRI')) { texto = '📋 Procuraduría (SIRI): ' + m.replace(/\\[.*?\\]/, '').trim(); color = '#7c3aed'; }
                else if (m.includes('Boletín') || m.includes('Boletin')) { texto = '💰 Contraloría (Boletín): ' + m.replace(/\\[.*?\\]/, '').trim(); color = '#ca8a04'; }
                else if (m.includes('contratos') || m.includes('SECOP')) { texto = '📄 SECOP II: ' + m.replace(/\\[.*?\\]/, '').trim(); color = '#2563eb'; }
                return <div key={i} style={{ color }}>{texto}</div>;
              })}
              {progreso.length === 0 && <div>Iniciando…</div>}
            </div>
          </div>
        )}"""

c = c.replace(old, new)
open(p, "w", encoding="utf-8").write(c)
print("OK - panel de progreso agregado" if "Procesando análisis" in c else "ERROR")
