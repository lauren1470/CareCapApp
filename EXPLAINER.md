# CareCap App — How It Works

This document explains how the app was built and what each part does

---

## The Big Picture

The app is a **web dashboard** that connects to the CareCap hardware via Bluetooth and displays live temperature and pressure data from the sensors in the cap. It has two views — one designed for the patient, one for a clinician — and can also run in a simulated demo mode without any hardware.

```
Arduino (hardware) ──── Bluetooth ────► Web App (browser)
  8 temp sensors                          Patient view
  2 pressure sensors                      Clinical view
                                          Demo mode (no hardware needed)
```

---

## Tech Stack — What Was Used and Why

| Technology | What it is | Why we used it |
|---|---|---|
| **React** | JavaScript framework for building UIs | Makes it easy to build interactive components that update in real time |
| **Vite** | Build tool / development server | Fast to set up, runs the app locally during development |
| **Tailwind CSS** | CSS utility framework | Lets you style things directly in the code without writing separate CSS files |
| **Recharts** | Chart library for React | Draws the live temperature and pressure graphs |
| **ExcelJS** | Excel file generator | Creates the formatted .xlsx session export |
| **Web Bluetooth API** | Browser API built into Chrome/Edge | Allows the browser to connect directly to Bluetooth devices — no app install needed |
| **Lucide React** | Icon library | All the small icons (Bluetooth symbol, thermometer, etc.) |

---

## File Structure Explained

```
frontend/src/
├── App.jsx                  — Root of the app, switches between Patient and Clinical views
├── main.jsx                 — Entry point, mounts the app into the HTML page
│
├── components/
│   ├── Header.jsx           — Top bar: logo, Patient/Clinical toggle, connection status
│   ├── PatientDashboard.jsx — Simple patient-facing view
│   ├── ClinicalDashboard.jsx— Detailed clinical view with charts and data
│   ├── ScalpHeatmap.jsx     — The SVG head diagram with colour-coded temperature blobs
│   └── SensorGrid.jsx       — The grid of 8 individual sensor cards
│
├── hooks/
│   └── useSensorData.js     — The brain of the app (explained in detail below)
│
└── utils/
    └── exportSession.js     — Generates the formatted Excel file download
```

---

## The Brain: `useSensorData.js`

This is the most important file. It's a **React hook** — a reusable block of logic that manages all the app's data and state. Both dashboards pull all their data from this single hook.

It handles four things:

### 1. Sensor State
Keeps track of the current readings for all 8 temperature sensors and 2 pressure sensors. Each sensor has a fixed position on the head (mapped to EEG location names like Fz, Cz, C3 etc.) which tells the heatmap where to draw it.

```
Sensor positions on the head (top-down view):

          FRONT
    F3  Fz  F4
    C3  FCz  C4
        Cz
        Oz
          BACK
```

### 2. Demo Mode vs Live Mode

**Demo mode** (`connectDemo`): No hardware needed. The app simulates a full cooling session using a mathematical curve:
- Starts at 34°C (body temperature)
- Cools to ~14°C over about 70 simulated seconds
- Each sensor cools at a slightly different rate, mimicking real-world variation
- Runs at 10× real speed so a full 30-minute session can be demonstrated in ~3 minutes

**Live mode** (`connectLive`): Uses the **Web Bluetooth API** built into Chrome/Edge to connect directly to the Arduino. When the user clicks "Connect Live", the browser shows a Bluetooth device picker, the user selects "CareCap", and the app starts receiving data. The Arduino sends a 40-byte package every 500ms:
- Bytes 0–31: 8 temperature readings (4 bytes each, as floating point numbers)
- Bytes 32–35: Pressure sensor 1 (1.0 = contact, 0.0 = no contact)
- Bytes 36–39: Pressure sensor 2 (1.0 = contact, 0.0 = no contact)

The pressure sensors only tell the app whether the cap is making contact or not (they're digital on/off sensors). The app converts this into a realistic-looking Pa value around 2,700 Pa for display purposes.

### 3. Session Timing and Phases

When a session starts, it goes through two phases:

**Phase 1 — Cooling Down**: The cap is cooling from body temperature. A progress bar shows how close the average temperature is to the target range. This phase ends automatically when the average temperature drops below 24°C.

**Phase 2 — Treatment**: The 30-minute treatment timer starts. This would be adjusted during further development to adapt to various chemotherapy cycles. The app counts down the remaining time and shows progress.

### 4. Alerts

Every tick, the app checks:
- Is any sensor above 24°C? → **Hotspot warning** (red)
- Is any sensor below 10°C? → **Too cold warning** (blue)
- Is either pressure sensor showing no contact? → **Check cap position** info alert

Alerts are displayed in the panel on the left of the Clinical view and are saved with timestamps.

---

## The Heatmap: `ScalpHeatmap.jsx`

The scalp map is drawn using **SVG** (Scalable Vector Graphics) — basically a drawing language built into web browsers. 

For each of the 8 sensors, it draws a **radial gradient blob** (a circle that fades out from the centre) positioned at that sensor's location on the head outline. Each blob is coloured based on the sensor's temperature using a colour scale:

| Colour | Temperature | Meaning |
|---|---|---|
| Blue | < 10°C | Too Cold |
| Teal | 12–15°C | Optimal Cooling |
| Green | 18–22°C | Effective Cooling |
| Orange | 22–24°C | Suboptimal |
| Red | > 24°C | Poor Cooling |

All the blobs are blurred with a Gaussian blur filter so they blend smoothly into each other, creating the heatmap effect. The whole thing is clipped to the head outline shape.

---

## The Two Dashboards

### Patient Dashboard (`PatientDashboard.jsx`)
Designed to be simple and reassuring. Shows:
- A large coloured status circle (green = all good, amber = attention needed)
- The current average temperature
- A progress bar for whichever phase is active
- The scalp heatmap
- Basic connect/start/stop controls

### Clinical Dashboard (`ClinicalDashboard.jsx`)
Designed for a nurse or clinician. Shows everything:
- Session controls and phase progress
- Four stat cards: average temperature, session time, pressure sensor 1, pressure sensor 2
- The scalp heatmap
- A grid of all 8 individual sensor cards with real-time temperatures
- A live line chart showing all 8 sensors over the last 60 readings
- A live pressure chart
- An alerts panel
- A clinical reference guide
- An export button that downloads a formatted Excel file

---

## The Export: `exportSession.js`

When the export button is clicked, this function uses the **ExcelJS** library to build a formatted `.xlsx` file entirely in the browser (no server needed) and triggers a download.

The file has two sheets:
- **Summary**: Session metadata, per-sensor min/avg/max statistics (with hotspot cells highlighted red), alerts log, clinical reference
- **Raw Data**: Every recorded data point with timestamps, with out-of-range sensor cells colour-coded

---

## The Arduino Code

The Arduino Nano 33 BLE reads from:
- **8 NTC thermistors** (on pins A0–A7): These are temperature-sensitive resistors. The resistance changes with temperature. The Arduino reads the voltage across a voltage divider, converts it to resistance, then uses the Steinhart-Hart equation (simplified to the B-parameter equation) to convert resistance to temperature in °C.
- **2 digital contact sensors** (on pins 2 and 3): Simple on/off. When the cap is making good contact, the pin reads LOW (pulled to ground). The internal pull-up resistor means it reads HIGH when not pressed.

It then packs all 10 values into a 40-byte BLE characteristic and notifies any connected device every 500ms.

---

## How It All Connects

```
User opens app in Chrome
        │
        ▼
App.jsx loads — creates one useSensorData() hook
        │
        ├── Shows Header (logo, mode toggle, connection status)
        │
        └── Shows either PatientDashboard or ClinicalDashboard
                    │
                    │  both read from the same hook data
                    │
                    ▼
            useSensorData()
                    │
         ┌──────────┴──────────┐
    Demo mode              Live mode
    (simulated)        (Web Bluetooth)
                            │
                        Arduino
                            │
                    8 temp sensors
                    2 pressure sensors
```

---

## How to Make Common Changes

Almost everything that would need adjusting is in one file: **`frontend/src/hooks/useSensorData.js`**. The constants at the very top of that file control the key values.

---

### Change the temperature thresholds

```js
// useSensorData.js — top of file
const SAFE_TEMP_MIN = 18       // lower bound of Effective Cooling
const SAFE_TEMP_MAX = 24       // upper bound / hotspot threshold
const TOO_COLD_THRESHOLD = 10  // below this triggers a "too cold" warning
```

Changing these will automatically update the alerts, the stat card warning colours, and the session phase transition (cooling → treatment triggers when avg temp drops below `SAFE_TEMP_MAX`).

> **Note:** The colour scale on the heatmap is defined separately in the `tempToColor()` function just below — update the temperature stop values there too if you want the colours to match.

---

### Change the pressure safe range

```js
// useSensorData.js — top of file
const SAFE_PRESSURE_MIN = 2200
const SAFE_PRESSURE_MAX = 3200
const PRESSURE_BASE     = 2700  // midpoint used for demo values
```

Also update the matching values in `ClinicalDashboard.jsx` (the stat card sub-labels and chart reference lines) and `exportSession.js` (the clinical reference table in the Excel export).

---

### Change the session duration

```js
// useSensorData.js — top of file
const SESSION_DURATION = 30 * 60  // in seconds — change 30 to however many minutes
```

---

### Change how the demo cools down

```js
// useSensorData.js — generateSensorTemp() function
const base = elapsed < 700
  ? 34 - (elapsed / 700) * 20   // cooling phase: 34°C → 14°C over 700 sim-seconds
  : 14 + Math.sin(elapsed / 150) * 1.0  // maintenance: gentle oscillation around 14°C
```

- Increase `700` to make cooling take longer
- Change the `* 20` to cool to a different target (e.g. `* 16` would cool to 18°C instead of 14°C)
- Change the final `14` to shift the maintenance temperature up or down

---

### Add or move a sensor

Sensors are defined as an array in `useSensorData.js`:

```js
export const SENSOR_PROFILES = [
  { id: 1, name: 'Front Centre', abbr: 'Fz',  cx: 200, cy: 110, coolRate: 1.00, offset:  0.0 },
  // ...
]
```

- `cx` and `cy` are the pixel coordinates on the heatmap SVG (the viewBox is 400×460, head centre is roughly x=200, y=232)
- `coolRate` controls how fast this sensor cools in demo mode (>1 = faster, <1 = slower)
- `offset` adds a fixed temperature offset in demo mode (positive = warmer, negative = cooler)
- The **order of the array must match the order the Arduino sends the sensors** (index 0 = first float in the BLE payload)

---

### Change the clinical reference categories

The colour-coded reference box in the Clinical view is in `ClinicalDashboard.jsx`:

```jsx
<span>Poor Cooling: <strong>&gt;24°C</strong></span>
<span>Suboptimal: <strong>22–24°C</strong></span>
<span>Effective: <strong>18–22°C</strong></span>
<span>Optimal: <strong>12–15°C</strong></span>
<span>Too Cold: <strong>&lt;10°C</strong></span>
```

Update the text here and in the `README.md` clinical reference table to match.

---

### Add a new alert type

Alerts are generated inside the `setInterval` in `useSensorData.js`. Find the `// Alerts` section and add a new check following the same pattern:

```js
const newAlerts = []

// Existing example:
currentSensors.forEach(s => {
  if (elapsed > 120 && s.temp > SAFE_TEMP_MAX) {
    newAlerts.push({
      id: `${Date.now()}-${s.id}`,
      type: 'warning',   // 'warning' = amber, 'info' = blue
      message: `Hotspot: ${s.name} at ${s.temp}°C`,
      time: timestamp,
    })
  }
})

// Add your own check in the same way
```

---

## Running It

```bash
cd frontend
npm install    # only needed once
npm run dev    # starts the development server
```

Open **Chrome or Edge** at `http://localhost:5173`. Firefox and Safari don't support Web Bluetooth so the live connection won't work in those browsers — demo mode will still work fine.
