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

const tabs: {
  id: SessionWorkspaceTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
  { id: 'plan', label: 'Plan', icon: <ClipboardList size={16} /> },
  { id: 'patch', label: 'Patch', icon: <GitBranch size={16} /> },
  { id: 'context', label: 'Context', icon: <FileSearch size={16} /> },
  { id: 'verify', label: 'Verify', icon: <ShieldCheck size={16} /> },
  { id: 'memory', label: 'Memory', icon: <Brain size={16} /> },
  { id: 'artifacts', label: 'Artifacts', icon: <Archive size={16} /> },
  { id: 'audit', label: 'Audit', icon: <ScrollText size={16} /> },
];

export function SessionWorkspaceTabs({
  activeTab,
  pendingApprovals,
  artifactCount,
  questionCount,
  taskCount,
  onChange,
}: SessionWorkspaceTabsProps) {
  return (
    <nav className="session-workspace-tabs" aria-label="Session workspace tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          {tab.label}

          {tab.id === 'plan' && pendingApprovals > 0 ? (
            <Badge tone="yellow">{pendingApprovals}</Badge>
          ) : null}

          {tab.id === 'artifacts' && artifactCount > 0 ? (
            <Badge tone="blue">{artifactCount}</Badge>
          ) : null}

          {tab.id === 'overview' && questionCount > 0 ? (
            <Badge tone="yellow">{questionCount}</Badge>
          ) : null}

          {tab.id === 'verify' && taskCount > 0 ? <Badge tone="blue">{taskCount}</Badge> : null}
        </button>
      ))}
    </nav>
  );
}
