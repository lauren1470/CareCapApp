import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { Bluetooth, Play, Square, Clock, AlertTriangle, Info, CheckCircle, Snowflake, FlaskConical, Download } from 'lucide-react'
import ScalpHeatmap from './ScalpHeatmap'
import SensorGrid from './SensorGrid'
import { exportSessionXLSX } from '../utils/exportSession'

function StatCard({ label, value, unit, status, sub }) {
  const borderColor = status === 'ok' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#a3ceed'
  return (
    <div className="rounded-xl p-4 shadow-sm" style={{ background: 'white', border: `2px solid ${borderColor}` }}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: '#1e3a4f' }}>
        {value !== null ? `${value}${unit}` : '—'}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function AlertBadge({ alert }) {
  const Icon = alert.type === 'warning' ? AlertTriangle : Info
  const color = alert.type === 'warning' ? '#f59e0b' : '#75b6e5'
  const bg = alert.type === 'warning' ? '#fef3c7' : '#e0f0fb'
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg text-sm" style={{ background: bg }}>
      <Icon size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <div>
        <span style={{ color: '#1e3a4f' }}>{alert.message}</span>
        <span className="text-gray-400 ml-2 text-xs">{alert.time}</span>
      </div>
    </div>
  )
}

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

export default function ClinicalDashboard({ data }) {
  const {
    connected, connectionMode, sessionActive, sessionElapsed, temperature, pressure, pressure1, pressure2,
    phase, treatmentElapsed, treatmentRemaining, treatmentProgress, coolingProgress,
    sensors, history, alerts, status, safeRange,
    connectDemo, connectLive, disconnect, startSession, stopSession,
  } = data

  const tempStatus = temperature === null ? 'neutral'
    : temperature >= safeRange.min && temperature <= safeRange.max ? 'ok' : 'warning'

  const chartData = history.slice(-60).map(d => ({
    time: d.time,
    'Avg Temp': d.temp,
    Pressure: d.pressure,
  }))

  // Build per-sensor chart lines from history
  const sensorChartData = history.slice(-60).map(d => {
    const row = { time: d.time }
    if (d.sensors) d.sensors.forEach(s => { row[s.abbr] = s.temp })
    return row
  })

  const sensorColors = ['#75b6e5', '#a3ceed', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316']

  return (
    <div className="w-full px-6 lg:px-10 xl:px-14 py-4 sm:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-5">

        {/* ── COLUMN 1: Controls + stats ── */}
        <div className="flex flex-col gap-4">
          {/* Session control card */}
          <div className="rounded-xl p-4 shadow-sm" style={{ background: 'white' }}>
            <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">Session Control</h2>
            {sessionActive && phase === 'cooling' && (
              <div className="mb-4 rounded-lg p-3" style={{ background: '#e0f0fb' }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: '#75b6e5' }}>
                  <Snowflake size={12} /> Phase 1 — Cooling Down
                </div>
                <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full transition-all"
                    style={{ width: `${coolingProgress}%`, background: 'linear-gradient(to right, #ef4444, #75b6e5)' }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Elapsed: {formatTime(sessionElapsed)}</span>
                  <span>{Math.round(coolingProgress)}%</span>
                </div>
              </div>
            )}
            {sessionActive && phase === 'treatment' && (
              <div className="mb-4 rounded-lg p-3" style={{ background: '#dcfce7' }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: '#16a34a' }}>
                  <Clock size={12} /> Phase 2 — Treatment Session
                </div>
                <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full transition-all"
                    style={{ width: `${treatmentProgress}%`, background: 'linear-gradient(to right, #a3ceed, #75b6e5)' }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(treatmentElapsed)} elapsed</span>
                  <span>{formatTime(treatmentRemaining)} left</span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {!connected ? (
                <div className="flex flex-col gap-2">
                  <button onClick={connectDemo}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white font-medium text-sm"
                    style={{ background: '#f59e0b' }}>
                    <FlaskConical size={15} /> Demo Session
                  </button>
                  <button onClick={connectLive}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white font-medium text-sm"
                    style={{ background: '#75b6e5' }}>
                    <Bluetooth size={15} /> Connect Live
                  </button>
                </div>
              ) : (
                <>
                  {!sessionActive ? (
                    <button onClick={startSession}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white font-medium text-sm"
                      style={{ background: '#22c55e' }}>
                      <Play size={15} /> Start Session
                    </button>
                  ) : (
                    <button onClick={stopSession}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white font-medium text-sm"
                      style={{ background: '#ef4444' }}>
                      <Square size={15} /> End Session
                    </button>
                  )}
                  <button onClick={disconnect}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm border font-medium"
                    style={{ borderColor: '#a3ceed', color: '#75b6e5', background: 'white' }}>
                    Disconnect
                  </button>
                </>
              )}
              {history.length > 0 && (
                <button
                  onClick={() => exportSessionXLSX({ history, alerts, safeRange, sessionElapsed })}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm border font-medium"
                  style={{ borderColor: '#22c55e', color: '#16a34a', background: 'white' }}>
                  <Download size={14} /> Export Session Data
                </button>
              )}
            </div>
          </div>

          {/* Overall stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Avg Temp" value={temperature} unit="°C"
              status={tempStatus} sub={`Range: ${safeRange.min}–${safeRange.max}°C`} />
            <StatCard label="Session" value={sessionActive ? formatTime(sessionElapsed) : null}
              unit="" status="neutral" sub="30 min target" />
            <StatCard label="Pressure 1" value={pressure1} unit=" Pa"
              status={pressure1 !== null && (pressure1 < 1400 || pressure1 > 1930) ? 'warning' : 'ok'}
              sub="Target: 1,400–1,930 Pa" />
            <StatCard label="Pressure 2" value={pressure2} unit=" Pa"
              status={pressure2 !== null && (pressure2 < 1400 || pressure2 > 1930) ? 'warning' : 'ok'}
              sub="Target: 1,400–1,930 Pa" />
            <StatCard label="Status"
              value={connected ? (sessionActive ? 'Active' : 'Idle') : 'Off'}
              unit="" status={status === 'ok' ? 'ok' : status === 'warning' ? 'warning' : 'neutral'}
              sub={connected ? `Avg pressure: ${pressure ?? '—'} Pa` : undefined} />
          </div>

          {/* Clinical reference */}
          <div className="rounded-xl p-3 text-xs" style={{ background: '#e0f0fb', color: '#1e3a4f' }}>
            <div className="font-semibold mb-2">Clinical Reference</div>
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#dc2626' }} />
                <span>Poor Cooling: <strong>&gt;24°C</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#f97316' }} />
                <span>Suboptimal: <strong>22–24°C</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                <span>Effective: <strong>18–22°C</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#14b8a6' }} />
                <span>Optimal: <strong>12–15°C</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#75b6e5' }} />
                <span>Too Cold: <strong>&lt;10°C</strong></span>
              </div>
            </div>
            <div>Session duration: <strong>30 min</strong></div>
            <div>Pressure range: <strong>1,400–1,930 Pa</strong></div>
            <div className="mt-1 text-gray-500">Protocol: pre/during/post chemotherapy</div>
          </div>

          {/* Alerts */}
          <div className="rounded-xl p-4 shadow-sm" style={{ background: 'white' }}>
            <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">Alerts & Events</h2>
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle size={15} /> No alerts — session running normally
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {alerts.map(a => <AlertBadge key={a.id} alert={a} />)}
              </div>
            )}
          </div>
        </div>

        {/* ── COLUMN 2: Scalp heatmap + sensor grid ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl p-4 shadow-sm" style={{ background: 'white' }}>
            <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">Scalp Temperature Map</h2>
            <ScalpHeatmap sensors={sensors} safeRange={safeRange} showLabels={true} />
          </div>
        </div>

        {/* ── COLUMNS 3–4: Charts + sensor grid + alerts ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Per-sensor numerical grid */}
          <div className="rounded-xl p-4 shadow-sm" style={{ background: 'white' }}>
            <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">
              Individual Sensors
            </h2>
            <SensorGrid sensors={sensors} safeRange={safeRange} />
          </div>

          {/* Per-sensor temperature chart */}
          <div className="rounded-xl p-4 shadow-sm" style={{ background: 'white' }}>
            <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">
              All Sensors — Live (°C)
            </h2>
            {sensorChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sensorChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f7fc" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis domain={[10, 38]} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={safeRange.max} stroke="#f59e0b" strokeDasharray="4 2" />
                  <ReferenceLine y={safeRange.min} stroke="#f59e0b" strokeDasharray="4 2" />
                  {sensors.map((s, i) => (
                    <Line key={s.id} type="monotone" dataKey={s.abbr}
                      stroke={sensorColors[i]} strokeWidth={1.5} dot={false}
                      isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Start a session to see live data
              </div>
            )}
            {/* Legend */}
            {sensors.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {sensors.map((s, i) => (
                  <span key={s.id} className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="w-3 h-0.5 rounded inline-block" style={{ background: sensorColors[i] }} />
                    {s.abbr}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Pressure chart */}
          <div className="rounded-xl p-4 shadow-sm" style={{ background: 'white' }}>
            <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">
              Pressure (Pa) — Live
            </h2>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f7fc" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis domain={[1000, 2400]} tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <ReferenceLine y={1930} stroke="#f59e0b" strokeDasharray="4 2" />
                  <ReferenceLine y={1400} stroke="#f59e0b" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="Pressure" stroke="#a3ceed"
                    strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-28 flex items-center justify-center text-gray-400 text-sm">
                Pressure data will appear here
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
