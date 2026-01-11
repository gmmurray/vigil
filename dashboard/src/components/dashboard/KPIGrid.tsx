export function KPIGrid({
  activeCount,
  totalCount,
}: {
  activeCount: number;
  totalCount: number;
}) {
  // TODO: Fetch real stats for Uptime/Latency from /api/monitors/:id/stats
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="panel">
        <div className="text-xs uppercase tracking-widest text-gold-dim mb-2">
          System Status
        </div>
        <div className="text-3xl text-retro-green font-mono">OPERATIONAL</div>
        <div className="text-sm text-gold-dim mt-1">
          {activeCount}/{totalCount} Monitors Active
        </div>
      </div>

      <div className="panel">
        <div className="text-xs uppercase tracking-widest text-gold-dim mb-2">
          Uptime (30d)
        </div>
        <div className="text-3xl text-gold-primary font-mono">99.2%</div>
        <div className="text-sm text-gold-dim mt-1">Total downtime: 42m</div>
      </div>

      <div className="panel">
        <div className="text-xs uppercase tracking-widest text-gold-dim mb-2">
          Avg Latency
        </div>
        <div className="text-3xl text-gold-primary font-mono">
          142<span className="text-base">ms</span>
        </div>
        <div className="text-sm text-gold-dim mt-1">Global Average</div>
      </div>
    </section>
  );
}
