export function pad(n) {
  return String(n).padStart(2, '0')
}

export function buildSessionKey(date, hour, minute) {
  const y = date.getFullYear()
  const mo = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  return `traffic-counter-report-${y}${mo}${d}_${pad(hour)}_${pad(minute)}`
}

export function formatEventTime(date) {
  const mo = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const y = date.getFullYear()
  let h = date.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${mo}/${d}/${y} ${pad(h)}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${ampm}`
}

export function getSessionPhase(startHour, startMinute, durationMin) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(startHour, startMinute, 0, 0)
  const end = new Date(start.getTime() + durationMin * 60000)
  if (now >= end) return { phase: 'ended', timeLeft: 0, timeToStart: 0 }
  if (now >= start) return { phase: 'active', timeLeft: Math.floor((end - now) / 1000), timeToStart: 0 }
  const timeToStart = Math.floor((start - now) / 1000)
  return { phase: 'idle', timeLeft: 0, timeToStart }
}

export function restoreCounts(key) {
  try {
    const events = JSON.parse(localStorage.getItem(key) || '[]')
    const counts = {}
    events.forEach(e => { counts[e.category] = e.value })
    return counts
  } catch {
    return {}
  }
}
