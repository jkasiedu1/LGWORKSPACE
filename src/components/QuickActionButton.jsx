export default function QuickActionButton({ icon: Icon, label, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[88px] sm:min-h-[96px] p-4 rounded-xl border flex flex-col items-center justify-center gap-2.5 transition-colors ${color} w-full active:scale-[0.99]`}
    >
      <Icon size={22} className="shrink-0" />
      <span className="text-[11px] sm:text-xs font-bold leading-tight text-center">{label}</span>
    </button>
  );
}
