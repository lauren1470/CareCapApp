# CareCap — Scalp Cooling Monitoring System

A real-time monitoring dashboard for a scalp cooling cap used during chemotherapy treatment. Built as a university Dragons' Den pitch project.

The system uses 8 NTC thermistor sensors and 2 contact pressure sensors embedded in a cooling cap, connected via Bluetooth Low Energy (BLE) to a React web dashboard. The dashboard provides both a **patient-facing view** (simple status and temperature map) and a **clinical view** (detailed charts, sensor grid, alerts, and session export).

---

## Project Structure

```
CareCapApp/
├── frontend/              # React + Vite web dashboard
│   └── src/
│       ├── components/    # UI components (dashboards, heatmap, sensor grid)
│       ├── hooks/         # useSensorData — BLE connection + session logic
│       └── utils/         # exportSession — Excel session export
└── care_cap_arduino/      # Arduino firmware for the Nano 33 BLE
```

---

## Hardware

| Component | Details |
|---|---|
| Microcontroller | Arduino Nano 33 BLE |
| Temperature sensors | 8× NTC thermistor (10kΩ, B=3977) on pins A0–A7 |
| Pressure sensors | 2× digital contact sensor on pins 2 and 4 |
| Power | USB or battery via Nano 33 BLE |

### Sensor Positions (mapped to EEG locations)

| Pin | Position | App label |
|---|---|---|
| A0 | Front Centre | Fz |
| A1 | Mid Centre | FCz |
| A2 | Crown | Cz |
| A3 | Back Centre | Oz |
| A4 | Front Left | F3 |
| A5 | Back Left | C3 |
| A6 | Front Right | F4 |
| A7 | Back Right | C4 |

---

## Arduino Setup

1. Open `care_cap_arduino/care_cap_arduino.ino` in Arduino IDE
2. Install required library: **Sketch → Include Library → Manage Libraries → search "ArduinoBLE" → Install**
3. Select board: **Tools → Board → Arduino Mbed OS Nano Boards → Arduino Nano 33 BLE**
4. Select port: **Tools → Port → (your COM port)**
5. Upload — open Serial Monitor at **115200 baud** to confirm:
   ```
   CareCap BLE ready — waiting for connection...
   ```

---

## Web App Setup

Requires [Node.js](https://nodejs.org) (v18+).

```bash
cd frontend
npm install
npm run dev
```

Then open **Chrome or Edge** (Web Bluetooth is not supported in Firefox or Safari) and go to `http://localhost:5173`.

### Connecting to the Arduino

1. Make sure the Arduino is powered on and showing `CareCap BLE ready` in Serial Monitor
2. Click **Connect Live** in the app
3. Select **CareCap** from the browser's Bluetooth picker
4. Click **Pair** — sensor data will appear immediately

### Demo Mode

Click **Demo Session** to run a simulated session without the hardware. The demo runs at 10× speed to show a full cooling and treatment cycle within a few minutes.

---

## Dashboard Modes

### Patient View
Simple status display with a scalp temperature heatmap, phase timer, and basic controls. Designed to be easy to read at a glance.

### Clinical View
Full monitoring dashboard with:
- Per-sensor temperature grid and live charts
- Pressure sensor readings
- Alerts for hotspots or poor cap contact
- Session export to formatted Excel (.xlsx)

---

## Clinical Reference

| Category | Temperature |
|---|---|
| 🔴 Poor Cooling | >24°C |
| 🟠 Suboptimal Cooling | 22–24°C |
| 🟢 Effective Cooling | 18–22°C |
| 🩵 Optimal Cooling | 12–15°C |
| 🔵 Too Cold | <10°C |

| Parameter | Value |
|---|---|
| Session duration | 30 minutes |
| Pressure (good contact) | 1,400–1,930 Pa |
| Protocol | Pre / during / post chemotherapy |

---

## Browser Requirements

| Browser | Supported |
|---|---|
| Chrome | ✅ |
| Edge | ✅ |
| Firefox | ❌ (no Web Bluetooth) |
| Safari | ❌ (no Web Bluetooth) |

The app must be served from **localhost** or **HTTPS** for Web Bluetooth to work.

---

## Tech Stack

- [React](https://react.dev) + [Vite](https://vitejs.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Recharts](https://recharts.org) — live sensor charts
- [ExcelJS](https://github.com/exceljs/exceljs) — formatted session export
- [Lucide React](https://lucide.dev) — icons
- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) — BLE connection
