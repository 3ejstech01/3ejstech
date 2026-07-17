'use client';
import { useSyncQueueStore } from '@/stores/syncQueueStore';

export function SyncAnimationModal() {
  const { syncingOps, showAnimationModal } = useSyncQueueStore();

  if (!showAnimationModal) return null;

  const progress = syncingOps.filter(op => op.status === 'synced').length / syncingOps.length;
  const currentOp = syncingOps.find(op => op.status === 'syncing');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900/95 border border-white/10 rounded-2xl p-8 shadow-2xl animate-[modalEntry_0.3s_ease-out]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2 animate-spin">⟳</div>
          <h3 className="text-xl font-bold text-white">
            Syncing {syncingOps.length} change{syncingOps.length > 1 ? 's' : ''}...
          </h3>
        </div>

        {/* Pipeline */}
        <div className="relative h-32 mb-4">
          {/* Animated dashed line */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 120">
            <line x1="50" y1="60" x2="350" y2="60"
              stroke="#22d3ee" strokeWidth="2" strokeDasharray="8 4"
              className="animate-[dash_1s_linear_infinite]" />
          </svg>

          {/* Device icon (left) */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-3xl">📱</div>

          {/* Cloud icon (right) */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-3xl">☁️</div>

          {/* Syncing op card */}
          {currentOp && (
            <div className="absolute top-1/2 -translate-y-1/2 left-8 animate-[slideIn_0.3s_ease-out]">
              <div className="bg-cyan-500/20 border border-cyan-500/40 rounded-lg px-3 py-2 text-xs text-cyan-300">
                {currentOp.who} — {currentOp.type} {currentOp.sheet}
              </div>
            </div>
          )}
        </div>

        {/* Progress items */}
        <div className="space-y-2 mb-6 max-h-32 overflow-y-auto">
          {syncingOps.map(op => (
            <div key={op.id} className={`flex items-center gap-2 text-xs ${
              op.status === 'synced' ? 'text-green-400' :
              op.status === 'conflict' || op.status === 'failed' ? 'text-amber-400' :
              'text-white/50'
            }`}>
              <span>{op.status === 'synced' ? '✓' : op.status === 'conflict' ? '⚠️' : '○'}</span>
              <span>{op.who}</span>
              <span>—</span>
              <span className="capitalize">{op.type}</span>
              <span>—</span>
              <span className="truncate">{op.keyValue}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <p className="text-xs text-center text-white/40">
          {currentOp ? `Syncing: ${currentOp.who} — ${currentOp.sheet} #${currentOp.keyValue}` : 'All changes synced!'}
        </p>
      </div>
    </div>
  );
}