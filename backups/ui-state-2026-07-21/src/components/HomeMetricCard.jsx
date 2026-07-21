export default function HomeMetricCard({ title, value, label, color }) {
  return (
    <div className="bg-white/80 p-4 sm:p-5 rounded-2xl border border-white/80 shadow-sm flex flex-col backdrop-blur-md relative overflow-hidden">
      <div className="absolute -right-8 -top-10 h-20 w-20 rounded-full bg-gradient-to-br from-orange-200/40 to-sky-200/30" />
      <span className="text-[11px] sm:text-xs font-bold text-stone-500 tracking-[0.16em] uppercase">{title}</span>
      <div className="mt-2 flex items-end gap-2 relative z-10">
        <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${color}`}>{value}</span>
        <span className="text-[10px] sm:text-xs font-semibold text-stone-400 uppercase tracking-[0.14em]">{label}</span>
      </div>
    </div>
  );
}
