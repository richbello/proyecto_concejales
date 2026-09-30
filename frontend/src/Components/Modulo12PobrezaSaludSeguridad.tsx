import React, { useEffect } from 'react';
interface Modulo12Props { municipio?: string; }
export default function Modulo12PobrezaSaludSeguridad({ municipio = 'Soacha' }: Modulo12Props) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="w-full h-full min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-900 to-teal-600 p-4 text-white">
        <h1 className="text-2xl font-bold">Módulo 12: Pobreza, Salud y Seguridad</h1>
        <p className="text-sm opacity-90">Cundinamarca & {municipio} | 2021-2026</p>
      </div>
      <iframe src="/modulos/XBOG_SMART_MODULO_12_POBREZA_SALUD_SEGURIDAD.html" className="w-full h-screen border-0 min-h-screen" title="Módulo 12" style={{ display: 'block', overflow: 'auto' }} />
    </div>
  );
}
