import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import BaseMeta from './components/BaseMeta';
import { displayMonitorId } from './components/monitors/ids';
import { ConfigListView } from './components/views/ConfigListView';
import { DashboardView } from './components/views/DashboardView';
import { IncidentsView } from './components/views/IncidentsView';
import { LandingView } from './components/views/LandingView';
import { MonitorDetailView } from './components/views/MonitorDetailView';
import { MonitorFormView } from './components/views/MonitorFormView';
import type { RouteHandle } from './types';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <BaseMeta />,
    children: [
      {
        path: '/',
        element: <LandingView />,
        handle: { title: 'Welcome' },
      },
      {
        element: <AppLayout />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardView />,
            handle: {
              title: pageTitle('Dashboard'),
              meta: {
                noIndex: true,
              },
            } satisfies RouteHandle,
          },
          {
            path: 'monitors/:id',
            element: <MonitorDetailView />,
            handle: {
              title: params =>
                pageTitle(`View ${displayMonitorId(params.id ?? '')}`),
              meta: {
                noIndex: true,
              },
            } satisfies RouteHandle,
          },
          {
            path: 'monitors/:id/edit',
            element: <MonitorFormView />,
            handle: {
              title: params =>
                pageTitle(`Edit ${displayMonitorId(params.id ?? '')}`),
              meta: {
                noIndex: true,
              },
            } satisfies RouteHandle,
          },
          {
            path: 'config',
            element: <ConfigListView />,
            handle: {
              title: pageTitle('Config'),
              meta: {
                noIndex: true,
              },
            } satisfies RouteHandle,
          },
          {
            path: 'config/add',
            element: <MonitorFormView />,
            handle: {
              title: pageTitle('Add Monitor'),
              meta: {
                noIndex: true,
              },
            } satisfies RouteHandle,
          },
          {
            path: 'incidents',
            element: <IncidentsView />,
            handle: {
              title: pageTitle('Incidents'),
              meta: {
                noIndex: true,
              },
            } satisfies RouteHandle,
          },
        ],
      },
    ],
  },
]);

function pageTitle(title: string) {
  return `${title} | Vigil Monitor`;
}
