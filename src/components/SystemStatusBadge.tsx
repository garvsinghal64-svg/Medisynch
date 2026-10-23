import React from 'react';

export type SystemStatus = 'idle' | 'analyzing' | 'full-hybrid' | 'local-fallback';

export interface SystemStatusBadgeProps {
  status: SystemStatus;
}

export interface StatusDisplayConfig {
  label: string;
  badgeClassName: string;
  dotClassName: string;
  tooltip?: string;
}

export const LOCAL_FALLBACK_TOOLTIP =
  'Live AI is currently unreachable. Results are based strictly on local deterministic heuristics.';

export function getSystemStatusConfig(status: SystemStatus): StatusDisplayConfig {
  switch (status) {
    case 'idle':
      return {
        label: 'Waiting for EHR Data...',
        badgeClassName:
          'bg-stone-100 text-stone-700 border-stone-300',
        dotClassName: 'bg-stone-400',
      };
    case 'analyzing':
      return {
        label: '🔄 Running Hybrid Analysis...',
        badgeClassName:
          'bg-blue-50 text-blue-800 border-blue-300 animate-pulse',
        dotClassName: 'bg-blue-600 animate-ping',
      };
    case 'full-hybrid':
      return {
        label: '✅ Full Hybrid Analysis (AI + Local Safety Net)',
        badgeClassName:
          'bg-emerald-50 text-emerald-900 border-emerald-300',
        dotClassName: 'bg-emerald-600',
      };
    case 'local-fallback':
      return {
        label: '⚠️ Fallback Mode (Pre-built Safety Rules Only)',
        badgeClassName:
          'bg-amber-100 text-amber-950 border-amber-400',
        dotClassName: 'bg-amber-600',
        tooltip: LOCAL_FALLBACK_TOOLTIP,
      };
  }
}

export const SystemStatusBadge: React.FC<SystemStatusBadgeProps> = ({ status }) => {
  const config = getSystemStatusConfig(status);

  return (
    <div
      className="max-w-[1520px] w-full mx-auto border-x border-b border-stone-200/90 bg-white/90 px-4 py-1.5 flex items-center justify-between gap-3"
      role="status"
      aria-live="polite"
      data-testid="system-status-bar"
    >
      <div className="flex items-center gap-2 text-xs text-stone-600">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-stone-500">
          Hybrid CDS Pipeline Status
        </span>
      </div>

      <div className="relative group inline-flex items-center">
        <span
          data-testid="system-status-badge"
          data-status={status}
          title={config.tooltip}
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs transition-all ${config.badgeClassName}`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${config.dotClassName}`}
            aria-hidden="true"
          />
          <span>{config.label}</span>
        </span>

        {config.tooltip && (
          <div
            role="tooltip"
            data-testid="system-status-tooltip"
            className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute right-0 top-full mt-1.5 w-80 p-2.5 rounded-lg bg-stone-900 text-white text-[11px] leading-relaxed shadow-lg z-50"
          >
            {config.tooltip}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemStatusBadge;
