import { Play, Settings, Sparkles, TerminalSquare } from 'lucide-react';

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
        <strong>Quick actions</strong>
      </div>

      <div className="dashboard-action-grid">
        <button onClick={onOpenProjects}>
          <Play size={16} />
          {hasProject ? 'Change project' : 'Select project'}
        </button>

        <button disabled={!hasProject} onClick={onOpenSession}>
          <TerminalSquare size={16} />
          {hasSession ? 'Resume session' : 'Start session'}
        </button>

        <button className="secondary-button" onClick={onOpenSettings}>
          <Settings size={16} />
          Provider settings
        </button>
      </div>
    </article>
  );
}
