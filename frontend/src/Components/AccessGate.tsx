import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Building2 } from 'lucide-react';

// ───────────────────────────────────────────────────────────────
// CONFIGURACIÓN: cambia aquí la(s) clave(s) de acceso.
// Puedes tener una clave por municipio si quieres diferenciarlas.
// ───────────────────────────────────────────────────────────────
const CLAVES_VALIDAS: Record<string, string> = {
  'concejo2026': 'Concejo de Usme',
  // 'sopo2026': 'Concejo de Sopó',
  // 'chia2026': 'Concejo de Chía',
};

const STORAGE_KEY = 'control_politico_auth';
const SESSION_HOURS = 720; // 30 días — dura el mes de prueba

interface Props {
  children: React.ReactNode;
}

export default function AccessGate({ children }: Props) {
  const [autorizado, setAutorizado] = useState(false);
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { timestamp, municipio } = JSON.parse(stored);
        const horasTranscurridas = (Date.now() - timestamp) / (1000 * 60 * 60);
        if (horasTranscurridas < SESSION_HOURS && municipio) {
          setAutorizado(true);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setCargando(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const claveNormalizada = clave.trim().toLowerCase();
    const municipio = CLAVES_VALIDAS[claveNormalizada];

    if (municipio) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        timestamp: Date.now(),
        municipio,
      }));
      setAutorizado(true);
      setError('');
    } else {
      setError('Clave de acceso incorrecta. Verifique el oficio recibido o contacte a XBOG Technologies.');
    }
  };

  if (cargando) return null;

  if (autorizado) return <>{children}</>;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1a2742 50%, #1e3a5f 100%)',
      padding: 20, fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '44px 36px',
        maxWidth: 420, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #1a2742, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={30} color="white" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Control Político
          </h1>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
            Sistema de Inteligencia Presupuestal para Concejales Municipales
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>
            <Lock size={13} style={{ display: 'inline', marginRight: 6, marginBottom: -1 }} />
            Clave de acceso de su Concejo
          </label>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input
              type={mostrarClave ? 'text' : 'password'}
              value={clave}
              onChange={e => { setClave(e.target.value); setError(''); }}
              placeholder="Ingrese la clave recibida en el oficio"
              autoFocus
              style={{
                width: '100%', padding: '12px 42px 12px 14px', borderRadius: 10,
                border: error ? '1.5px solid #dc2626' : '1.5px solid #e2e8f0',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button type="button" onClick={() => setMostrarClave(v => !v)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                display: 'flex', alignItems: 'center',
              }}>
              {mostrarClave ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <button type="submit" style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #1a2742, #2563eb)', color: 'white',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4,
          }}>
            Ingresar al sistema
          </button>
        </form>

        <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 22, lineHeight: 1.5 }}>
          Acceso exclusivo para concejales autorizados.<br />
          ¿No tiene una clave?{' '}
          <a href="https://wa.me/573208303847" target="_blank" rel="noopener noreferrer"
            style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Contáctenos por WhatsApp
          </a>
        </p>

        <div style={{
          marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9',
          textAlign: 'center', fontSize: 10.5, color: '#cbd5e1',
        }}>
          XBOG Technologies · Control Político 2026
        </div>
      </div>
    </div>
  );
}