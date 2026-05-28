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
    <section className="flex flex-col gap-6 md:gap-8 w-full">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
            Zero Runtime Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Local project cockpit for runtime-controlled planning, patching, verification and audit.
          </p>
        </div>

        <button
          className="whitespace-nowrap rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
          onClick={() => void refreshDashboard()}
        >
          Refresh dashboard
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        <CurrentProjectCard
          project={selectedProject}
          onOpenProjects={() => onNavigate('projects')}
        />

        <DashboardQuickActions
          hasProject={selectedProject !== null}
          hasSession={activeSession !== null || sessions.length > 0}
          onOpenProjects={() => onNavigate('projects')}
          onOpenSession={() => onNavigate('session')}
          onOpenSettings={() => onNavigate('settings')}
        />

        <RuntimeHealthCard health={health} />

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
