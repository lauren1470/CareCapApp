import { Bluetooth, Play, Square, Clock, Thermometer, Snowflake, FlaskConical, Download } from 'lucide-react'
import ScalpHeatmap from './ScalpHeatmap'
import { exportSessionXLSX } from '../utils/exportSession'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const STATUS_CONFIG = {
  disconnected: { color: '#94a3b8', label: 'Connect your CareCap to begin',                emoji: '⚪', bg: '#f1f5f9' },
  idle:         { color: '#75b6e5', label: 'Ready to start your session',                  emoji: '🔵', bg: '#e0f0fb' },
  cooling:      { color: '#75b6e5', label: 'Cap is cooling down — please wait',            emoji: '❄️', bg: '#e0f0fb' },
  ok:           { color: '#22c55e', label: 'Everything looks great!',                      emoji: '🟢', bg: '#dcfce7' },
  warning:      { color: '#f59e0b', label: 'Check your cap — something needs attention',   emoji: '🟡', bg: '#fef3c7' },
}

function PhaseTimer({ phase, sessionElapsed, treatmentElapsed, treatmentRemaining, treatmentProgress, coolingProgress }) {
  if (!phase) return null

  if (phase === 'cooling') {
    return (
      <div className="rounded-2xl p-5 shadow-sm" style={{ background: 'white' }}>
        <div className="flex items-center gap-2 mb-1">
          <Snowflake size={15} style={{ color: '#75b6e5' }} />
          <span className="text-sm font-semibold" style={{ color: '#75b6e5' }}>Phase 1 — Cooling Down</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">Waiting for cap to reach target temperature…</p>

        {/* Temperature progress bar */}
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>34°C (body temp)</span>
          <span>24°C (target)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-1000"
            style={{
              width: `${coolingProgress}%`,
              background: 'linear-gradient(to right, #ef4444, #75b6e5)',
            }}
          />
        </div>
        <div className="text-right text-xs mt-1.5 text-gray-400">
          Elapsed: {formatTime(sessionElapsed)}
        </div>
      </div>
    )
  }

  // treatment phase
  return (
    <div className="rounded-2xl p-5 shadow-sm" style={{ background: 'white' }}>
      <div className="flex items-center gap-2 mb-1">
        <Clock size={15} style={{ color: '#22c55e' }} />
        <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>Phase 2 — Treatment Session</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">Cap is at temperature — session in progress</p>

      {/* 30-min countdown bar */}
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{formatTime(treatmentElapsed)} elapsed</span>
        <span>30:00 total</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-1000"
          style={{
            width: `${treatmentProgress}%`,
            background: 'linear-gradient(to right, #a3ceed, #75b6e5)',
          }}
        />
      </div>
      <div className="text-right text-sm mt-2 font-semibold" style={{ color: '#22c55e' }}>
        {formatTime(treatmentRemaining)} remaining
      </div>
    </div>
  )
}

export default function PatientDashboard({ data }) {
  const {
    connected, sessionActive, sessionElapsed,
    phase, treatmentElapsed, treatmentRemaining, treatmentProgress, coolingProgress,
    temperature, sensors, history, alerts, status, safeRange,
    connectDemo, connectLive, disconnect, startSession, stopSession,
  } = data

  const s = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected
  const inRange = temperature !== null && temperature >= safeRange.min && temperature <= safeRange.max

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full">
    <div className="w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

        {/* ── LEFT: Status + controls ── */}
        <div className="flex flex-col gap-5 justify-center">

          {/* Status card */}
          <div
            className="rounded-3xl p-6 flex flex-col items-center gap-4 shadow-sm text-center"
            style={{ background: s.bg, border: `2px solid ${s.color}` }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-md"
              style={{
                background: 'white',
                border: `5px solid ${s.color}`,
                boxShadow: status === 'ok' ? `0 0 28px ${s.color}66` : undefined,
              }}
            >
              {s.emoji}
            </div>
            <p className="text-lg font-semibold" style={{ color: '#1e3a4f' }}>{s.label}</p>

            {temperature !== null && (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  background: 'white',
                  color: inRange ? '#1e3a4f' : '#d97706',
                  border: `1.5px solid ${inRange ? '#a3ceed' : '#fbbf24'}`,
                }}
              >
                <Thermometer size={14} />
                Avg {temperature}°C
                <span className="text-gray-400 font-normal">· target {safeRange.min}–{safeRange.max}°C</span>
              </div>
            )}
          </div>

          {/* Phase timer */}
          {sessionActive && (
            <PhaseTimer
              phase={phase}
              sessionElapsed={sessionElapsed}
              treatmentElapsed={treatmentElapsed}
              treatmentRemaining={treatmentRemaining}
              treatmentProgress={treatmentProgress}
              coolingProgress={coolingProgress}
            />
          )}

          {/* Controls */}
          <div className="flex flex-col gap-3">
            {!connected ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={connectDemo}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-semibold text-lg shadow-lg active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <FlaskConical size={20} /> Demo Session
                </button>
                <button
                  onClick={connectLive}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-semibold text-lg shadow-lg active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg, #75b6e5, #a3ceed)' }}
                >
                  <Bluetooth size={20} /> Connect Live
                </button>
              </div>
            ) : (
              <>
                {!sessionActive ? (
                  <button
                    onClick={startSession}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-semibold text-lg shadow-lg active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                  >
                    <Play size={20} /> Start Session
                  </button>
                ) : (
                  <button
                    onClick={stopSession}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-semibold text-lg shadow-lg active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                  >
                    <Square size={20} /> End Session
                  </button>
                )}
                <button
                  onClick={disconnect}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-medium border-2 transition-colors hover:bg-blue-50"
                  style={{ borderColor: '#a3ceed', color: '#75b6e5', background: 'white' }}
                >
                  Disconnect
                </button>
              </>
            )}
            {history.length > 0 && (
              <button
                onClick={() => exportSessionXLSX({ history, alerts, safeRange, sessionElapsed })}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-medium border-2 transition-colors hover:bg-green-50"
                style={{ borderColor: '#22c55e', color: '#16a34a', background: 'white' }}
              >
                <Download size={18} /> Export Session Data
              </button>
            )}
          </div>

          {/* Tip */}
          <div className="rounded-2xl p-4 text-sm" style={{ background: '#e0f0fb', color: '#1e3a4f' }}>
            💡 <strong>Tip:</strong> Scalp cooling works best when the cap fits snugly all over your head.
            Let your nurse know if anything feels uncomfortable.
          </div>
        </div>

        {/* ── RIGHT: Scalp temperature map ── */}
        <div
          className="w-full rounded-3xl shadow-sm flex flex-col items-center justify-center"
          style={{ background: 'white' }}
        >
          <h2 className="text-base font-semibold pt-5 pb-1" style={{ color: '#4a7fa5' }}>
            Scalp Temperature Map
          </h2>
          {connected ? (
            <div className="w-full pt-2 pb-5 px-3 flex flex-col items-center">
              <ScalpHeatmap sensors={sensors} safeRange={safeRange} showLabels={true} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-20 px-6">
              <div className="text-5xl opacity-30">🧠</div>
              <p className="text-sm text-gray-400 text-center">
                Connect your CareCap to see a live temperature map of your scalp
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
    </div>
  )
}
