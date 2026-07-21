export default function StatCard({ label, value, icon: Icon, color = 'primary' }) {
  const iconGradients = {
    primary: ['var(--brand-a)', 'var(--brand-c)'],
    success: ['#059669', 'var(--brand-a)'],
    warning: ['var(--brand-e)', 'var(--brand-b)'],
    error: ['var(--brand-d)', 'var(--brand-e)'],
  };
  const [start, end] = iconGradients[color] || iconGradients.primary;

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl" style={{ 
            background: `linear-gradient(135deg, ${start}, ${end})`,
            boxShadow: '0 10px 26px color-mix(in srgb, var(--brand-a) 36%, transparent)'
          }}>
            <Icon size={26} color="white" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs font-bold text-secondary mb-1 uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{label}</p>
          <p className="text-3xl font-bold text-primary" style={{ fontFamily: 'Lexend, sans-serif', letterSpacing: '-0.03em' }}>{value}</p>
        </div>
      </div>
    </div>
  );
}
