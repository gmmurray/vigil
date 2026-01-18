import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { Monitor } from '../../types';

export function MonitorRow({ monitor }: { monitor: Monitor }) {
  const isUp = monitor.status === 'UP' || monitor.status === 'RECOVERING';
  const isDown = monitor.status === 'DOWN';
  const isWarn = monitor.status === 'DEGRADED';

  const history = monitor.recentChecks
    ? [...monitor.recentChecks].reverse()
    : [];

  const SLOT_COUNT = 20;
  const pulseData = Array.from({ length: SLOT_COUNT }).map((_, i) => {
    const historyIndex = history.length - (SLOT_COUNT - i);
    return historyIndex >= 0 ? history[historyIndex] : null;
  });

  const latestCheck = monitor.recentChecks?.[0];
  const latency = latestCheck?.responseTimeMs ?? null;
  const lastCode = latestCheck?.statusCode ?? '---';

  return (
    <Link
      to={`/monitors/${monitor.id}`}
      className="flex flex-col md:flex-row md:justify-between gap-4 border-b border-gold-faint p-5 transition-colors hover:bg-active last:border-b-0 cursor-pointer group"
    >
      <div className="flex gap-5 min-w-0">
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

        <div className="flex flex-col gap-1 min-w-0">
          <div
            className={cn(
              'font-medium text-base transition-colors truncate',
              isDown && 'text-retro-red',
              isWarn && 'text-retro-warn',
              !monitor.enabled && 'text-gold-dim',
            )}
          >
            {monitor.name}
          </div>
          <div className="text-xs font-mono text-gold-dim hover:text-gold-primary truncate opacity-70">
            {monitor.url}
          </div>
          {isDown && (
            <div className="text-xs font-mono text-retro-red mt-1">
              &gt;&gt; CONNECTION REFUSED
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col md:items-end justify-center gap-3">
        <div className="flex gap-0.5">
          {pulseData.map((check, i) => {
            const bitUp = check?.status === 'UP';
            const bitDown = check?.status === 'DOWN';

            return (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-3 transition-all duration-300',
                  check ? 'opacity-100' : 'opacity-10 bg-retro-off',
                  bitUp && 'bg-retro-green',
                  bitDown && 'bg-retro-red',
                  !check && 'bg-retro-off',
                )}
              />
            );
          })}
        </div>

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
