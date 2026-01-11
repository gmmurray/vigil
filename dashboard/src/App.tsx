import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ConfigListView } from './components/views/ConfigListView'; // Updated import
import { DashboardView } from './components/views/DashboardView';
import { IncidentsView } from './components/views/IncidentsView';
import { MonitorDetailView } from './components/views/MonitorDetailView';
import { MonitorFormView } from './components/views/MonitorFormView'; // New import
import { queryClient } from './lib/api';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardView />} />

            {/* Monitor Details */}
            <Route path="/monitors/:id" element={<MonitorDetailView />} />

            {/* Configuration Routes */}
            <Route path="/config" element={<ConfigListView />} />
            <Route path="/config/add" element={<MonitorFormView />} />
            <Route path="/monitors/:id/edit" element={<MonitorFormView />} />

            <Route path="/incidents" element={<IncidentsView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
