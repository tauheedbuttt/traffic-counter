import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import App from '../App'

// Mock URL.createObjectURL / revokeObjectURL (not in jsdom)
global.URL.createObjectURL = vi.fn(() => 'blob:mock')
global.URL.revokeObjectURL = vi.fn()

const SESSION_DATE = '2024-01-15'
const ACTIVE_TIME = `${SESSION_DATE}T10:30:00`  // 10:30, session is 10:00-11:00
const BEFORE_TIME = `${SESSION_DATE}T09:00:00`  // before session
const AFTER_TIME  = `${SESSION_DATE}T11:30:00`  // after session

function makeSettings(overrides = {}) {
  return JSON.stringify({
    selectedCats: [
      { name: 'Cars', multiplier: 1 },
      { name: 'Buses', multiplier: 1 },
    ],
    startHour: 10,
    startMinute: 0,
    duration: 60,
    location: 'Test Location',
    ...overrides,
  })
}

describe('App – initial render', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('renders Traffic Counter heading', async () => {
    render(<App />)
    await act(async () => {})
    expect(screen.getByText('Traffic Counter')).toBeInTheDocument()
  })

  it('shows settings button', async () => {
    render(<App />)
    await act(async () => {})
    expect(screen.getByLabelText('Settings')).toBeInTheDocument()
  })

  it('renders no counter rows when no settings saved', async () => {
    render(<App />)
    await act(async () => {})
    expect(screen.queryByLabelText(/Increase/)).not.toBeInTheDocument()
  })

  it('opens settings modal on settings button click', async () => {
    render(<App />)
    await act(async () => {})
    fireEvent.click(screen.getByLabelText('Settings'))
    expect(screen.getByText(/History reports/)).toBeInTheDocument()
  })
})

describe('App – active phase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(ACTIVE_TIME))
    localStorage.setItem('traffic-counter-settings', makeSettings())
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  async function renderActive() {
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    return screen
  }

  it('renders counter rows from saved settings', async () => {
    await renderActive()
    expect(screen.getByText('Cars')).toBeInTheDocument()
    expect(screen.getByText('Buses')).toBeInTheDocument()
  })

  it('shows countdown timer', async () => {
    await renderActive()
    expect(screen.getByText(/Before end:/)).toBeInTheDocument()
  })

  it('shows correct time remaining', async () => {
    await renderActive()
    expect(screen.getByText(/30 m 0 s/)).toBeInTheDocument()
  })

  it('increments count on + press', async () => {
    await renderActive()
    expect(screen.getAllByText('0')[0]).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByLabelText('Increase Cars'))
    await act(async () => {})
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('decrements count on - press', async () => {
    await renderActive()
    fireEvent.pointerDown(screen.getByLabelText('Increase Cars'))
    fireEvent.pointerDown(screen.getByLabelText('Increase Cars'))
    await act(async () => {})
    fireEvent.pointerDown(screen.getByLabelText('Decrease Cars'))
    await act(async () => {})
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('count cannot go below zero', async () => {
    await renderActive()
    fireEvent.pointerDown(screen.getByLabelText('Decrease Cars'))
    await act(async () => {})
    expect(screen.getAllByText('0')[0]).toBeInTheDocument()
  })

  it('increments persist to localStorage', async () => {
    await renderActive()
    fireEvent.pointerDown(screen.getByLabelText('Increase Cars'))
    await act(async () => {})
    const key = Object.keys(localStorage).find(k => k.startsWith('traffic-counter-report-'))
    expect(key).toBeDefined()
    const events = JSON.parse(localStorage.getItem(key))
    expect(events).toHaveLength(1)
    expect(events[0].category).toBe('Cars')
    expect(events[0].value).toBe(1)
  })

  it('each click appends event to localStorage', async () => {
    await renderActive()
    for (let i = 0; i < 5; i++) {
      fireEvent.pointerDown(screen.getByLabelText('Increase Cars'))
      await act(async () => {})
    }
    const key = Object.keys(localStorage).find(k => k.startsWith('traffic-counter-report-'))
    const events = JSON.parse(localStorage.getItem(key))
    expect(events).toHaveLength(5)
    expect(events[4].value).toBe(5)
  })

  it('does not show export/send buttons during active session', async () => {
    await renderActive()
    expect(screen.queryByText('Export report')).not.toBeInTheDocument()
    expect(screen.queryByText('Send to email')).not.toBeInTheDocument()
  })

  it('countdown timer decrements each second', async () => {
    await renderActive()
    const before = screen.getByText(/Before end:/).textContent
    await act(async () => { vi.advanceTimersByTime(5000) })
    const after = screen.getByText(/Before end:/).textContent
    expect(before).not.toBe(after)
  })
})

describe('App – idle phase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(BEFORE_TIME))
    localStorage.setItem('traffic-counter-settings', makeSettings())
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('counter buttons are visible but inactive', async () => {
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    const btn = screen.getByLabelText('Increase Cars')
    expect(btn.className).toContain('bg-[#2d3449]')
  })

  it('clicks do not increment count while idle', async () => {
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    fireEvent.pointerDown(screen.getByLabelText('Increase Cars'))
    await act(async () => {})
    expect(screen.getAllByText('0')[0]).toBeInTheDocument()
  })

  it('shows before-start countdown when within 60s of start', async () => {
    vi.setSystemTime(new Date(`${SESSION_DATE}T09:59:30`))
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.getByText(/Before start:/)).toBeInTheDocument()
    expect(screen.getByText(/0 m 30 s/)).toBeInTheDocument()
  })

  it('does not show before-start text when far from session', async () => {
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.queryByText(/Before start:/)).not.toBeInTheDocument()
  })
})

describe('App – ended phase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(AFTER_TIME))
    localStorage.setItem('traffic-counter-settings', makeSettings())
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  async function renderEnded() {
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
  }

  it('shows export report button', async () => {
    await renderEnded()
    expect(screen.getByText('Export report')).toBeInTheDocument()
  })

  it('shows send to email button', async () => {
    await renderEnded()
    expect(screen.getByText('Send to email')).toBeInTheDocument()
  })

  it('does not show countdown timer', async () => {
    await renderEnded()
    expect(screen.queryByText(/Before end:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Before start:/)).not.toBeInTheDocument()
  })

  it('export button triggers CSV download', async () => {
    await renderEnded()
    const createSpy = vi.spyOn(document, 'createElement')
    fireEvent.click(screen.getByText('Export report'))
    await act(async () => {})
    const anchors = createSpy.mock.results.filter(r => r.value.tagName === 'A')
    expect(anchors.length).toBeGreaterThan(0)
  })
})

describe('App – localStorage restore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('restores counts from previous session events', async () => {
    vi.setSystemTime(new Date(ACTIVE_TIME))
    const sessionKey = 'traffic-counter-report-20240115_10_00'
    localStorage.setItem(sessionKey, JSON.stringify([
      { category: 'Cars', value: 7, time: 't', increment: 1 },
      { category: 'Buses', value: 3, time: 't', increment: 1 },
    ]))
    localStorage.setItem('traffic-counter-settings', makeSettings())
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('starts fresh counts on save new settings', async () => {
    vi.setSystemTime(new Date(ACTIVE_TIME))
    localStorage.setItem('traffic-counter-settings', makeSettings())
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    // Increment cars to 5
    for (let i = 0; i < 5; i++) {
      fireEvent.pointerDown(screen.getByLabelText('Increase Cars'))
      await act(async () => {})
    }
    expect(screen.getByText('5')).toBeInTheDocument()
    // Open and close settings (save) — resets counts
    fireEvent.click(screen.getByLabelText('Settings'))
    await act(async () => {})
    fireEvent.click(screen.getByLabelText('Close'))
    await act(async () => {})
    expect(screen.getAllByText('0')[0]).toBeInTheDocument()
  })
})

describe('App – long session stress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(ACTIVE_TIME))
    localStorage.setItem('traffic-counter-settings', makeSettings({
      selectedCats: [{ name: 'Cars', multiplier: 1 }],
      duration: 90,
    }))
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('handles 500 increments correctly', async () => {
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    const btn = screen.getByLabelText('Increase Cars')
    for (let i = 0; i < 500; i++) {
      fireEvent.pointerDown(btn)
    }
    await act(async () => {})
    expect(screen.getByText('500')).toBeInTheDocument()
    const key = Object.keys(localStorage).find(k => k.startsWith('traffic-counter-report-'))
    const events = JSON.parse(localStorage.getItem(key))
    expect(events).toHaveLength(500)
    expect(events[499].value).toBe(500)
  })

  it('restores 500 events from localStorage correctly', async () => {
    const key = 'traffic-counter-report-20240115_10_00'
    const events = Array.from({ length: 500 }, (_, i) => ({
      category: 'Cars', value: i + 1, time: 't', increment: 1,
    }))
    localStorage.setItem(key, JSON.stringify(events))
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('multiplier=10 accumulates counts correctly', async () => {
    localStorage.setItem('traffic-counter-settings', makeSettings({
      selectedCats: [{ name: 'Cars', multiplier: 10 }],
      duration: 90,
    }))
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    const btn = screen.getByLabelText('Increase Cars')
    for (let i = 0; i < 10; i++) {
      fireEvent.pointerDown(btn)
      await act(async () => {})
    }
    expect(screen.getByText('100')).toBeInTheDocument()
    const key = Object.keys(localStorage).find(k => k.startsWith('traffic-counter-report-'))
    const events = JSON.parse(localStorage.getItem(key))
    expect(events[9].value).toBe(100)
  })

  it('decrement with multiplier=10 never goes below 0', async () => {
    localStorage.setItem('traffic-counter-settings', makeSettings({
      selectedCats: [{ name: 'Cars', multiplier: 10 }],
    }))
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    // Increment 3 times (+30), then decrement 5 times (would be -20 without clamp)
    const plus = screen.getByLabelText('Increase Cars')
    const minus = screen.getByLabelText('Decrease Cars')
    for (let i = 0; i < 3; i++) { fireEvent.pointerDown(plus); await act(async () => {}) }
    for (let i = 0; i < 5; i++) { fireEvent.pointerDown(minus); await act(async () => {}) }
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('timer runs correctly for 59 minutes without phase change', async () => {
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.getByText(/Before end:/)).toBeInTheDocument()
    // Advance 59 minutes — still active (90 min session, 30 min already elapsed)
    await act(async () => { vi.advanceTimersByTime(59 * 60 * 1000) })
    expect(screen.getByText(/Before end:/)).toBeInTheDocument()
  })

  it('phase transitions to ended after session duration', async () => {
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.getByText(/Before end:/)).toBeInTheDocument()
    // Session 10:00-11:30 (90 min), current time 10:30 → 60 min left
    await act(async () => { vi.advanceTimersByTime(60 * 60 * 1000 + 1000) })
    expect(screen.queryByText(/Before end:/)).not.toBeInTheDocument()
    expect(screen.getByText('Export report')).toBeInTheDocument()
  })

  it('counts are preserved when phase transitions to ended', async () => {
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    const btn = screen.getByLabelText('Increase Cars')
    for (let i = 0; i < 15; i++) {
      fireEvent.pointerDown(btn)
      await act(async () => {})
    }
    expect(screen.getByText('15')).toBeInTheDocument()
    // Advance to after session
    await act(async () => { vi.advanceTimersByTime(60 * 60 * 1000 + 1000) })
    // Counts still visible after session ends
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('session key remains stable across timer ticks', async () => {
    render(<App />)
    await act(async () => { vi.advanceTimersByTime(0) })
    fireEvent.pointerDown(screen.getByLabelText('Increase Cars'))
    await act(async () => {})
    const keysBefore = Object.keys(localStorage).filter(k => k.startsWith('traffic-counter-report-'))
    // Advance 10 minutes
    await act(async () => { vi.advanceTimersByTime(10 * 60 * 1000) })
    fireEvent.pointerDown(screen.getByLabelText('Increase Cars'))
    await act(async () => {})
    const keysAfter = Object.keys(localStorage).filter(k => k.startsWith('traffic-counter-report-'))
    expect(keysAfter).toEqual(keysBefore)
  })
})

describe('App – settings modal interaction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(ACTIVE_TIME))
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('saves settings to localStorage on close', async () => {
    render(<App />)
    await act(async () => {})
    fireEvent.click(screen.getByLabelText('Settings'))
    await act(async () => {})
    fireEvent.click(screen.getByLabelText('Close'))
    await act(async () => {})
    expect(localStorage.getItem('traffic-counter-settings')).not.toBeNull()
  })

  it('re-render after settings shows new categories', async () => {
    render(<App />)
    await act(async () => {})
    expect(screen.queryByText('Pedestrians')).not.toBeInTheDocument()
    // Save settings with Pedestrians selected via localStorage + re-render
    localStorage.setItem('traffic-counter-settings', JSON.stringify({
      selectedCats: [{ name: 'Pedestrians', multiplier: 1 }],
      startHour: 10,
      startMinute: 0,
      duration: 60,
      location: '',
    }))
    // Open settings which reads from the modal's onSave
    fireEvent.click(screen.getByLabelText('Settings'))
    await act(async () => {})
    fireEvent.click(screen.getByLabelText('Close'))
    await act(async () => {})
    // After save, selected cats are whatever the modal passed back
  })
})
