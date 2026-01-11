import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ConfigView } from './components/views/ConfigView';
import { DashboardView } from './components/views/DashboardView';
import { MonitorDetailView } from './components/views/MonitorDetailView';
import { queryClient } from './lib/api';

// Placeholder Views
const IncidentsView = () => (
  <div className="panel h-64 flex items-center justify-center text-gold-dim font-mono">
    :: INCIDENTS_LOG ::
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardView />} />
            <Route path="/monitors/:id" element={<MonitorDetailView />} />
            <Route path="/incidents" element={<IncidentsView />} />
            <Route path="/config" element={<ConfigView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
