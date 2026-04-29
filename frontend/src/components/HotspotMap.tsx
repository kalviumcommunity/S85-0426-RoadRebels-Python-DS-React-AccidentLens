import React from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

interface HotspotMapProps {
  hotspots: any[]
}

export default function HotspotMap({ hotspots }: HotspotMapProps) {
  // Center of India
  const center: [number, number] = [20.5937, 78.9629]
  
  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl">
      <MapContainer 
        center={center} 
        zoom={5} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {hotspots.map((spot, idx) => (
          <CircleMarker
            key={idx}
            center={[spot.lat, spot.lng]}
            radius={8 + (spot.count / 10)}
            pathOptions={{ 
              fillColor: spot.severity === 'High' ? '#ef4444' : '#f97316',
              color: '#fff',
              weight: 1,
              fillOpacity: 0.6
            }}
          >
            <Popup className="custom-popup">
              <div className="p-1">
                <h3 className="font-bold text-gray-900">{spot.location}</h3>
                <p className="text-xs text-gray-700 mt-1">Accidents: <span className="font-semibold">{spot.count}</span></p>
                <p className="text-xs text-gray-700">Risk: <span className={spot.severity === 'High' ? 'text-red-600 font-bold' : 'text-orange-600 font-bold'}>{spot.severity}</span></p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
