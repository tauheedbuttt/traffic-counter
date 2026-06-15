export default function Logo() {
  return (
    <div
      className="flex flex-col text-white font-bold leading-none rounded-sm overflow-hidden flex-shrink-0"
      style={{ width: 44 }}
    >
      <div
        className="bg-[#e04040] flex items-center justify-between px-1"
        style={{ fontSize: 8, paddingTop: 2, paddingBottom: 2 }}
      >
        <span className="tracking-widest">ALL</span>
        <span className="bg-white rounded-sm" style={{ width: 8, height: 8 }} />
      </div>
      <div
        className="bg-[#1a7a42] text-center tracking-widest"
        style={{ fontSize: 8, paddingTop: 2, paddingBottom: 2 }}
      >
        UNITE
      </div>
    </div>
  )
}
