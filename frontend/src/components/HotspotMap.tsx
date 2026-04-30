import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { analysisAPI } from '@/services/api'
import { Clock } from 'lucide-react'

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

const TIMES = ['Morning', 'Afternoon', 'Evening', 'Night']

export default function HotspotMap({ hotspots: initialHotspots }: HotspotMapProps) {
  const [currentTime, setCurrentTime] = useState('Morning')
  const [temporalData, setTemporalData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTemporal = async () => {
      try {
        const res = await analysisAPI.temporalHotspots()
        if (res.data?.data) setTemporalData(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchTemporal()
  }, [])

  const currentSpots = temporalData?.[currentTime] || initialHotspots || []

  // Center of India
  const center: [number, number] = [20.5937, 78.9629]
  
  return (
    <div className="space-y-4">
      {/* Time Slider */}
      <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-2 text-xs font-medium text-indigo-400 min-w-[100px]">
          <Clock size={14} /> Time Analysis
        </div>
        <div className="flex-1 flex gap-2">
          {TIMES.map((t) => (
            <button
              key={t}
              onClick={() => setCurrentTime(t)}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                currentTime === t 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[400px] w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center">
             <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
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
          {currentSpots.map((spot: any, idx: number) => (
            <CircleMarker
              key={`${currentTime}-${idx}`}
              center={[spot.lat, spot.lng]}
              radius={8 + (spot.count / 10)}
              pathOptions={{ 
                fillColor: spot.count > 15 ? '#ef4444' : '#f97316',
                color: '#fff',
                weight: 1,
                fillOpacity: 0.6
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1">
                  <h3 className="font-bold text-gray-900">{spot.location}</h3>
                  <p className="text-xs text-gray-700 mt-1">Incidents: <span className="font-semibold">{spot.count}</span></p>
                  <p className="text-[10px] text-gray-500 italic mt-1 capitalize">{currentTime} Period</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
