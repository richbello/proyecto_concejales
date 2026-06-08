import React, { useEffect } from "react";
import L from "leaflet";

const proyectos = [
  { nombre: "Parque Central Soacha", estado: "En ejecución", avance: 45, coords: [4.586, -74.214] },
  { nombre: "Colegio Nuevo Horizonte", estado: "Planeado", avance: 0, coords: [4.61, -74.2] },
  { nombre: "Hospital Regional", estado: "Finalizado", avance: 100, coords: [4.59, -74.22] }
];

const colores: Record<string,string> = {
  "En ejecución": "#f1c40f",
  "Planeado": "#3498db",
  "Finalizado": "#2ecc71"
};

const MapaProyectos: React.FC = () => {
  useEffect(() => {
    const existing = L.DomUtil.get("map");
    if (existing && (existing as any)._leaflet_id) {
      (existing as any)._leaflet_id = null;
    }

    const map = L.map("map", { minZoom: 11, maxZoom: 16 }).setView([4.59, -74.22], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    proyectos.forEach(p => {
      const icon = L.divIcon({ 
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${colores[p.estado]};border:2px solid white"></div>`,
        className:"", iconAnchor:[9,9] 
      });
      L.marker(p.coords, {icon}).addTo(map)
        .bindPopup(`<b>${p.nombre}</b><br>Estado: ${p.estado}<br>Avance: ${p.avance}%`);
    });
  }, []);

  return (
    <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 4px 12px rgba(0,0,0,.08)" }}>
      <h3 style={{ color:"#3A6EA5" }}>🗺️ Mapa de Proyectos</h3>
      <div id="map" style={{ height:"500px", borderRadius:"12px", overflow:"hidden" }}></div>
    </div>
  );
};

export default MapaProyectos;





