import { useState, useEffect, useRef, useCallback } from 'react'
import Logo from './components/Logo'
import SettingsModal from './components/SettingsModal'
import CounterRow from './components/CounterRow'

const ALL_CATEGORIES = [
  'Pedestrians', 'Pedestrians in', 'Pedestrians out',
  'Bicycles', 'Cars', 'Buses', 'Long buses', 'Short buses',
  'Trains', 'Trams', 'Trucks', 'Parking cars', 'Rickshaw',
]

const DURATION_OPTIONS = [1, 30, 60, 90]
const MULTIPLIER_OPTIONS = [1, 2, 5, 10]

function pad(n) {
  return String(n).padStart(2, '0')
}

function buildSessionKey(date, hour, minute) {
  const y = date.getFullYear()
  const mo = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  return `traffic-counter-report-${y}${mo}${d}_${pad(hour)}_${pad(minute)}`
}

function formatEventTime(date) {
  const mo = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const y = date.getFullYear()
  let h = date.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${mo}/${d}/${y} ${pad(h)}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${ampm}`
}

function getSessionPhase(startHour, startMinute, durationMin) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(startHour, startMinute, 0, 0)
  const end = new Date(start.getTime() + durationMin * 60000)
  if (now >= end) return { phase: 'ended', timeLeft: 0 }
  if (now >= start) return { phase: 'active', timeLeft: Math.floor((end - now) / 1000) }
  return { phase: 'idle', timeLeft: 0 }
}

function restoreCounts(key) {
  try {
    const events = JSON.parse(localStorage.getItem(key) || '[]')
    const counts = {}
    events.forEach(e => { counts[e.category] = e.value })
    return counts
  } catch {
    return {}
  }
}

export default function App() {
  const [selectedCats, setSelectedCats] = useState([])
  const [startHour, setStartHour] = useState(null)
  const [startMinute, setStartMinute] = useState(0)
  const [duration, setDuration] = useState(60)
  const [phase, setPhase] = useState('idle')
  const [timeLeft, setTimeLeft] = useState(0)
  const [counts, setCounts] = useState({})
  const [showSettings, setShowSettings] = useState(false)

  const sessionKeyRef = useRef(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('traffic-counter-settings') || 'null')
      if (!saved) return
      const cats = saved.selectedCats || []
      const h = saved.startHour ?? null
      const m = saved.startMinute ?? 0
      const dur = saved.duration ?? 60
      setSelectedCats(cats)
      setStartHour(h)
      setStartMinute(m)
      setDuration(dur)
      if (h !== null && h !== undefined) {
        const key = buildSessionKey(new Date(), h, m)
        sessionKeyRef.current = key
        const { phase: p } = getSessionPhase(h, m, dur)
        if (p !== 'idle') setCounts(restoreCounts(key))
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (startHour === null || startHour === undefined) return
    const key = buildSessionKey(new Date(), startHour, startMinute)
    sessionKeyRef.current = key
    const tick = () => {
      const { phase: p, timeLeft: tl } = getSessionPhase(startHour, startMinute, duration)
      setPhase(p)
      setTimeLeft(tl)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startHour, startMinute, duration])

  const handleClick = useCallback((name, dir) => {
    if (phase !== 'active') return
    const cat = selectedCats.find(c => c.name === name)
    const step = dir * (cat?.multiplier || 1)
    setCounts(prev => {
      const newVal = Math.max(0, (prev[name] || 0) + step)
      const event = {
        category: name,
        time: formatEventTime(new Date()),
        increment: step,
        value: newVal,
      }
      const key = sessionKeyRef.current
      try {
        const existing = JSON.parse(localStorage.getItem(key) || '[]')
        existing.push(event)
        localStorage.setItem(key, JSON.stringify(existing))
      } catch { /* ignore */ }
      return { ...prev, [name]: newVal }
    })
  }, [phase, selectedCats])

  const exportCSV = useCallback((key) => {
    const k = key || sessionKeyRef.current
    if (!k) return
    try {
      const events = JSON.parse(localStorage.getItem(k) || '[]')
      const rows = [['category', 'time', 'increment', 'value']]
      events.forEach(e => rows.push([e.category, e.time, e.increment, e.value]))
      const csv = rows.map(r => r.join(',')).join('\n')
      const filename = k.replace('traffic-counter-report-', '') + '.csv'
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }, [])

  const handleSaveSettings = useCallback((cats, h, m, dur) => {
    setSelectedCats(cats)
    setStartHour(h)
    setStartMinute(m)
    setDuration(dur)
    setCounts({})
    if (h !== null && h !== undefined) {
      sessionKeyRef.current = buildSessionKey(new Date(), h, m)
    }
    try {
      localStorage.setItem('traffic-counter-settings', JSON.stringify({
        selectedCats: cats, startHour: h, startMinute: m, duration: dur,
      }))
    } catch { /* ignore */ }
    setShowSettings(false)
  }, [])

  const formatTimeLeft = (s) => `${Math.floor(s / 60)} m ${s % 60} s`

  return (
    <div className="min-h-screen bg-[#1e2233] text-white flex flex-col select-none">
      <header className="flex items-start justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <Logo />
        <div className="flex-1 text-center px-2">
          <h1 className="text-xl font-semibold tracking-wide">Traffic Counter</h1>
          {phase === 'active' && (
            <p className="text-orange-400 text-sm mt-0.5 font-medium">
              Before end: {formatTimeLeft(timeLeft)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="text-blue-400 p-1 mt-0.5 flex-shrink-0"
          aria-label="Settings"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
          </svg>
        </button>
      </header>

      <main className="flex-1 mt-1">
        {selectedCats.map(cat => (
          <CounterRow
            key={cat.name}
            name={cat.name}
            count={counts[cat.name] ?? 0}
            active={phase === 'active'}
            onMinus={() => handleClick(cat.name, -1)}
            onPlus={() => handleClick(cat.name, 1)}
          />
        ))}

        {phase === 'ended' && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => exportCSV()}
              className="bg-[#6b73ff] active:bg-[#5a62ee] text-white px-10 py-3 rounded-2xl font-medium text-base"
            >
              Export report
            </button>
          </div>
        )}
      </main>

      {showSettings && (
        <SettingsModal
          allCategories={ALL_CATEGORIES}
          selectedCats={selectedCats}
          startHour={startHour}
          startMinute={startMinute}
          duration={duration}
          durationOptions={DURATION_OPTIONS}
          multiplierOptions={MULTIPLIER_OPTIONS}
          onSave={handleSaveSettings}
          onExportHistory={exportCSV}
        />
      )}
    </div>
  )
}
