export function SkeletonCard({ className = '' }) {
  return (
    <div className={`animate-pulse bg-white rounded-xl border border-stone-200 p-5 ${className}`}>
      <div className="h-3 bg-stone-200 rounded w-2/5 mb-3" />
      <div className="h-7 bg-stone-200 rounded w-1/2" />
    </div>
  );
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-stone-200 rounded w-1/3" />
            <div className="h-2.5 bg-stone-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
