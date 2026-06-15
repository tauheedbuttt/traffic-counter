import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CounterRow from '../components/CounterRow'

function renderRow(overrides = {}) {
  const props = {
    name: 'Cars',
    count: 0,
    active: true,
    onMinus: vi.fn(),
    onPlus: vi.fn(),
    ...overrides,
  }
  render(<CounterRow {...props} />)
  return props
}

describe('CounterRow', () => {
  it('renders name', () => {
    renderRow()
    expect(screen.getByText('Cars')).toBeInTheDocument()
  })

  it('renders count', () => {
    renderRow({ count: 42 })
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders zero count', () => {
    renderRow({ count: 0 })
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders large count', () => {
    renderRow({ count: 9999 })
    expect(screen.getByText('9999')).toBeInTheDocument()
  })

  it('calls onPlus on + button pointer down', () => {
    const { onPlus } = renderRow()
    fireEvent.pointerDown(screen.getByLabelText('Increase Cars'))
    expect(onPlus).toHaveBeenCalledTimes(1)
  })

  it('calls onMinus on - button pointer down', () => {
    const { onMinus } = renderRow()
    fireEvent.pointerDown(screen.getByLabelText('Decrease Cars'))
    expect(onMinus).toHaveBeenCalledTimes(1)
  })

  it('active buttons have active style class', () => {
    renderRow({ active: true })
    const btn = screen.getByLabelText('Increase Cars')
    expect(btn.className).toContain('bg-[#6b73ff]')
  })

  it('inactive buttons have idle style class', () => {
    renderRow({ active: false })
    const btn = screen.getByLabelText('Increase Cars')
    expect(btn.className).toContain('bg-[#2d3449]')
  })

  it('renders aria labels', () => {
    renderRow({ name: 'Pedestrians' })
    expect(screen.getByLabelText('Increase Pedestrians')).toBeInTheDocument()
    expect(screen.getByLabelText('Decrease Pedestrians')).toBeInTheDocument()
  })

  it('multiple rapid presses call handler each time', () => {
    const { onPlus } = renderRow()
    const btn = screen.getByLabelText('Increase Cars')
    for (let i = 0; i < 20; i++) fireEvent.pointerDown(btn)
    expect(onPlus).toHaveBeenCalledTimes(20)
  })
})
