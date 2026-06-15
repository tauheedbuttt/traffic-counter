import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import SettingsModal from '../components/SettingsModal'

const ALL_CATEGORIES = ['Cars', 'Buses', 'Pedestrians']
const DURATION_OPTIONS = [1, 30, 60, 90]
const MULTIPLIER_OPTIONS = [1, 2, 5, 10]

function renderModal(overrides = {}) {
  const onSave = vi.fn()
  const onExportHistory = vi.fn()
  const props = {
    allCategories: ALL_CATEGORIES,
    selectedCats: [],
    startHour: null,
    startMinute: 0,
    duration: 60,
    location: '',
    durationOptions: DURATION_OPTIONS,
    multiplierOptions: MULTIPLIER_OPTIONS,
    onSave,
    onExportHistory,
    ...overrides,
  }
  render(<SettingsModal {...props} />)
  return { onSave, onExportHistory }
}

// Gets the checkbox inside the row containing the given category name.
function getCategoryCheckbox(name) {
  return within(screen.getByText(name).parentElement).getByRole('checkbox')
}

// Gets the multiplier select inside the row containing the given category name.
function getMultiplierSelect(name) {
  return within(screen.getByText(name).parentElement).getByRole('combobox')
}

// Gets the duration select by matching its exact option values.
function getDurationSelect() {
  const expectedVals = DURATION_OPTIONS.map(String)
  return screen.getAllByRole('combobox').find(s => {
    const vals = Array.from(s.options).map(o => o.value)
    return JSON.stringify(vals) === JSON.stringify(expectedVals)
  })
}

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00'))
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('renders all categories', () => {
    renderModal()
    ALL_CATEGORIES.forEach(cat => {
      expect(screen.getByText(cat)).toBeInTheDocument()
    })
  })

  it('pre-checks selected categories', () => {
    renderModal({ selectedCats: [{ name: 'Cars', multiplier: 1 }] })
    expect(getCategoryCheckbox('Cars')).toBeChecked()
    expect(getCategoryCheckbox('Buses')).not.toBeChecked()
  })

  it('toggling checkbox checks it', () => {
    renderModal()
    const cb = getCategoryCheckbox('Cars')
    expect(cb).not.toBeChecked()
    fireEvent.click(cb)
    expect(cb).toBeChecked()
  })

  it('toggling checked category unchecks it', () => {
    renderModal({ selectedCats: [{ name: 'Cars', multiplier: 1 }] })
    const cb = getCategoryCheckbox('Cars')
    fireEvent.click(cb)
    expect(cb).not.toBeChecked()
  })

  it('close button calls onSave with selected cats', () => {
    const { onSave } = renderModal()
    fireEvent.click(getCategoryCheckbox('Cars'))
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onSave).toHaveBeenCalledWith(
      [{ name: 'Cars', multiplier: 1 }],
      null,
      0,
      60,
      ''
    )
  })

  it('saves location value', () => {
    const { onSave } = renderModal()
    fireEvent.change(screen.getByPlaceholderText(/main street/i), { target: { value: 'North Gate' } })
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onSave).toHaveBeenCalledWith([], null, 0, 60, 'North Gate')
  })

  it('pre-fills location from props', () => {
    renderModal({ location: 'South Bridge' })
    expect(screen.getByPlaceholderText(/main street/i)).toHaveValue('South Bridge')
  })

  it('duration select changes correctly', () => {
    const { onSave } = renderModal({ duration: 60 })
    fireEvent.change(getDurationSelect(), { target: { value: '30' } })
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onSave).toHaveBeenCalledWith([], null, 0, 30, '')
  })

  it('multiplier select shown for each category', () => {
    renderModal()
    ALL_CATEGORIES.forEach(name => {
      expect(getMultiplierSelect(name)).toBeInTheDocument()
    })
  })

  it('history section toggles open/closed', () => {
    renderModal()
    expect(screen.queryByText('No history found')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('History reports'))
    expect(screen.getByText('No history found')).toBeInTheDocument()
    fireEvent.click(screen.getByText('History reports'))
    expect(screen.queryByText('No history found')).not.toBeInTheDocument()
  })

  it('history shows existing localStorage reports', () => {
    localStorage.setItem('traffic-counter-report-20240115_10_00', '[]')
    localStorage.setItem('traffic-counter-report-20240114_09_30', '[]')
    renderModal()
    fireEvent.click(screen.getByText('History reports'))
    expect(screen.getByText('20240115_10_00')).toBeInTheDocument()
    expect(screen.getByText('20240114_09_30')).toBeInTheDocument()
  })

  it('clicking history item calls onExportHistory', () => {
    const key = 'traffic-counter-report-20240115_10_00'
    localStorage.setItem(key, '[]')
    const { onExportHistory } = renderModal()
    fireEvent.click(screen.getByText('History reports'))
    fireEvent.click(screen.getByText('20240115_10_00'))
    expect(onExportHistory).toHaveBeenCalledWith(key)
  })

  it('multiplier change is saved correctly', () => {
    const { onSave } = renderModal({
      selectedCats: [{ name: 'Cars', multiplier: 1 }],
    })
    expect(getCategoryCheckbox('Cars')).toBeChecked()
    fireEvent.change(getMultiplierSelect('Cars'), { target: { value: '10' } })
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onSave).toHaveBeenCalledWith(
      [{ name: 'Cars', multiplier: 10 }],
      null,
      0,
      60,
      ''
    )
  })

  it('onSave passes null hour when not selected', () => {
    const { onSave } = renderModal()
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onSave.mock.calls[0][1]).toBeNull()
  })

  it('onSave passes correct duration option', () => {
    const { onSave } = renderModal({ duration: 90 })
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onSave.mock.calls[0][3]).toBe(90)
  })
})
