import { useEffect, useState } from 'react';
import { listRuntimeArtifacts, listSessions } from '../../api/runtimeApi';
import type {
  InteractiveSessionState,
  ProjectProfile,
  RuntimeArtifactIndex,
  RuntimeHealth,
} from '../../types/runtime';
import type { AppPage } from '../../layouts/AppLayout';
import { CurrentProjectCard } from './CurrentProjectCard';
import { DashboardQuickActions } from './DashboardQuickActions';
import { RecentArtifactsCard } from './RecentArtifactsCard';
import { RecentSessionsCard } from './RecentSessionsCard';
import { RuntimeHealthCard } from './RuntimeHealthCard';

interface ProjectDashboardProps {
  selectedProject: ProjectProfile | null;
  activeSession: InteractiveSessionState | null;
  health: RuntimeHealth | null;
  onNavigate: (page: AppPage) => void;
  onSessionLoaded: (session: InteractiveSessionState | null) => void;
}

export function ProjectDashboard({
  selectedProject,
  activeSession,
  health,
  onNavigate,
  onSessionLoaded,
}: ProjectDashboardProps) {
  const [sessions, setSessions] = useState<InteractiveSessionState[]>([]);
  const [artifactIndex, setArtifactIndex] = useState<RuntimeArtifactIndex | null>(null);

  useEffect(() => {
    void refreshDashboard();
  }, []);

  async function refreshDashboard() {
    const [sessionResult, artifactResult] = await Promise.all([
      listSessions(),
      listRuntimeArtifacts(),
    ]);

    setSessions(sessionResult.sessions);
    setArtifactIndex(artifactResult.artifactIndex);

    if (!activeSession) {
      onSessionLoaded(sessionResult.sessions[0] ?? null);
    }
  }

  return (
    <section className="project-dashboard-page">
      <header className="dashboard-hero panel">
        <div>
          <h1>Zero Runtime Dashboard</h1>
          <p className="muted">
            Local project cockpit for runtime-controlled planning, patching, verification and audit.
          </p>
        </div>

        <button className="secondary-button" onClick={() => void refreshDashboard()}>
          Refresh dashboard
        </button>
      </header>

      <section className="dashboard-grid">
        <CurrentProjectCard
          project={selectedProject}
          onOpenProjects={() => onNavigate('projects')}
        />

        <RuntimeHealthCard health={health} />

        <DashboardQuickActions
          hasProject={selectedProject !== null}
          hasSession={activeSession !== null || sessions.length > 0}
          onOpenProjects={() => onNavigate('projects')}
          onOpenSession={() => onNavigate('session')}
          onOpenSettings={() => onNavigate('settings')}
        />

        <RecentSessionsCard
          sessions={sessions}
          activeSession={activeSession}
          onOpenSession={() => onNavigate('session')}
        />

        <RecentArtifactsCard index={artifactIndex} onOpenSession={() => onNavigate('session')} />
      </section>
    </section>
  );
}
