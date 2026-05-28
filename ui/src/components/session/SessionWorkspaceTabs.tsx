import {
  Activity,
  Archive,
  Brain,
  ClipboardList,
  FileSearch,
  GitBranch,
  ShieldCheck,
  ScrollText,
} from 'lucide-react';
import { Badge } from '../Badge';

export type SessionWorkspaceTab =
  | 'overview'
  | 'plan'
  | 'patch'
  | 'context'
  | 'verify'
  | 'memory'
  | 'artifacts'
  | 'audit';

interface SessionWorkspaceTabsProps {
  activeTab: SessionWorkspaceTab;
  pendingApprovals: number;
  artifactCount: number;
  questionCount: number;
  taskCount: number;
  onChange: (tab: SessionWorkspaceTab) => void;
}

const mainTabs: {
  id: SessionWorkspaceTab;
  label: string;
  helper: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'overview',
    label: 'Overview',
    helper: 'Start here',
    icon: <Activity size={16} />,
  },
  {
    id: 'plan',
    label: 'Plan',
    helper: 'Define safe steps',
    icon: <ClipboardList size={16} />,
  },
  {
    id: 'patch',
    label: 'Patch',
    helper: 'Review changes',
    icon: <GitBranch size={16} />,
  },
  {
    id: 'verify',
    label: 'Verify',
    helper: 'Check safely',
    icon: <ShieldCheck size={16} />,
  },
];

const advancedTabs: {
  id: SessionWorkspaceTab;
  label: string;
  helper: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'context',
    label: 'Context',
    helper: 'Project evidence',
    icon: <FileSearch size={16} />,
  },
  {
    id: 'memory',
    label: 'Memory',
    helper: 'Session decisions',
    icon: <Brain size={16} />,
  },
  {
    id: 'artifacts',
    label: 'Artifacts',
    helper: 'Reports and files',
    icon: <Archive size={16} />,
  },
  {
    id: 'audit',
    label: 'Audit',
    helper: 'Timeline',
    icon: <ScrollText size={16} />,
  },
];

const advancedTabIds = new Set<SessionWorkspaceTab>(advancedTabs.map((tab) => tab.id));

export function SessionWorkspaceTabs({
  activeTab,
  pendingApprovals,
  artifactCount,
  questionCount,
  taskCount,
  onChange,
}: SessionWorkspaceTabsProps) {
  const advancedOpen = advancedTabIds.has(activeTab);

  return (
    <nav
      className="session-workspace-tabs session-workspace-tabs-friendly"
      aria-label="Session workspace tabs"
    >
      <div className="session-workspace-tabs-main">
        <div className="workspace-tabs-label">
          <strong>Main flow</strong>
          <span>Follow these steps first.</span>
        </div>

        <div className="workspace-tab-row">
          {mainTabs.map((tab) => (
            <WorkspaceTabButton
              key={tab.id}
              active={activeTab === tab.id}
              id={tab.id}
              label={tab.label}
              helper={tab.helper}
              icon={tab.icon}
              pendingApprovals={pendingApprovals}
              artifactCount={artifactCount}
              questionCount={questionCount}
              taskCount={taskCount}
              onChange={onChange}
            />
          ))}
        </div>
      </div>

      <details className="session-workspace-advanced-tabs" open={advancedOpen}>
        <summary>
          <span>
            <strong>Advanced details</strong>
            <small>Context, memory, artifacts and audit are available when needed.</small>
          </span>

          {advancedOpen ? <Badge tone="blue">open</Badge> : <Badge tone="slate">optional</Badge>}
        </summary>

        <div className="workspace-tab-row workspace-tab-row-advanced">
          {advancedTabs.map((tab) => (
            <WorkspaceTabButton
              key={tab.id}
              active={activeTab === tab.id}
              id={tab.id}
              label={tab.label}
              helper={tab.helper}
              icon={tab.icon}
              pendingApprovals={pendingApprovals}
              artifactCount={artifactCount}
              questionCount={questionCount}
              taskCount={taskCount}
              onChange={onChange}
            />
          ))}
        </div>
      </details>
    </nav>
  );
}

function WorkspaceTabButton({
  active,
  id,
  label,
  helper,
  icon,
  pendingApprovals,
  artifactCount,
  questionCount,
  taskCount,
  onChange,
}: {
  active: boolean;
  id: SessionWorkspaceTab;
  label: string;
  helper: string;
  icon: React.ReactNode;
  pendingApprovals: number;
  artifactCount: number;
  questionCount: number;
  taskCount: number;
  onChange: (tab: SessionWorkspaceTab) => void;
}) {
  return (
    <button className={active ? 'active' : ''} onClick={() => onChange(id)}>
      <span className="workspace-tab-icon">{icon}</span>

      <span className="workspace-tab-copy">
        <strong>{label}</strong>
        <small>{helper}</small>
      </span>

      {id === 'plan' && pendingApprovals > 0 ? (
        <Badge tone="yellow">{pendingApprovals}</Badge>
      ) : null}

      {id === 'artifacts' && artifactCount > 0 ? <Badge tone="blue">{artifactCount}</Badge> : null}

      {id === 'overview' && questionCount > 0 ? <Badge tone="yellow">{questionCount}</Badge> : null}

      {id === 'verify' && taskCount > 0 ? <Badge tone="blue">{taskCount}</Badge> : null}
    </button>
  );
}
