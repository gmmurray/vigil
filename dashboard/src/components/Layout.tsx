import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '../lib/utils';

export function Layout() {
  return (
    <div className="flex justify-center min-h-screen p-8">
      <div className="w-full max-w-250 flex flex-col gap-8 relative z-10">
        {/* Header */}
        <nav className="flex justify-between items-end pb-4 border-b border-gold-faint">
          <div className="text-xl font-semibold uppercase tracking-[2px] text-gold-primary">
            System<span className="text-gold-dim">{`//`}</span>Monitor
          </div>
          <div className="flex gap-0.5">
            <NavButton to="/" label="Dashboard" />
            <NavButton to="/incidents" label="Incidents" />
            <NavButton to="/config" label="Config" />
          </div>
        </nav>

        {/* Content Route */}
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
      className={({ isActive }) => cn('btn-gold', isActive && 'active')}
    >
      {label}
    </NavLink>
  );
}
