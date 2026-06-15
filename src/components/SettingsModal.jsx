import { useState, useMemo } from 'react'

export default function SettingsModal({
  allCategories,
  selectedCats,
  startHour,
  startMinute,
  duration,
  durationOptions,
  multiplierOptions,
  onSave,
  onExportHistory,
}) {
  const [cats, setCats] = useState(() =>
    allCategories.map(name => {
      const existing = selectedCats.find(c => c.name === name)
      return { name, selected: !!existing, multiplier: existing?.multiplier || 1 }
    })
  )
  const [hour, setHour] = useState(startHour !== null && startHour !== undefined ? String(startHour) : '')
  const [minute, setMinute] = useState(startMinute ?? 0)
  const [dur, setDur] = useState(duration ?? 60)
  const [historyOpen, setHistoryOpen] = useState(false)

  const now = new Date()
  const curH = now.getHours()
  const curM = now.getMinutes()

  const validHours = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => i).filter(h =>
      h > curH || (h === curH && curM < 59)
    ), [curH, curM])

  const validMinutes = useMemo(() => {
    if (hour === '') return []
    const h = Number(hour)
    if (h > curH) return Array.from({ length: 60 }, (_, i) => i)
    if (h === curH) return Array.from({ length: 60 }, (_, i) => i).filter(m => m > curM)
    return []
  }, [hour, curH, curM])

  const handleHourChange = (val) => {
    setHour(val)
    if (val === '') return
    const h = Number(val)
    const valid = h > curH
      ? Array.from({ length: 60 }, (_, i) => i)
      : Array.from({ length: 60 }, (_, i) => i).filter(m => m > curM)
    if (!valid.includes(Number(minute))) {
      setMinute(valid[0] ?? 0)
    }
  }

  const historyKeys = Object.keys(localStorage)
    .filter(k => k.startsWith('traffic-counter-report-'))
    .sort()
    .reverse()

  const handleClose = () => {
    const selected = cats.filter(c => c.selected).map(c => ({ name: c.name, multiplier: c.multiplier }))
    onSave(selected, hour === '' ? null : Number(hour), Number(minute), Number(dur))
  }

  const buildStr = (() => {
    const d = new Date()
    return d.toLocaleDateString('en-US') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  })()

  const selectClass = 'border border-gray-300 rounded px-2 py-2 text-sm bg-white text-gray-800 w-full'

  return (
    <div className="fixed inset-0 bg-white text-gray-800 z-50 flex flex-col overflow-hidden">
      {/* Close button */}
      <div className="flex justify-end px-4 pt-3 pb-1 flex-shrink-0">
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 text-xl leading-none"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Category list — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 divide-y divide-gray-100">
        {cats.map(cat => (
          <div key={cat.name} className="flex items-center py-3">
            <input
              type="checkbox"
              checked={cat.selected}
              onChange={() =>
                setCats(prev => prev.map(c =>
                  c.name === cat.name ? { ...c, selected: !c.selected } : c
                ))
              }
              className="w-5 h-5 mr-3 flex-shrink-0 accent-blue-500 cursor-pointer"
            />
            <span className="flex-1 text-base">{cat.name}</span>
            <div className="flex items-center border border-gray-300 rounded overflow-hidden ml-2">
              <select
                value={cat.multiplier}
                onChange={e =>
                  setCats(prev => prev.map(c =>
                    c.name === cat.name ? { ...c, multiplier: Number(e.target.value) } : c
                  ))
                }
                className="px-2 py-1 text-sm bg-white text-gray-800 appearance-auto outline-none"
                style={{ minWidth: 52 }}
              >
                {multiplierOptions.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Time / Duration row */}
      <div className="flex-shrink-0 border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Start at Hour</label>
            <select value={hour} onChange={e => handleHourChange(e.target.value)} className={selectClass}>
              <option value="">—</option>
              {validHours.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Start at Minute</label>
            <select value={minute} onChange={e => setMinute(Number(e.target.value))} className={selectClass}>
              {validMinutes.length === 0
                ? <option value={0}>0</option>
                : validMinutes.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))
              }
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Duration (min)</label>
            <select value={dur} onChange={e => setDur(Number(e.target.value))} className={selectClass}>
              {durationOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* History reports */}
      <div className="flex-shrink-0 border-t border-gray-200 px-4 py-2">
        <button
          onClick={() => setHistoryOpen(o => !o)}
          className="w-full flex items-center justify-between bg-gray-100 px-4 py-3 rounded text-sm text-gray-600"
        >
          <span>History reports</span>
          <span className="text-xs">{historyOpen ? '▲' : '▼'}</span>
        </button>
        {historyOpen && (
          <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded">
            {historyKeys.length === 0
              ? <p className="px-3 py-2 text-sm text-gray-400">No history found</p>
              : historyKeys.map(key => (
                <button
                  key={key}
                  onClick={() => onExportHistory(key)}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {key.replace('traffic-counter-report-', '')}
                </button>
              ))
            }
          </div>
        )}
      </div>

      {/* Build info */}
      <div className="flex-shrink-0 text-center text-xs text-gray-400 py-2">
        Build: {buildStr}
      </div>
    </div>
  )
}
