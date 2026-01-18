import { Link, NavLink, Outlet } from 'react-router-dom';

import { cn } from '../lib/utils';

export function AppLayout() {
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
            <NavButton to="/incidents" label="Incidents" />
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

function NavButton({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn('btn-gold w-full', isActive && 'active')}
    >
      {label}
    </NavLink>
  );
}
