import { useEffect, useState } from 'react';
import { getHealth, subscribeRuntimeEvents } from './api/runtimeApi';
import { EventTimeline } from './components/EventTimeline';
import { AppLayout, type AppPage } from './layouts/AppLayout';
import { ProjectsPage } from './pages/ProjectsPage';
import { SessionPage } from './pages/SessionPage';
import { SettingsPage } from './pages/SettingsPage';
import type { RuntimeEvent, RuntimeHealth } from './types/runtime';

export function App() {
  const [page, setPage] = useState<AppPage>('projects');
  const [health, setHealth] = useState<RuntimeHealth | null>(null);
  const [events, setEvents] = useState<RuntimeEvent[]>([]);

  useEffect(() => {
    void getHealth().then(setHealth);

    const source = subscribeRuntimeEvents({
      onEvent: (event) => {
        setEvents((current) => [event, ...current].slice(0, 40));
      },
    });

    return () => {
      source.close();
    };
  }, []);

  return (
    <AppLayout page={page} health={health} onNavigate={setPage}>
      {page === 'projects' ? <ProjectsPage /> : null}
      {page === 'session' ? <SessionPage runtimeEvents={events} /> : null}
      {page === 'settings' ? <SettingsPage /> : null}

      <EventTimeline events={events} />
    </AppLayout>
  );
}
