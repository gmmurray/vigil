import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { Monitor } from '../../types';

export function MonitorRow({ monitor }: { monitor: Monitor }) {
  const isUp = monitor.status === 'UP' || monitor.status === 'RECOVERING';
  const isDown = monitor.status === 'DOWN';
  const isWarn = monitor.status === 'DEGRADED';

  // 1. Prepare Pulse Data
  // API gives Newest -> Oldest. We want Oldest -> Newest for left-to-right timeline.
  const history = monitor.recentChecks
    ? [...monitor.recentChecks].reverse()
    : [];

  // Create a fixed 20-slot array. Fill from the right (newest), pad left with null.
  const SLOT_COUNT = 20;
  const pulseData = Array.from({ length: SLOT_COUNT }).map((_, i) => {
    // Calculate index relative to the end of the history array
    const historyIndex = history.length - (SLOT_COUNT - i);
    return historyIndex >= 0 ? history[historyIndex] : null;
  });

  // 2. Get Latest Check for Stats (if available)
  const latestCheck = monitor.recentChecks?.[0];
  const latency = latestCheck?.responseTimeMs ?? null;
  const lastCode = latestCheck?.statusCode ?? '---';

  return (
    <Link
      to={`/monitors/${monitor.id}`}
      className="grid grid-cols-[40px_2fr_1.5fr] border-b border-gold-faint p-5 transition-colors hover:bg-active last:border-b-0 cursor-pointer group"
    >
      {/* Status Block (Global State) */}
      <div className="pt-1.5">
        <div
          className={cn(
            'w-3 h-3 shadow-[0_0_5px]',
            isUp && 'bg-retro-green shadow-retro-green',
            isDown && 'bg-retro-red shadow-retro-red',
            isWarn && 'bg-retro-warn shadow-retro-warn',
            !monitor.enabled && 'bg-retro-off shadow-none',
          )}
        />
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'font-medium text-base transition-colors',
            isDown && 'text-retro-red',
            isWarn && 'text-retro-warn',
            !monitor.enabled && 'text-gold-dim',
          )}
        >
          {monitor.name}
        </div>
        <div className="text-xs font-mono text-gold-dim hover:text-gold-primary truncate max-w-75 opacity-70">
          {monitor.url}
        </div>
        {isDown && (
          <div className="text-xs font-mono text-retro-red mt-1">
            &gt;&gt; CONNECTION REFUSED
          </div>
        )}
      </div>

      {/* Pulse Viz & Stats */}
      <div className="flex flex-col items-end justify-center gap-3">
        {/* The Digital Pulse Track */}
        <div className="flex gap-0.5">
          {pulseData.map((check, i) => {
            // Determine color for this specific "bit"
            const bitUp = check?.status === 'UP';
            const bitDown = check?.status === 'DOWN';

            return (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-3 transition-all duration-300',
                  // If check exists: 100% opacity. If padding: 10% opacity
                  check ? 'opacity-100' : 'opacity-10 bg-retro-off',
                  // Color logic
                  bitUp && 'bg-retro-green',
                  bitDown && 'bg-retro-red',
                  // Default fallback for padding or unknown
                  !check && 'bg-retro-off',
                )}
              />
            );
          })}
        </div>

        {/* Real-time Stats from Latest Check */}
        <div className="flex gap-4 text-xs font-mono text-gold-dim">
          <span
            className={cn(
              latestCheck?.status === 'UP' && 'text-gold-primary',
              latestCheck?.status === 'DOWN' && 'text-retro-red',
            )}
          >
            {latestCheck
              ? `${lastCode} ${latestCheck.status === 'UP' ? 'OK' : 'ERR'}`
              : 'NO DATA'}
          </span>
          <span className="text-gold-faint">|</span>
          <span className={cn(latency && latency > 1000 && 'text-retro-warn')}>
            {latency !== null ? `${latency}ms` : '---'}
          </span>
        </div>
      </div>
    </Link>
  );
}
