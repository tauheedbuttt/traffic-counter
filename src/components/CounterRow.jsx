export default function CounterRow({ name, count, active, onMinus, onPlus }) {
  const btnBase = 'w-14 h-14 rounded-full flex items-center justify-center text-3xl font-light flex-shrink-0 transition-colors touch-manipulation active:opacity-80'
  const btnActive = 'bg-[#6b73ff] text-white'
  const btnIdle = 'bg-[#2d3449] text-gray-400'

  return (
    <div className="flex items-center border-b border-[#2a3145] px-3 py-0" style={{ minHeight: 72 }}>
      <button
        onPointerDown={(e) => { e.preventDefault(); onMinus() }}
        className={`${btnBase} ${active ? btnActive : btnIdle}`}
        aria-label={`Decrease ${name}`}
      >
        −
      </button>
      <div className="flex-1 text-center flex items-center justify-center gap-2">
        <span className="font-bold text-2xl tabular-nums w-8 text-right">{count}</span>
        <span className="text-lg font-medium">{name}</span>
      </div>
      <button
        onPointerDown={(e) => { e.preventDefault(); onPlus() }}
        className={`${btnBase} ${active ? btnActive : btnIdle}`}
        aria-label={`Increase ${name}`}
      >
        +
      </button>
    </div>
  )
}
