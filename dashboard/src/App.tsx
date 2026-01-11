import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { KPIGrid } from './components/dashboard/KPIGrid';
import { MonitorRow } from './components/dashboard/MonitorRow';
import { Layout } from './components/Layout';
import type { Monitor } from './types';

function DashboardView() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/monitors')
      .then(res => res.json())
      .then(data => {
        setMonitors(data as Monitor[]);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch monitors:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="panel h-32 flex items-center justify-center font-mono text-gold-dim animate-pulse">
        :: INITIALIZING DATALINK ::
      </div>
    );
  }

  const activeCount = monitors.filter(m => m.enabled).length;

  return (
    <div className="flex flex-col gap-8">
      <KPIGrid activeCount={activeCount} totalCount={monitors.length} />

      <div className="bg-panel border border-gold-faint">
        {monitors.length === 0 ? (
          <div className="p-8 text-center text-gold-dim font-mono text-sm">
            NO MONITORS CONFIGURED
          </div>
        ) : (
          monitors.map(monitor => (
            <MonitorRow key={monitor.id} monitor={monitor} />
          ))
        )}
      </div>
    </div>
  );
}

// Placeholder Views
const IncidentsView = () => (
  <div className="panel h-64 flex items-center justify-center text-gold-dim font-mono">
    :: INCIDENTS_LOG ::
  </div>
);
const ConfigView = () => (
  <div className="panel h-64 flex items-center justify-center text-gold-dim font-mono">
    :: SYSTEM_CONFIG ::
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardView />} />
          <Route path="/incidents" element={<IncidentsView />} />
          <Route path="/config" element={<ConfigView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
