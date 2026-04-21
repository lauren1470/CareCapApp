import { useState, useEffect, useRef } from 'react'

const SAFE_TEMP_MIN = 18
const SAFE_TEMP_MAX = 24
const SESSION_DURATION = 30 * 60

// Sensor layout — 4 down centre, 2 left, 2 right (evenly spaced)
export const SENSOR_PROFILES = [
  { id: 1, name: 'Front Centre', abbr: 'Fz',  cx: 200, cy: 110, coolRate: 1.00, offset:  0.0 },
  { id: 2, name: 'Mid Centre',   abbr: 'FCz', cx: 200, cy: 189, coolRate: 1.03, offset: -0.2 },
  { id: 3, name: 'Crown',        abbr: 'Cz',  cx: 200, cy: 268, coolRate: 1.06, offset: -0.4 },
  { id: 4, name: 'Back Centre',  abbr: 'Oz',  cx: 200, cy: 348, coolRate: 1.03, offset: -0.6 },
  { id: 5, name: 'Front Left',   abbr: 'F3',  cx: 115, cy: 165, coolRate: 0.92, offset:  1.4 },
  { id: 6, name: 'Back Left',    abbr: 'C3',  cx: 115, cy: 295, coolRate: 0.85, offset:  2.2 }, // likely hotspot
  { id: 7, name: 'Front Right',  abbr: 'F4',  cx: 285, cy: 165, coolRate: 0.96, offset:  0.6 },
  { id: 8, name: 'Back Right',   abbr: 'C4',  cx: 285, cy: 295, coolRate: 0.98, offset:  0.2 },
]

// ── Colour ramp ───────────────────────────────────────────────────────────────
export function tempToColor(temp) {
  const stops = [
    { t: 14, r: 37,  g: 99,  b: 235 },
    { t: 18, r: 75,  g: 182, b: 229 },
    { t: 22, r: 163, g: 206, b: 237 },
    { t: 26, r: 253, g: 224, b: 71  },
    { t: 30, r: 251, g: 146, b: 60  },
    { t: 36, r: 220, g: 38,  b: 38  },
  ]
  if (temp <= stops[0].t) return `rgb(${stops[0].r},${stops[0].g},${stops[0].b})`
  const last = stops[stops.length - 1]
  if (temp >= last.t) return `rgb(${last.r},${last.g},${last.b})`
  for (let i = 0; i < stops.length - 1; i++) {
    if (temp >= stops[i].t && temp <= stops[i + 1].t) {
      const ratio = (temp - stops[i].t) / (stops[i + 1].t - stops[i].t)
      const lerp = (a, b) => Math.round(a + (b - a) * ratio)
      return `rgb(${lerp(stops[i].r, stops[i + 1].r)},${lerp(stops[i].g, stops[i + 1].g)},${lerp(stops[i].b, stops[i + 1].b)})`
    }
  }
}

// ── Simulation helpers ────────────────────────────────────────────────────────
function generateSensorTemp(elapsed, profile, demo = false) {
  const base = elapsed < 600
    ? 34 - (elapsed / 600) * 12
    : 22 + Math.sin(elapsed / 120) * 1.5
  const cooled = 34 - (34 - base) * profile.coolRate
  const noise = (Math.random() - 0.5) * (demo ? 0.15 : 0.4)
  return Math.round((cooled + profile.offset + noise) * 10) / 10
}

const SAFE_PRESSURE_MIN = 1400
const SAFE_PRESSURE_MAX = 1930
const PRESSURE_BASE     = 1666

function generatePressure() {
  return Math.round(PRESSURE_BASE + (Math.random() - 0.5) * 80)
}

function avgPressure(p1, p2) {
  if (p1 === null && p2 === null) return null
  if (p1 === null) return p2
  if (p2 === null) return p1
  return Math.round((p1 + p2) / 2)
}

// ── BLE constants ─────────────────────────────────────────────────────────────
const BLE_SERVICE = '19b10000-e8f2-537e-4f6c-d104768a1214'
const BLE_CHAR    = '19b10001-e8f2-537e-4f6c-d104768a1214'

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSensorData() {
  const [connected, setConnected]               = useState(false)
  const [connectionMode, setConnectionMode]     = useState(null)  // 'demo' | 'live' | null
  const [sessionActive, setSessionActive]       = useState(false)
  const [sessionElapsed, setSessionElapsed]     = useState(0)
  const [phase, setPhase]                       = useState(null)
  const [treatmentStartElapsed, setTreatmentStartElapsed] = useState(null)
  const [pressure1, setPressure1]               = useState(null)
  const [pressure2, setPressure2]               = useState(null)
  const [sensors, setSensors]                   = useState(
    SENSOR_PROFILES.map(p => ({ ...p, temp: null }))
  )
  const [history, setHistory]   = useState([])
  const [alerts, setAlerts]     = useState([])

  // Refs for use inside intervals / event listeners
  const intervalRef        = useRef(null)
  const elapsedRef         = useRef(0)
  const tickCountRef       = useRef(0)
  const phaseRef           = useRef(null)
  const treatmentStartRef  = useRef(null)
  const connectionModeRef  = useRef(null)
  const sensorsRef         = useRef(sensors)
  const pressure1Ref       = useRef(null)
  const pressure2Ref       = useRef(null)
  const bleDeviceRef       = useRef(null)

  // Keep refs in sync with state
  useEffect(() => { sensorsRef.current  = sensors  }, [sensors])
  useEffect(() => { pressure1Ref.current = pressure1 }, [pressure1])
  useEffect(() => { pressure2Ref.current = pressure2 }, [pressure2])

  const validSensors = sensors.filter(s => s.temp !== null)
  const temperature = validSensors.length === sensors.length
    ? Math.round(validSensors.reduce((sum, s) => sum + s.temp, 0) / validSensors.length * 10) / 10
    : null

  // ── Connect: demo mode ──────────────────────────────────────────────────────
  const connectDemo = () => {
    connectionModeRef.current = 'demo'
    setConnectionMode('demo')
    setConnected(true)
    setSensors(SENSOR_PROFILES.map(p => ({ ...p, temp: Math.round((34 + p.offset) * 10) / 10 })))
    setPressure1(PRESSURE_BASE)
    setPressure2(PRESSURE_BASE)
    setHistory([])
    setAlerts([])
    elapsedRef.current = 0
    setSessionElapsed(0)
  }

  // ── Connect: live BLE mode ──────────────────────────────────────────────────
  const connectLive = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'CareCap' }],
        optionalServices: [BLE_SERVICE],
      })
      bleDeviceRef.current = device

      const server  = await device.gatt.connect()
      const service = await server.getPrimaryService(BLE_SERVICE)
      const char    = await service.getCharacteristic(BLE_CHAR)

      await char.startNotifications()
      char.addEventListener('characteristicvaluechanged', (e) => {
        const view = e.target.value
        const newSensors = SENSOR_PROFILES.map((p, i) => {
          const raw = Math.round(view.getFloat32(i * 4, true) * 10) / 10
          return { ...p, temp: raw < -100 ? null : raw }  // -999 sentinel → null
        })
        // Arduino sends 1.0 (good contact) or 0.0 (no contact)
        // Convert to realistic-looking Pa values for display
        const contact1 = view.getFloat32(32, true) > 0.5
        const contact2 = view.getFloat32(36, true) > 0.5
        const p1 = contact1 ? Math.round(PRESSURE_BASE + (Math.random() - 0.5) * 80) : 0
        const p2 = contact2 ? Math.round(PRESSURE_BASE + (Math.random() - 0.5) * 80) : 0
        setSensors(newSensors)
        setPressure1(p1)
        setPressure2(p2)
      })

      device.addEventListener('gattserverdisconnected', () => {
        connectionModeRef.current = null
        setConnectionMode(null)
        setConnected(false)
        setSessionActive(false)
        setPhase(null)
        phaseRef.current = null
        setSensors(SENSOR_PROFILES.map(p => ({ ...p, temp: null })))
        setPressure1(null)
        setPressure2(null)
        clearInterval(intervalRef.current)
      })

      connectionModeRef.current = 'live'
      setConnectionMode('live')
      setConnected(true)
      setHistory([])
      setAlerts([])
      elapsedRef.current = 0
      setSessionElapsed(0)
    } catch (err) {
      console.error('Bluetooth connection failed:', err)
    }
  }

  // ── Disconnect ───────────────────────────────────────────────────────────────
  const disconnect = () => {
    if (bleDeviceRef.current?.gatt?.connected) {
      bleDeviceRef.current.gatt.disconnect()
    }
    bleDeviceRef.current = null
    connectionModeRef.current = null
    setConnectionMode(null)
    setConnected(false)
    setSessionActive(false)
    setPhase(null)
    phaseRef.current = null
    setSensors(SENSOR_PROFILES.map(p => ({ ...p, temp: null })))
    setPressure1(null)
    setPressure2(null)
    clearInterval(intervalRef.current)
  }

  const startSession = () => {
    if (!connected) return
    setSessionActive(true)
    setPhase('cooling')
    setTreatmentStartElapsed(null)
    phaseRef.current = 'cooling'
    treatmentStartRef.current = null
    setHistory([])
    setAlerts([])
    elapsedRef.current = 0
    setSessionElapsed(0)
  }

  const stopSession = () => {
    setSessionActive(false)
    setPhase(null)
    phaseRef.current = null
    clearInterval(intervalRef.current)
  }

  // ── Session interval ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionActive) { clearInterval(intervalRef.current); return }

    tickCountRef.current = 0
    const isDemo = connectionModeRef.current === 'demo'
    // Demo: 100ms ticks, +1 sim-second each — smooth 10× speed counter
    // Live: 2000ms ticks, +2 sim-seconds each — real time
    const intervalMs = isDemo ? 100 : 2000
    const increment  = isDemo ? 1   : 2
    // Regenerate sensors every 4 demo ticks (= every 400ms) — smooth chart, no flicker
    const sensorEvery = isDemo ? 4 : 1

    intervalRef.current = setInterval(() => {
      tickCountRef.current += 1
      elapsedRef.current += increment
      const elapsed = elapsedRef.current
      setSessionElapsed(elapsed)

      // Only do the heavy simulation work on sensor ticks
      if (tickCountRef.current % sensorEvery !== 0) return

      // Demo: generate new sensor & pressure values
      // Live: use current values from BLE (already in state via refs)
      let currentSensors, newP1, newP2
      if (connectionModeRef.current === 'demo') {
        currentSensors = SENSOR_PROFILES.map(p => ({
          ...p,
          temp: generateSensorTemp(elapsed, p, true),
        }))
        newP1 = generatePressure()
        newP2 = generatePressure()
        setSensors(currentSensors)
        setPressure1(newP1)
        setPressure2(newP2)
      } else {
        currentSensors = sensorsRef.current
        newP1 = pressure1Ref.current
        newP2 = pressure2Ref.current
      }

      const validForAvg = currentSensors.filter(x => x.temp !== null)
      const avgTemp = validForAvg.length > 0
        ? Math.round(validForAvg.reduce((s, x) => s + x.temp, 0) / validForAvg.length * 10) / 10
        : null

      // Phase transition
      if (phaseRef.current === 'cooling' && avgTemp !== null && avgTemp <= SAFE_TEMP_MAX) {
        phaseRef.current = 'treatment'
        treatmentStartRef.current = elapsed
        setPhase('treatment')
        setTreatmentStartElapsed(elapsed)
      }

      const timestamp = new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })

      setHistory(prev => [
        ...prev,
        {
          time: timestamp, elapsed, temp: avgTemp,
          pressure: avgPressure(newP1, newP2),
          sensors: currentSensors,
        },
      ].slice(-150))

      // Alerts
      const newAlerts = []
      currentSensors.forEach(s => {
        if (elapsed > 120 && s.temp > SAFE_TEMP_MAX) {
          newAlerts.push({
            id: `${Date.now()}-${s.id}`,
            type: 'warning',
            message: `Hotspot: ${s.name} (${s.abbr}) at ${s.temp}°C — above safe range`,
            time: timestamp,
          })
        }
      })
      if (newP1 !== null && (newP1 > SAFE_PRESSURE_MAX || newP1 < SAFE_PRESSURE_MIN)) {
        newAlerts.push({
          id: `${Date.now()}-p1`,
          type: 'info',
          message: `Pressure sensor 1: ${newP1} Pa — check cap position`,
          time: timestamp,
        })
      }
      if (newP2 !== null && (newP2 > SAFE_PRESSURE_MAX || newP2 < SAFE_PRESSURE_MIN)) {
        newAlerts.push({
          id: `${Date.now()}-p2`,
          type: 'info',
          message: `Pressure sensor 2: ${newP2} Pa — check cap position`,
          time: timestamp,
        })
      }
      if (newAlerts.length) {
        setAlerts(prev => [...newAlerts, ...prev].slice(0, 20))
      }
    }, intervalMs)

    return () => clearInterval(intervalRef.current)
  }, [sessionActive])

  // ── Derived values ────────────────────────────────────────────────────────────
  const treatmentElapsed  = treatmentStartElapsed !== null ? sessionElapsed - treatmentStartElapsed : 0
  const treatmentRemaining = Math.max(0, SESSION_DURATION - treatmentElapsed)
  const treatmentProgress  = Math.min((treatmentElapsed / SESSION_DURATION) * 100, 100)
  const coolingProgress    = temperature !== null
    ? Math.min(Math.max((34 - temperature) / (34 - SAFE_TEMP_MAX) * 100, 0), 100)
    : 0

  const status = () => {
    if (!connected) return 'disconnected'
    if (!sessionActive) return 'idle'
    if (phase === 'cooling') return 'cooling'
    if (temperature === null) return 'idle'
    const anyHot      = sensors.some(s => s.temp !== null && s.temp > SAFE_TEMP_MAX)
    const anyFreezing = sensors.some(s => s.temp !== null && s.temp < SAFE_TEMP_MIN)
    if (anyHot || anyFreezing) return 'warning'
    return 'ok'
  }

  return {
    connected,
    connectionMode,
    sessionActive,
    sessionElapsed,
    phase,
    treatmentElapsed,
    treatmentRemaining,
    treatmentProgress,
    coolingProgress,
    temperature,
    pressure1,
    pressure2,
    pressure: avgPressure(pressure1, pressure2),
    sensors,
    history,
    alerts,
    status: status(),
    progressPercent: treatmentProgress,
    safeRange: { min: SAFE_TEMP_MIN, max: SAFE_TEMP_MAX },
    connectDemo,
    connectLive,
    disconnect,
    startSession,
    stopSession,
  }
}
