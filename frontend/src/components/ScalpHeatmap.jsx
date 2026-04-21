import { tempToColor } from '../hooks/useSensorData'

// SVG head dimensions
const W = 400
const H = 460
const HEAD_CX = 200
const HEAD_CY = 232
const HEAD_RX = 148
const HEAD_RY = 183

// Gradient blob radius for each sensor's heatmap zone
const BLOB_R = 125

export default function ScalpHeatmap({ sensors, safeRange, showLabels = true }) {
  const hasData = sensors.some(s => s.temp !== null)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: 420, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }}
      >
        <defs>
          {/* Clip to head shape */}
          <clipPath id="headClip">
            <ellipse cx={HEAD_CX} cy={HEAD_CY} rx={HEAD_RX} ry={HEAD_RY} />
          </clipPath>

          {/* Soft blur for the heatmap blend */}
          <filter id="heatBlur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="18" />
          </filter>

          {/* Radial gradient for each sensor blob — colour based on temp */}
          {sensors.map(s => {
            const color = s.temp !== null ? tempToColor(s.temp) : '#bfddf2'
            return (
              <radialGradient
                key={s.id}
                id={`grad${s.id}`}
                cx={s.cx} cy={s.cy} r={BLOB_R}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%"   stopColor={color} stopOpacity="0.92" />
                <stop offset="60%"  stopColor={color} stopOpacity="0.5"  />
                <stop offset="100%" stopColor={color} stopOpacity="0"    />
              </radialGradient>
            )
          })}
        </defs>

        {/* ── Head base fill ── */}
        <ellipse
          cx={HEAD_CX} cy={HEAD_CY}
          rx={HEAD_RX} ry={HEAD_RY}
          fill={hasData ? '#e8f4fb' : '#f0f7fc'}
        />

        {/* ── Heatmap blobs — blurred & clipped to head ── */}
        {hasData && (
          <g clipPath="url(#headClip)" filter="url(#heatBlur)">
            {sensors.map(s => (
              <circle
                key={s.id}
                cx={s.cx} cy={s.cy}
                r={BLOB_R}
                fill={`url(#grad${s.id})`}
              />
            ))}
          </g>
        )}

        {/* ── Hair / scalp texture ring ── */}
        <ellipse
          cx={HEAD_CX} cy={HEAD_CY}
          rx={HEAD_RX} ry={HEAD_RY}
          fill="none"
          stroke="#c8dde8"
          strokeWidth="10"
          opacity="0.35"
        />

        {/* ── Ears ── */}
        <ellipse cx={HEAD_CX - HEAD_RX - 8} cy={HEAD_CY + 10} rx={13} ry={22}
          fill="#e8f0f5" stroke="#b0ccd8" strokeWidth="1.5" />
        <ellipse cx={HEAD_CX + HEAD_RX + 8} cy={HEAD_CY + 10} rx={13} ry={22}
          fill="#e8f0f5" stroke="#b0ccd8" strokeWidth="1.5" />

        {/* ── Head outline ── */}
        <ellipse
          cx={HEAD_CX} cy={HEAD_CY}
          rx={HEAD_RX} ry={HEAD_RY}
          fill="none"
          stroke="#4a7fa5"
          strokeWidth="2.5"
        />

        {/* ── Nose (front indicator) ── */}
        <path
          d={`M ${HEAD_CX - 10} ${HEAD_CY - HEAD_RY + 18} Q ${HEAD_CX} ${HEAD_CY - HEAD_RY - 6} ${HEAD_CX + 10} ${HEAD_CY - HEAD_RY + 18}`}
          fill="#d4e8f4" stroke="#4a7fa5" strokeWidth="1.5" strokeLinejoin="round"
        />

        {/* ── FRONT / BACK / L / R orientation labels ── */}
        <text x={HEAD_CX} y={HEAD_CY - HEAD_RY - 14} textAnchor="middle"
          fontSize="11" fill="#4a7fa5" fontWeight="600" letterSpacing="1">FRONT</text>
        <text x={HEAD_CX} y={HEAD_CY + HEAD_RY + 18} textAnchor="middle"
          fontSize="11" fill="#4a7fa5" fontWeight="600" letterSpacing="1">BACK</text>
        <text x={HEAD_CX - HEAD_RX - 22} y={HEAD_CY + 5} textAnchor="middle"
          fontSize="10" fill="#4a7fa5" fontWeight="600">L</text>
        <text x={HEAD_CX + HEAD_RX + 22} y={HEAD_CY + 5} textAnchor="middle"
          fontSize="10" fill="#4a7fa5" fontWeight="600">R</text>

        {/* ── Sensor dots + labels ── */}
        {sensors.map(s => {
          const color = s.temp !== null ? tempToColor(s.temp) : '#94a3b8'
          const inRange = s.temp !== null && s.temp >= safeRange.min && s.temp <= safeRange.max
          const isHot = s.temp !== null && s.temp > safeRange.max
          return (
            <g key={s.id}>
              {/* Pulse ring for hotspots */}
              {isHot && (
                <circle cx={s.cx} cy={s.cy} r={16} fill="none"
                  stroke={color} strokeWidth="2" opacity="0.5" />
              )}
              {/* Sensor dot */}
              <circle cx={s.cx} cy={s.cy} r={10}
                fill="white" stroke={color} strokeWidth="2.5" />
              <circle cx={s.cx} cy={s.cy} r={6} fill={color} />

              {/* Temp reading */}
              {s.temp !== null && showLabels && (
                <text
                  x={s.cx}
                  y={s.cy - 15}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="700"
                  fill={isHot ? '#dc2626' : '#1e3a4f'}
                >
                  {s.temp}°C
                </text>
              )}

              {/* Sensor abbreviation below dot */}
              {showLabels && (
                <text
                  x={s.cx}
                  y={s.cy + 22}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#4a7fa5"
                  fontWeight="500"
                >
                  {s.abbr}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* ── Colour scale legend ── */}
      <div className="flex items-center gap-2 w-full max-w-72">
        <span className="text-xs text-gray-400">Cold</span>
        <div
          className="flex-1 h-3 rounded-full"
          style={{
            background: 'linear-gradient(to right, rgb(75,182,229), rgb(20,184,166), rgb(34,197,94), rgb(249,115,22), rgb(220,38,38))'
          }}
        />
        <span className="text-xs text-gray-400">Hot</span>
      </div>
      <div className="flex justify-between w-full max-w-72 px-6">
        {['<10°C', '12°C', '18°C', '22°C', '>24°C'].map(t => (
          <span key={t} className="text-xs text-gray-400">{t}</span>
        ))}
      </div>
    </div>
  )
}
