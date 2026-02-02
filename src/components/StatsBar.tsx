export default function StatsBar({ 
  totalEvents, 
  totalItems, 
  uniqueSources,
  breakingCount = 0
}: { 
  totalEvents: number; 
  totalItems: number; 
  uniqueSources: number;
  breakingCount?: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalEvents}</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">Active Events</div>
      </div>
      
      <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalItems}</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">Total Reports</div>
      </div>
      
      <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{uniqueSources}</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">News Sources</div>
      </div>
      
      {breakingCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
          <div className="text-2xl font-bold text-red-900 dark:text-red-200">{breakingCount}</div>
          <div className="text-xs text-red-700 dark:text-red-300">🔴 Breaking News</div>
        </div>
      )}
    </div>
  );
}
