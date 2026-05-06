export default function HomeMetricCard({ title, value, label, color }) {
  return (
    <div className="bg-white/85 p-4 sm:p-5 rounded-2xl border border-white/80 shadow-sm flex flex-col backdrop-blur-sm">
      <span className="text-xs sm:text-sm font-semibold text-stone-500 tracking-wide uppercase">{title}</span>
      <div className="mt-2 flex items-end gap-2">
        <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${color}`}>{value}</span>
        <span className="text-[10px] sm:text-xs font-semibold text-stone-400 uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}
