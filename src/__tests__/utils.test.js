import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { pad, buildSessionKey, formatEventTime, getSessionPhase, restoreCounts } from '../utils'

describe('pad', () => {
  it('pads single digit', () => expect(pad(5)).toBe('05'))
  it('leaves double digit unchanged', () => expect(pad(15)).toBe('15'))
  it('handles zero', () => expect(pad(0)).toBe('00'))
  it('handles large number', () => expect(pad(123)).toBe('123'))
})

describe('buildSessionKey', () => {
  it('formats key correctly', () => {
    const date = new Date('2024-03-07')
    expect(buildSessionKey(date, 9, 5)).toBe('traffic-counter-report-20240307_09_05')
  })

  it('pads hour and minute', () => {
    const date = new Date('2024-01-01')
    expect(buildSessionKey(date, 0, 0)).toBe('traffic-counter-report-20240101_00_00')
  })

  it('handles end-of-day values', () => {
    const date = new Date('2024-12-31')
    expect(buildSessionKey(date, 23, 59)).toBe('traffic-counter-report-20241231_23_59')
  })
})

describe('formatEventTime', () => {
  it('formats AM time', () => {
    const date = new Date('2024-03-07T09:05:30')
    expect(formatEventTime(date)).toBe('03/07/2024 09:05:30 AM')
  })

  it('formats PM time', () => {
    const date = new Date('2024-03-07T14:30:45')
    expect(formatEventTime(date)).toBe('03/07/2024 02:30:45 PM')
  })

  it('formats midnight as 12 AM', () => {
    const date = new Date('2024-03-07T00:00:00')
    expect(formatEventTime(date)).toBe('03/07/2024 12:00:00 AM')
  })

  it('formats noon as 12 PM', () => {
    const date = new Date('2024-03-07T12:00:00')
    expect(formatEventTime(date)).toBe('03/07/2024 12:00:00 PM')
  })

  it('pads single-digit month and day', () => {
    const date = new Date('2024-01-05T09:01:02')
    expect(formatEventTime(date)).toBe('01/05/2024 09:01:02 AM')
  })
})

describe('getSessionPhase', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('active when now is within session window', () => {
    vi.setSystemTime(new Date('2024-01-15T10:30:00'))
    const result = getSessionPhase(10, 0, 60)
    expect(result.phase).toBe('active')
    expect(result.timeLeft).toBe(30 * 60)
    expect(result.timeToStart).toBe(0)
  })

  it('idle when session has not started', () => {
    vi.setSystemTime(new Date('2024-01-15T09:00:00'))
    const result = getSessionPhase(10, 0, 60)
    expect(result.phase).toBe('idle')
    expect(result.timeLeft).toBe(0)
    expect(result.timeToStart).toBe(3600)
  })

  it('ended when session window has passed', () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00'))
    const result = getSessionPhase(10, 0, 60)
    expect(result.phase).toBe('ended')
    expect(result.timeLeft).toBe(0)
    expect(result.timeToStart).toBe(0)
  })

  it('active at session start exact moment', () => {
    vi.setSystemTime(new Date('2024-01-15T10:00:00'))
    const result = getSessionPhase(10, 0, 60)
    expect(result.phase).toBe('active')
    expect(result.timeLeft).toBe(3600)
  })

  it('ended at session end exact moment', () => {
    vi.setSystemTime(new Date('2024-01-15T11:00:00'))
    const result = getSessionPhase(10, 0, 60)
    expect(result.phase).toBe('ended')
  })

  it('timeLeft counts down correctly during session', () => {
    vi.setSystemTime(new Date('2024-01-15T10:59:30'))
    const result = getSessionPhase(10, 0, 60)
    expect(result.phase).toBe('active')
    expect(result.timeLeft).toBe(30)
  })

  it('final second of session is still active', () => {
    vi.setSystemTime(new Date('2024-01-15T10:59:59'))
    const result = getSessionPhase(10, 0, 60)
    expect(result.phase).toBe('active')
    expect(result.timeLeft).toBe(1)
  })

  it('handles 90-minute session correctly', () => {
    vi.setSystemTime(new Date('2024-01-15T10:45:00'))
    const result = getSessionPhase(10, 0, 90)
    expect(result.phase).toBe('active')
    expect(result.timeLeft).toBe(45 * 60)
  })

  it('handles 1-minute test session', () => {
    vi.setSystemTime(new Date('2024-01-15T10:00:30'))
    const result = getSessionPhase(10, 0, 1)
    expect(result.phase).toBe('active')
    expect(result.timeLeft).toBe(30)
  })

  it('idle shows correct timeToStart within 60s', () => {
    vi.setSystemTime(new Date('2024-01-15T09:59:30'))
    const result = getSessionPhase(10, 0, 60)
    expect(result.phase).toBe('idle')
    expect(result.timeToStart).toBe(30)
  })

  it('timeToStart is large when session is far away', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    const result = getSessionPhase(10, 0, 60)
    expect(result.phase).toBe('idle')
    expect(result.timeToStart).toBe(2 * 3600)
  })

  it('handles session with non-zero start minute', () => {
    vi.setSystemTime(new Date('2024-01-15T10:15:00'))
    const result = getSessionPhase(10, 15, 30)
    expect(result.phase).toBe('active')
    expect(result.timeLeft).toBe(30 * 60)
  })
})

describe('restoreCounts', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('returns empty object when no data in localStorage', () => {
    expect(restoreCounts('nonexistent-key')).toEqual({})
  })

  it('returns last value per category', () => {
    const events = [
      { category: 'Cars', value: 1, time: 't', increment: 1 },
      { category: 'Cars', value: 2, time: 't', increment: 1 },
      { category: 'Buses', value: 1, time: 't', increment: 1 },
    ]
    localStorage.setItem('test-key', JSON.stringify(events))
    expect(restoreCounts('test-key')).toEqual({ Cars: 2, Buses: 1 })
  })

  it('returns empty object on corrupt JSON', () => {
    localStorage.setItem('test-key', 'not-json{{{')
    expect(restoreCounts('test-key')).toEqual({})
  })

  it('returns empty object for empty events array', () => {
    localStorage.setItem('test-key', '[]')
    expect(restoreCounts('test-key')).toEqual({})
  })

  it('handles large event history (1000 events)', () => {
    const events = Array.from({ length: 1000 }, (_, i) => ({
      category: 'Cars',
      value: i + 1,
      time: 't',
      increment: 1,
    }))
    localStorage.setItem('test-key', JSON.stringify(events))
    expect(restoreCounts('test-key')).toEqual({ Cars: 1000 })
  })

  it('handles multiple categories with many events each', () => {
    const categories = ['Cars', 'Buses', 'Pedestrians']
    const events = []
    categories.forEach(cat => {
      for (let i = 1; i <= 200; i++) {
        events.push({ category: cat, value: i, time: 't', increment: 1 })
      }
    })
    localStorage.setItem('test-key', JSON.stringify(events))
    const counts = restoreCounts('test-key')
    expect(counts).toEqual({ Cars: 200, Buses: 200, Pedestrians: 200 })
  })

  it('handles decremented values correctly', () => {
    const events = [
      { category: 'Cars', value: 5, time: 't', increment: 1 },
      { category: 'Cars', value: 4, time: 't', increment: -1 },
    ]
    localStorage.setItem('test-key', JSON.stringify(events))
    expect(restoreCounts('test-key')).toEqual({ Cars: 4 })
  })
})
