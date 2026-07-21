export default function QuickActionButton({ icon: Icon, label, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[88px] sm:min-h-[96px] p-4 rounded-xl border flex flex-col items-center justify-center gap-2.5 transition-all ${color} w-full active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className="h-10 w-10 rounded-lg bg-white/70 flex items-center justify-center">
        <Icon size={20} className="shrink-0" />
      </div>
      <span className="text-[11px] sm:text-xs font-extrabold leading-tight text-center tracking-wide uppercase">{label}</span>
    </button>
  );
}
