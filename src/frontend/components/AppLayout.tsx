import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { getIncidentsQueryOptions } from '../lib/queries';
import { cn } from '../lib/utils';

export function AppLayout() {
  const { data: incidentData, isLoading: incidentLoading } = useQuery(
    getIncidentsQueryOptions(true),
  );

  const isIncidentState =
    !incidentLoading && (incidentData?.data ?? []).length > 0;

  return (
    <div className="flex justify-center min-h-screen p-8">
      <div className="w-full max-w-250 flex flex-col gap-8 relative z-10">
        <nav className="flex flex-col md:flex-row md:justify-between md:items-end pb-4 border-b border-gold-faint gap-2 md:gap-0">
          <div>
            <Link to="/dashboard">
              <div className="text-xl font-semibold uppercase tracking-[2px] text-gold-primary">
                Vigil<span className="text-gold-dim">{`//`}</span>Monitor
              </div>
            </Link>
          </div>
          <div className="flex gap-0.5">
            <NavButton to="/dashboard" label="Dashboard" />
            <NavButton
              to="/incidents"
              label="Incidents"
              hasAlert={isIncidentState}
            />
            <NavButton to="/config" label="Config" />
          </div>
        </nav>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavButton({
  to,
  label,
  hasAlert,
}: {
  to: string;
  label: string;
  hasAlert?: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn('btn-gold w-full relative', isActive && 'active')
      }
    >
      {label}
      {hasAlert && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3 z-50">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-retro-red opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-retro-red"></span>
        </span>
      )}
    </NavLink>
  );
}
