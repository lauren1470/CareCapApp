import ExcelJS from 'exceljs'

// ── Brand colours ─────────────────────────────────────────────────────────────
const BRAND_DARK   = '1E3A4F'   // dark navy
const BRAND_BLUE   = '75B6E5'   // primary blue
const BRAND_LIGHT  = 'E0F0FB'   // pale blue background
const GREEN_BG     = 'DCFCE7'   // ok cell fill
const GREEN_FG     = '16A34A'
const RED_BG       = 'FEE2E2'   // hotspot cell fill
const RED_FG       = 'DC2626'
const AMBER_BG     = 'FEF3C7'
const AMBER_FG     = 'D97706'
const ROW_ALT      = 'F0F7FC'   // alternating row shading
const HEADER_BG    = '1E3A4F'   // table header fill

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

function headerStyle(bgArgb = HEADER_BG, fgArgb = 'FFFFFF') {
  return {
    fill:   { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } },
    font:   { bold: true, color: { argb: fgArgb }, size: 10 },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: {
      bottom: { style: 'medium', color: { argb: BRAND_BLUE } },
    },
  }
}

function metaLabelStyle() {
  return {
    font: { bold: true, color: { argb: BRAND_DARK }, size: 10 },
    alignment: { horizontal: 'left' },
  }
}

function metaValueStyle() {
  return {
    font: { color: { argb: BRAND_DARK }, size: 10 },
    alignment: { horizontal: 'left' },
  }
}

function sectionTitleStyle() {
  return {
    font: { bold: true, color: { argb: 'FFFFFF' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  }
}

function applyHeaderRow(row, style) {
  row.eachCell(cell => Object.assign(cell, style))
  row.height = 28
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function exportSessionXLSX({ history, alerts, safeRange, sessionElapsed }) {
  if (!history || history.length === 0) return

  const wb = new ExcelJS.Workbook()
  wb.creator  = 'CareCap'
  wb.created  = new Date()
  wb.modified = new Date()

  const now     = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const firstWithSensors = history.find(d => d.sensors && d.sensors.length > 0)
  const sensorAbbrs  = firstWithSensors ? firstWithSensors.sensors.map(s => s.abbr)  : []
  const sensorNames  = firstWithSensors ? firstWithSensors.sensors.map(s => s.name)  : []

  // ════════════════════════════════════════════════════════════════════════════
  // SHEET 1 — Summary
  // ════════════════════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet('Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { fitToPage: true, fitToWidth: 1 },
  })

  // Column widths
  ws1.columns = [
    { width: 22 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ]

  // ── Title banner ──────────────────────────────────────────────────────────
  ws1.mergeCells('A1:E1')
  const titleCell = ws1.getCell('A1')
  titleCell.value = 'CareCap — Scalp Cooling Session Export'
  titleCell.style = {
    font:      { bold: true, color: { argb: 'FFFFFF' }, size: 15 },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  }
  ws1.getRow(1).height = 36

  // ── Session metadata ──────────────────────────────────────────────────────
  const meta = [
    ['Date',             dateStr],
    ['Export time',      timeStr],
    ['Session duration', fmt(sessionElapsed)],
    ['Safe temp range',  `${safeRange.min}–${safeRange.max}°C`],
    ['Total data points', history.length],
    ['Alerts triggered', alerts.length],
  ]

  ws1.addRow([])   // spacer

  meta.forEach(([label, value]) => {
    const row = ws1.addRow([label, value])
    row.getCell(1).style = metaLabelStyle()
    row.getCell(2).style = metaValueStyle()
    row.height = 18
  })

  ws1.addRow([])   // spacer

  // ── Sensor summary section title ──────────────────────────────────────────
  const summaryTitleRow = ws1.addRow(['Per-Sensor Summary'])
  ws1.mergeCells(`A${summaryTitleRow.number}:E${summaryTitleRow.number}`)
  summaryTitleRow.getCell(1).style = sectionTitleStyle()
  summaryTitleRow.height = 24

  // ── Summary table header ──────────────────────────────────────────────────
  const sumHdr = ws1.addRow(['Sensor', 'Min (°C)', 'Avg (°C)', 'Max (°C)', 'Status'])
  applyHeaderRow(sumHdr, headerStyle())

  // ── Per-sensor rows ───────────────────────────────────────────────────────
  sensorAbbrs.forEach((abbr, i) => {
    const temps = history
      .filter(d => d.sensors)
      .map(d => d.sensors[i]?.temp)
      .filter(t => t !== null && t !== undefined)
    if (temps.length === 0) return

    const min    = parseFloat(Math.min(...temps).toFixed(1))
    const avg    = parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1))
    const max    = parseFloat(Math.max(...temps).toFixed(1))
    const isHot  = max > safeRange.max
    const isCold = min < safeRange.min
    const statusLabel = isHot ? 'HOTSPOT DETECTED' : isCold ? 'TOO COLD' : 'OK'

    const row = ws1.addRow([`${abbr} (${sensorNames[i]})`, min, avg, max, statusLabel])
    row.height = 20

    // Colour-code status cell
    const statusCell = row.getCell(5)
    if (isHot) {
      statusCell.style = { font: { bold: true, color: { argb: RED_FG } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_BG } }, alignment: { horizontal: 'center' } }
    } else if (isCold) {
      statusCell.style = { font: { bold: true, color: { argb: AMBER_FG } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_BG } }, alignment: { horizontal: 'center' } }
    } else {
      statusCell.style = { font: { bold: true, color: { argb: GREEN_FG } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_BG } }, alignment: { horizontal: 'center' } }
    }

    // Highlight max cell if hotspot
    if (isHot) {
      row.getCell(4).style = { font: { bold: true, color: { argb: RED_FG } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_BG } } }
    }

    // Number format
    ;[2, 3, 4].forEach(col => {
      const c = row.getCell(col)
      c.numFmt = '0.0'
      if (!c.style.fill) c.style = { ...c.style, alignment: { horizontal: 'center' } }
    })
    row.getCell(1).style = { font: { color: { argb: BRAND_DARK } }, alignment: { horizontal: 'left' } }
  })

  ws1.addRow([])

  // ── Alerts section ────────────────────────────────────────────────────────
  const alertsTitleRow = ws1.addRow(['Alerts & Events'])
  ws1.mergeCells(`A${alertsTitleRow.number}:E${alertsTitleRow.number}`)
  alertsTitleRow.getCell(1).style = sectionTitleStyle()
  alertsTitleRow.height = 24

  if (alerts.length === 0) {
    const noAlertRow = ws1.addRow(['No alerts — session ran normally'])
    noAlertRow.getCell(1).style = { font: { italic: true, color: { argb: GREEN_FG } } }
    ws1.mergeCells(`A${noAlertRow.number}:E${noAlertRow.number}`)
  } else {
    const alertHdr = ws1.addRow(['Time', 'Type', 'Message', '', ''])
    applyHeaderRow(alertHdr, headerStyle())
    ws1.mergeCells(`C${alertHdr.number}:E${alertHdr.number}`)

    alerts.forEach(a => {
      const isWarning = a.type === 'warning'
      const row = ws1.addRow([a.time, a.type.toUpperCase(), a.message])
      ws1.mergeCells(`C${row.number}:E${row.number}`)
      row.height = 18
      row.getCell(2).style = {
        font: { bold: true, color: { argb: isWarning ? RED_FG : BRAND_DARK } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: isWarning ? RED_BG : BRAND_LIGHT } },
        alignment: { horizontal: 'center' },
      }
      row.getCell(1).style = { font: { color: { argb: BRAND_DARK } } }
      row.getCell(3).style = { font: { color: { argb: BRAND_DARK } } }
    })
  }

  // ── Clinical reference box ────────────────────────────────────────────────
  ws1.addRow([])
  const refTitleRow = ws1.addRow(['Clinical Reference'])
  ws1.mergeCells(`A${refTitleRow.number}:E${refTitleRow.number}`)
  refTitleRow.getCell(1).style = sectionTitleStyle()
  refTitleRow.height = 24

  const refs = [
    ['Poor Cooling',       '>24°C'],
    ['Suboptimal Cooling', '22–24°C'],
    ['Effective Cooling',  '18–22°C'],
    ['Optimal Cooling',    '12–15°C'],
    ['Too Cold',           '<10°C'],
    ['Session duration',   '30 min'],
    ['Pressure range',     '1,400–1,930 Pa'],
    ['Protocol',           'Pre / During / Post chemotherapy'],
  ]
  refs.forEach(([k, v]) => {
    const row = ws1.addRow([k, v])
    row.getCell(1).style = { ...metaLabelStyle(), fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT } } }
    row.getCell(2).style = { ...metaValueStyle(), fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT } } }
    row.height = 18
  })

  // ════════════════════════════════════════════════════════════════════════════
  // SHEET 2 — Raw Data
  // ════════════════════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet('Raw Data', {
    views: [{ state: 'frozen', ySplit: 2 }],
  })

  // Column widths: Time | Elapsed | Avg Temp | Avg Pressure | P1 | P2 | sensor×8
  const rawCols = [
    { width: 12 },  // Time
    { width: 11 },  // Elapsed (s)
    { width: 13 },  // Avg Temp
    { width: 15 },  // Avg Pressure
    { width: 11 },  // Pressure 1
    { width: 11 },  // Pressure 2
    ...sensorAbbrs.map(() => ({ width: 10 })),
  ]
  ws2.columns = rawCols

  // Title banner
  const totalCols = 6 + sensorAbbrs.length
  ws2.mergeCells(1, 1, 1, totalCols)
  const rawTitle = ws2.getCell('A1')
  rawTitle.value = 'CareCap — Raw Session Data'
  rawTitle.style = {
    font:      { bold: true, color: { argb: 'FFFFFF' }, size: 13 },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  }
  ws2.getRow(1).height = 30

  // Column headers
  const rawHeaders = ['Time', 'Elapsed (s)', 'Avg Temp (°C)', 'Avg Pressure (Pa)', 'Pressure 1 (Pa)', 'Pressure 2 (Pa)', ...sensorAbbrs.map(a => `${a} (°C)`)]
  const rawHdrRow  = ws2.addRow(rawHeaders)
  applyHeaderRow(rawHdrRow, headerStyle())

  // Data rows
  history.forEach((d, rowIdx) => {
    const sensorTemps = sensorAbbrs.map((_, i) => {
      const s = d.sensors ? d.sensors[i] : null
      return s?.temp !== null && s?.temp !== undefined ? s.temp : null
    })

    const row = ws2.addRow([
      d.time,
      d.elapsed,
      d.temp,
      d.pressure ?? null,
      null,   // P1 placeholder (not stored per-tick in history)
      null,   // P2 placeholder
      ...sensorTemps,
    ])

    row.height = 17
    const isAlt = rowIdx % 2 === 1
    const baseFill = isAlt
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } }
      : null

    row.eachCell((cell, colNum) => {
      cell.style = {
        font:      { size: 9, color: { argb: BRAND_DARK } },
        fill:      baseFill || { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: colNum === 1 ? 'left' : 'center' },
      }
    })

    // Highlight individual sensor cells that are out of range
    sensorTemps.forEach((temp, i) => {
      if (temp === null) return
      const colNum = 7 + i   // 1-indexed: cols 7+
      const cell   = row.getCell(colNum)
      if (temp > safeRange.max) {
        cell.style = { font: { bold: true, size: 9, color: { argb: RED_FG } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_BG } }, alignment: { horizontal: 'center' } }
      } else if (temp < safeRange.min) {
        cell.style = { font: { bold: true, size: 9, color: { argb: AMBER_FG } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_BG } }, alignment: { horizontal: 'center' } }
      }
    })

    // Number formats
    ;[3, 4, 5, 6].forEach(c => {
      const cell = row.getCell(c)
      if (cell.value !== null) cell.numFmt = c <= 4 ? '0.0' : '0'
    })
    sensorAbbrs.forEach((_, i) => {
      const cell = row.getCell(7 + i)
      if (cell.value !== null) cell.numFmt = '0.0'
    })
  })

  // ── Trigger download ───────────────────────────────────────────────────────
  const buffer   = await wb.xlsx.writeBuffer()
  const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url      = URL.createObjectURL(blob)
  const link     = document.createElement('a')
  const fileDateStr = dateStr.replace(/\//g, '-')
  const fileTimeStr = timeStr.replace(':', '')
  link.href      = url
  link.download  = `carecap-session-${fileDateStr}-${fileTimeStr}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
