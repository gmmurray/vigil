import type { JSX } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  NameType,
  ValueType,
} from 'recharts/types/component/DefaultTooltipContent';
import { cn } from '../../lib/utils';
import type { CheckResult } from '../../types';

interface ResponseTimeChartProps {
  checks: CheckResult[];
}

export function ResponseTimeChart({ checks }: ResponseTimeChartProps) {
  const data = [...checks]
    .map(c => ({
      timestamp: new Date(c.checkedAt).getTime(),
      latency: c.responseTimeMs ?? null,
      status: c.status,
      timeLabel: new Date(c.checkedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (data.length === 0) {
    return (
      <div className="h-62.5 flex items-center justify-center border border-gold-faint bg-active/10 text-gold-dim font-mono text-xs">
        NO SIGNAL DATA
      </div>
    );
  }

  return (
    <div className="h-62.5 w-full bg-active/5 border border-gold-faint p-4 relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            stroke="#3d3423"
            strokeDasharray="3 3"
            vertical={false}
            opacity={0.5}
          />

          <XAxis
            dataKey="timestamp"
            type="number" // <--- KEY FIX: Treats X as continuous time, not distinct categories
            domain={['dataMin', 'dataMax']}
            tickFormatter={unixTime =>
              new Date(unixTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            }
            stroke="#8c7648"
            tick={{
              fill: '#8c7648',
              fontSize: 10,
              fontFamily: 'JetBrains Mono',
            }}
            tickLine={false}
            axisLine={false}
            minTickGap={50}
            dy={10}
          />

          <YAxis
            stroke="#8c7648"
            tick={{
              fill: '#8c7648',
              fontSize: 10,
              fontFamily: 'JetBrains Mono',
            }}
            tickLine={false}
            axisLine={false}
            tickFormatter={value => `${value}`}
            width={35}
            domain={[0, 'auto']}
          />

          <Tooltip
            content={props => <CustomTooltip {...props} />}
            cursor={{
              stroke: '#dca54c',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
            isAnimationActive={false}
            trigger="hover"
          />

          <Line
            type="monotoneX"
            dataKey="latency"
            stroke="#dca54c"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: '#dca54c',
              stroke: '#050505',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="absolute top-2 left-3 text-[10px] text-gold-dim font-mono">
        (ms)
      </div>
    </div>
  );
}

const CustomTooltip = ({
  active,
  payload,
}: TooltipContentProps<ValueType, NameType>): JSX.Element | null => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload; // Access our full data object
    const status = dataPoint.status;
    const isUp = status === 'UP' || status === 'RECOVERING';
    const isDown = status === 'DOWN';

    return (
      <div className="bg-panel border border-gold-primary p-3 shadow-[0_0_10px_rgba(0,0,0,0.5)] min-w-35 z-50">
        <div className="text-gold-dim text-[10px] font-mono uppercase tracking-wider mb-2 border-b border-gold-faint pb-1">
          {dataPoint.timeLabel} {/* Use our pre-formatted label */}
        </div>

        <div className="flex justify-between items-end mb-1">
          <span className="text-xs text-gold-dim font-mono">LATENCY</span>
          <span className="text-gold-primary font-mono text-lg leading-none">
            {payload[0].value}
            <span className="text-xs ml-0.5">ms</span>
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gold-dim font-mono">STATUS</span>
          <span
            className={cn(
              'text-xs font-mono font-bold',
              isUp && 'text-retro-green',
              isDown && 'text-retro-red',
              !isUp && !isDown && 'text-retro-warn',
            )}
          >
            {status}
          </span>
        </div>
      </div>
    );
  }
  return null;
};
