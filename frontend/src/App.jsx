import { useState } from 'react'
import PatientDashboard from './components/PatientDashboard'
import ClinicalDashboard from './components/ClinicalDashboard'
import Header from './components/Header'
import { useSensorData } from './hooks/useSensorData'
import './index.css'

export default function App() {
  const [mode, setMode] = useState('patient') // 'patient' | 'clinical'
  const sensorData = useSensorData()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0f7fc' }}>
      <Header mode={mode} setMode={setMode} connected={sensorData.connected} connectionMode={sensorData.connectionMode} />
      <main className="flex-1 flex flex-col">
        {mode === 'patient'
          ? <PatientDashboard data={sensorData} />
          : <ClinicalDashboard data={sensorData} />
        }
      </main>
    </div>
  )
}
