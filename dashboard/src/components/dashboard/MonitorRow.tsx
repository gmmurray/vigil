import { cn } from '../../lib/utils';
import type { Monitor } from '../../types';

export function MonitorRow({ monitor }: { monitor: Monitor }) {
  const isUp = monitor.status === 'UP' || monitor.status === 'RECOVERING';
  const isDown = monitor.status === 'DOWN';
  const isWarn = monitor.status === 'DEGRADED';

  return (
    <div className="grid grid-cols-[40px_2fr_1.5fr] border-b border-gold-faint p-5 transition-colors hover:bg-active last:border-b-0">
      {/* Status Block */}
      <div className="pt-1.5">
        <div
          className={cn(
            'w-3 h-3 shadow-[0_0_5px]',
            isUp && 'bg-retro-green shadow-retro-green',
            isDown && 'bg-retro-red shadow-retro-red',
            isWarn && 'bg-retro-warn shadow-retro-warn',
          )}
        />
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'font-medium text-base',
            isDown && 'text-retro-red',
            isWarn && 'text-retro-warn',
          )}
        >
          {monitor.name}
        </div>
        <a
          href={monitor.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-mono text-gold-dim hover:text-gold-primary truncate max-w-[300px] block opacity-70"
        >
          {monitor.url}
        </a>
        {isDown && (
          <div className="text-xs font-mono text-retro-red mt-1">
            &gt;&gt; CONNECTION REFUSED
          </div>
        )}
      </div>

      {/* Pulse Viz (Mocked random pattern for now) */}
      <div className="flex flex-col items-end justify-center gap-3">
        <div className="flex gap-[2px]">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i.toString()}
              className={cn(
                'w-1.5 h-3 opacity-50',
                Math.random() > 0.3 && 'opacity-100', // Random "activity"
                isUp && 'bg-retro-green',
                isDown && 'bg-retro-red',
                isWarn && 'bg-retro-warn',
              )}
            />
          ))}
        </div>

        <div className="flex gap-4 text-xs font-mono text-gold-dim">
          <span
            className={cn(
              isUp && 'text-gold-primary',
              isDown && 'text-retro-red',
              isWarn && 'text-retro-warn',
            )}
          >
            {monitor.status}
          </span>
          <span className="text-gold-faint">|</span>
          <span>{monitor.intervalSeconds}s</span>
        </div>
      </div>
    </div>
  );
}
