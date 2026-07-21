import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MetricCard({ 
  title, 
  value, 
  change, 
  trend = 'up', 
  icon: Icon,
  loading = false 
}) {
  if (loading) {
    return (
      <div className="card">
        <div className="skeleton h-4 w-20 mb-3"></div>
        <div className="skeleton h-8 w-24 mb-2"></div>
        <div className="skeleton h-3 w-16"></div>
      </div>
    );
  }

  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;

  return (
    <div className="card hover:shadow-2xl transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-bold text-secondary mb-2 uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{title}</p>
          <p className="text-4xl font-bold text-primary mb-1" style={{ fontFamily: 'Lexend, sans-serif', letterSpacing: '-0.03em' }}>{value}</p>
        </div>
        {Icon && (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl" style={{ 
            background: `linear-gradient(135deg, var(--brand-a), var(--brand-b))`,
            boxShadow: '0 10px 26px color-mix(in srgb, var(--brand-a) 36%, transparent)'
          }}>
            <Icon size={26} color="white" />
          </div>
        )}
      </div>
      {change && (
        <div className={`flex items-center gap-1.5 text-sm font-bold ${trendColor}`}>
          <TrendIcon size={16} />
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}
