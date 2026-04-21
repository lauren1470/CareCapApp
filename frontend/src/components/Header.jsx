import { Bluetooth, BluetoothOff, Stethoscope, Heart, FlaskConical } from 'lucide-react'
import logo from '../assets/carecap-logo.png'

export default function Header({ mode, setMode, connected, connectionMode }) {
  const statusStyle = () => {
    if (!connected)                  return 'bg-white/20 text-white'
    if (connectionMode === 'demo')   return 'bg-amber-100 text-amber-700'
    return 'bg-green-100 text-green-700'
  }

  const statusLabel = () => {
    if (!connected)                  return <><BluetoothOff size={14} /> Not Connected</>
    if (connectionMode === 'demo')   return <><FlaskConical size={14} /> Demo Mode</>
    return <><Bluetooth size={14} /> Live Connected</>
  }

  return (
    <header style={{ background: '#75b6e5' }} className="shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo + Name */}
        <div className="flex items-center gap-2">
          <img src={logo} alt="CareCap logo" className="h-9 w-auto" />
          <p className="text-blue-100 text-xs font-medium">Scalp Cooling Monitor</p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2 bg-white/20 rounded-full p-1">
          <button
            onClick={() => setMode('patient')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              mode === 'patient'
                ? 'bg-white text-blue-600 shadow'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Heart size={14} />
            Patient
          </button>
          <button
            onClick={() => setMode('clinical')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              mode === 'clinical'
                ? 'bg-white text-blue-600 shadow'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Stethoscope size={14} />
            Clinical
          </button>
        </div>

        {/* Connection status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusStyle()}`}>
          {statusLabel()}
        </div>
      </div>
    </header>
  )
}
