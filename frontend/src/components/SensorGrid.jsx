import { tempToColor } from '../hooks/useSensorData'
import { AlertTriangle } from 'lucide-react'

export default function SensorGrid({ sensors, safeRange, compact = false }) {
  if (!sensors || sensors.every(s => s.temp === null)) {
    return (
      <div className="text-center text-sm text-gray-400 py-4">
        Connect the cap to see individual sensor readings
      </div>
    )
  }

  const temps = sensors.filter(s => s.temp !== null).map(s => s.temp)
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length * 10) / 10
  const spread = Math.round((maxTemp - minTemp) * 10) / 10

  return (
    <div className="flex flex-col gap-3">
      {/* Summary row */}
      {!compact && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Min', value: minTemp },
            { label: 'Avg', value: avgTemp },
            { label: 'Max', value: maxTemp },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg py-2 px-1"
              style={{ background: '#f0f7fc' }}>
              <div className="text-xs text-gray-400">{label}</div>
              <div className="font-bold text-sm" style={{ color: tempToColor(value) }}>
                {value}°C
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hotspot warning */}
      {spread > 3 && !compact && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
          style={{ background: '#fef3c7', color: '#92400e' }}>
          <AlertTriangle size={13} />
          {spread}°C spread between sensors — hotspot likely
        </div>
      )}

      {/* Individual sensor cards */}
      <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'}`}>
        {sensors.map(s => {
          const color = s.temp !== null ? tempToColor(s.temp) : '#94a3b8'
          const isHot = s.temp !== null && s.temp > safeRange.max
          const isCold = s.temp !== null && s.temp < 10
          const isOk = s.temp !== null && !isHot && !isCold
          const borderColor = isHot ? '#ef4444' : isCold ? '#3b82f6' : isOk ? '#a3ceed' : '#e2e8f0'

          return (
            <div
              key={s.id}
              className="rounded-xl p-2.5 flex flex-col items-center gap-1 shadow-sm relative"
              style={{ background: 'white', border: `2px solid ${borderColor}` }}
            >
              {/* Colour swatch */}
              <div
                className="w-6 h-6 rounded-full shadow-inner"
                style={{ background: color, boxShadow: `0 0 8px ${color}88` }}
              />

              {/* Temperature value */}
              <div className="font-bold text-sm leading-none"
                style={{ color: isHot ? '#dc2626' : '#1e3a4f' }}>
                {s.temp !== null ? `${s.temp}°C` : '—'}
              </div>

              {/* Sensor name */}
              <div className="text-center leading-tight" style={{ color: '#4a7fa5' }}>
                <div className="text-xs font-semibold">{s.abbr}</div>
                {!compact && (
                  <div className="text-xs text-gray-400" style={{ fontSize: '9px' }}>
                    {s.name}
                  </div>
                )}
              </div>

              {/* Hot alert badge */}
              {isHot && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <AlertTriangle size={9} color="white" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!compact && (
        <div className="text-xs text-gray-400 text-center">
          Optimal: 12–15°C · Effective: 18–22°C · Poor: &gt;24°C
        </div>
      )}
    </div>
  )
}
