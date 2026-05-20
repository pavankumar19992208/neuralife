import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import { Maximize2 } from 'lucide-react'
import type { FleetDevice } from '@/types/common'
import 'leaflet/dist/leaflet.css'

interface Props {
  devices: FleetDevice[]
  filterKey: string
  onSelect: (device: FleetDevice) => void
}

const STATUS_COLORS: Record<string, string> = {
  RECENT:   '#10b981',
  WATCH:    '#f59e0b',
  OFFLINE:  '#f97316',
  CRITICAL: '#ef4444',
  LOST:     '#6b7280',
}

// Guntur, AP — fallback center when no devices have GPS
const GUNTUR: [number, number] = [16.3067, 80.4365]

function fitMap(map: LeafletMap, located: FleetDevice[]) {
  if (located.length === 0) return
  if (located.length === 1) {
    map.setView([located[0].location_lat!, located[0].location_lng!], 15, { animate: true })
    return
  }
  map.fitBounds(
    located.map(d => [d.location_lat!, d.location_lng!] as [number, number]),
    { padding: [40, 40], animate: true },
  )
}

// Captures the Leaflet map instance into a ref so the fit button (outside MapContainer) can use it
function MapCapture({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}

// Fits the map to the located devices whenever the active filter combination changes
function AutoFit({ located, filterKey }: { located: FleetDevice[]; filterKey: string }) {
  const map = useMap()
  const locatedRef = useRef(located)
  locatedRef.current = located

  useEffect(() => {
    fitMap(map, locatedRef.current)
  // Only react to filter changes, not to every 60-second data refresh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, filterKey])

  return null
}

export default function FleetMap({ devices, filterKey, onSelect }: Props) {
  const mapRef = useRef<LeafletMap | null>(null)
  const located = devices.filter(d => d.location_lat !== null && d.location_lng !== null)

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={GUNTUR}
        zoom={12}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapCapture mapRef={mapRef} />
        <AutoFit located={located} filterKey={filterKey} />

        {located.map(d => {
          const color = d.status === 'LOST' ? STATUS_COLORS.LOST : STATUS_COLORS[d.sync_status]
          return (
            <CircleMarker
              key={d.device_id}
              center={[d.location_lat!, d.location_lng!]}
              radius={8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 2 }}
              eventHandlers={{ click: () => onSelect(d) }}
            >
              <Popup>
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold">{d.device_id}</p>
                  <p>{d.student_name ?? 'Unassigned'}</p>
                  {d.student_class && <p className="text-slate-500">Class {d.student_class}</p>}
                  <p className="capitalize">{d.sync_status.toLowerCase()}</p>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Fit-to-fleet button — zooms map to show all visible SmartPad pins */}
      <button
        onClick={() => mapRef.current && fitMap(mapRef.current, located)}
        disabled={located.length === 0}
        title={located.length === 0 ? 'No devices with GPS data' : `Fit map to ${located.length} device${located.length !== 1 ? 's' : ''}`}
        aria-label="Fit map to SmartPads"
        className="absolute top-2 right-2 z-[1000] flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-slate-200 shadow-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Maximize2 className="h-4 w-4 text-slate-700" aria-hidden="true" />
      </button>
    </div>
  )
}
