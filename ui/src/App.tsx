import { useEffect, useState } from 'react';
import {
  getCurrentProject,
  getHealth,
  listSessions,
  subscribeRuntimeEvents,
} from './api/runtimeApi';
import { EventTimeline } from './components/EventTimeline';
import { AppLayout, type AppPage } from './layouts/AppLayout';
import { ProjectsPage } from './pages/ProjectsPage';
import { SessionPage } from './pages/SessionPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProjectDashboard } from './components/dashboard/ProjectDashboard';
import type {
  InteractiveSessionState,
  ProjectProfile,
  RuntimeEvent,
  RuntimeHealth,
} from './types/runtime';

export function App() {
  const [page, setPage] = useState<AppPage>('dashboard');
  const [health, setHealth] = useState<RuntimeHealth | null>(null);
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectProfile | null>(null);
  const [activeSession, setActiveSession] = useState<InteractiveSessionState | null>(null);

  useEffect(() => {
    void getHealth().then(setHealth);
    void getCurrentProject().then(setSelectedProject);
    void listSessions().then((result) => {
      setActiveSession(result.sessions[0] ?? null);
    });

    const source = subscribeRuntimeEvents({
      onEvent: (event) => {
        setEvents((current) => [event, ...current].slice(0, 40));
      },
    });

    return () => {
      source.close();
    };
  }, []);

  function openGuidedSession(project: ProjectProfile): void {
    setSelectedProject(project);
    setActiveSession(null);
    setPage('session');
  }

  return (
    <AppLayout page={page} health={health} onNavigate={setPage}>
      {page === 'dashboard' ? (
        <ProjectDashboard
          selectedProject={selectedProject}
          activeSession={activeSession}
          health={health}
          onNavigate={setPage}
          onSessionLoaded={setActiveSession}
        />
      ) : null}

      {page === 'projects' ? (
        <ProjectsPage
          selectedProject={selectedProject}
          onProjectSelected={setSelectedProject}
          onStartSession={openGuidedSession}
        />
      ) : null}

      {page === 'session' ? (
        <SessionPage
          selectedProject={selectedProject}
          initialSession={activeSession}
          runtimeEvents={events}
          onSessionChange={setActiveSession}
        />
      ) : null}

      {page === 'settings' ? <SettingsPage /> : null}

      <EventTimeline events={events} />
    </AppLayout>
  );
}
