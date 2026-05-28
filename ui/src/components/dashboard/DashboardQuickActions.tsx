import { FolderKanban, Play, Settings, Sparkles, TerminalSquare } from 'lucide-react';

interface DashboardQuickActionsProps {
  hasProject: boolean;
  hasSession: boolean;
  onOpenProjects: () => void;
  onOpenSession: () => void;
  onOpenSettings: () => void;
}

export function DashboardQuickActions({
  hasProject,
  hasSession,
  onOpenProjects,
  onOpenSession,
  onOpenSettings,
}: DashboardQuickActionsProps) {
  return (
    <article className="dashboard-card dashboard-quick-actions">
      <div className="dashboard-title-row">
        <Sparkles size={18} />
        <strong>Start here</strong>
      </div>

      <p className="muted">
        Follow this order for the MVP demo: select a project, open a session, then let the runtime
        guide the plan → patch → sandbox → report flow.
      </p>

      <div className="dashboard-action-grid">
        <button onClick={onOpenProjects}>
          <FolderKanban size={16} />
          {hasProject ? '1. Change project' : '1. Select project'}
        </button>

        <button disabled={!hasProject} onClick={onOpenSession}>
          <TerminalSquare size={16} />
          {hasSession ? '2. Resume session' : '2. Start session'}
        </button>

        <button className="secondary-button" onClick={onOpenSettings}>
          <Settings size={16} />
          3. Check settings
        </button>
      </div>

      {!hasProject ? (
        <article className="dashboard-helper-note">
          <Play size={16} />
          <span>Select a local project first. Zero needs a project root before it can start.</span>
        </article>
      ) : null}
    </article>
  );
}
