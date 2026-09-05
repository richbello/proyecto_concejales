import React, { useState, useEffect } from 'react';
import { initSessionControl, validateSession } from '../utils/sessionControl';

interface AccessGateProps {
  children?: React.ReactNode;
}

export default function AccessGate({ children }: AccessGateProps) {
  const [licencia, setLicencia] = useState('');
  const [validada, setValidada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [sesionActiva, setSesionActiva] = useState(false);

  // Al montar, verifica si hay sesión válida
  useEffect(() => {
    const verificarSesion = async () => {
      const licGuardada = localStorage.getItem('xbog_licencia');
      if (licGuardada) {
        try {
          const sesionOk = await validateSession(licGuardada);
          if (sesionOk) {
            setValidada(true);
            setSesionActiva(true);
            setLicencia(licGuardada);
          } else {
            localStorage.removeItem('xbog_licencia');
            localStorage.removeItem('xbog_sessionId');
          }
        } catch (err) {
          localStorage.removeItem('xbog_licencia');
        }
      }
    };
    verificarSesion();
  }, []);

  const handleValidar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licencia.trim()) {
      setError('Ingresa una licencia válida');
      return;
    }

    setCargando(true);
    setError('');

    try {
      // 1. Validar licencia en el Worker
      const respValidar = await fetch(
        'https://controlia-licencias.richbello.workers.dev/validar',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licencia: licencia.trim() })
        }
      );

      const dataValidar = await respValidar.json();

      if (!dataValidar.ok) {
        setError(dataValidar.error || 'Licencia inválida o expirada');
        setCargando(false);
        return;
      }

      // 2. Iniciar sesión (obtener sessionId)
      const respSession = await initSessionControl(licencia.trim());
      if (!respSession.ok) {
        setError(respSession.error || 'No se pudo iniciar sesión');
        setCargando(false);
        return;
      }

      // 3. Guardar en localStorage
      localStorage.setItem('xbog_licencia', licencia.trim());
      localStorage.setItem('xbog_sessionId', respSession.sessionId || '');
      localStorage.setItem('xbog_loginTime', Date.now().toString());

      setValidada(true);
      setSesionActiva(true);
      setError('');
    } catch (err) {
      console.error('Error validando licencia:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('xbog_licencia');
    localStorage.removeItem('xbog_sessionId');
    localStorage.removeItem('xbog_loginTime');
    setValidada(false);
    setSesionActiva(false);
    setLicencia('');
  };

  // Si la sesión es válida, muestra el contenido
  if (validada && sesionActiva) {
    return (
      <div className="w-full h-full">
        <div className="flex items-center justify-between p-2 bg-teal-900 text-white text-xs">
          <span>📊 XBOG CONTROL - Licencia: {licencia.substring(0, 15)}...</span>
          <button
            onClick={handleCerrarSesion}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
          >
            Cerrar sesión
          </button>
        </div>
        {children}
      </div>
    );
  }

  // Si no está validada, muestra formulario de login
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-2xl border border-teal-500">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-400 mb-2">XBOG CONTROL</h1>
          <p className="text-teal-300 text-sm">Control Político Inteligente</p>
          <p className="text-gray-400 text-xs mt-2">v1.2 - Vigilancia Fiscal IA</p>
        </div>

        <form onSubmit={handleValidar} className="space-y-4">
          <div>
            <label className="block text-teal-300 text-sm font-semibold mb-2">
              Clave de Acceso
            </label>
            <input
              type="password"
              value={licencia}
              onChange={(e) => {
                setLicencia(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="CP-PRE-XXXX-XXXX-XXXX-XXXX"
              className="w-full px-4 py-2 bg-slate-700 border border-teal-500 rounded text-white placeholder-gray-500 focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-400/50"
              disabled={cargando}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500