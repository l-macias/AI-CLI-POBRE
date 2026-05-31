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

const primaryTabs: {
  id: SessionWorkspaceTab;
  label: string;
  helper: string;
  icon: React.ReactNode;
}[] = [
  { id: 'overview', label: 'Guide', helper: 'Next action', icon: <Activity size={16} /> },
  { id: 'plan', label: 'Plan', helper: 'Scope & risks', icon: <ClipboardList size={16} /> },
  { id: 'patch', label: 'Patch', helper: 'Changes', icon: <GitBranch size={16} /> },
  { id: 'context', label: 'Context', helper: 'Files & links', icon: <FileSearch size={16} /> },
  { id: 'verify', label: 'Verify', helper: 'Checks', icon: <ShieldCheck size={16} /> },
];

const secondaryTabs: {
  id: SessionWorkspaceTab;
  label: string;
  helper: string;
  icon: React.ReactNode;
}[] = [
  { id: 'memory', label: 'Memory', helper: 'Rules', icon: <Brain size={16} /> },
  { id: 'artifacts', label: 'Artifacts', helper: 'Evidence', icon: <Archive size={16} /> },
  { id: 'audit', label: 'Audit', helper: 'Timeline', icon: <ScrollText size={16} /> },
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
    <nav className="session-workspace-tabs flex flex-col gap-3 w-full" aria-label="Workspace tabs">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {primaryTabs.map((tab) => (
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

        <div className="h-7 w-px bg-zinc-800/70 mx-1 shrink-0 hidden md:block" />

        {secondaryTabs.map((tab) => (
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
    <button
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        active
          ? 'bg-zinc-800/90 border-zinc-700 text-zinc-100 shadow-sm'
          : 'bg-zinc-950/30 border-zinc-800/40 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200 hover:border-zinc-700/70'
      }`}
      onClick={() => onChange(id)}
    >
      <span className={`shrink-0 ${active ? 'text-indigo-400' : 'text-zinc-500'}`}>{icon}</span>

      <span className="flex flex-col min-w-0">
        <strong className="text-sm font-semibold leading-tight">{label}</strong>
        <small
          className={`text-[10px] uppercase tracking-wider font-medium mt-0.5 leading-tight ${
            active ? 'text-indigo-400/80' : 'text-zinc-500'
          }`}
        >
          {helper}
        </small>
      </span>

      <TabBadge
        id={id}
        pendingApprovals={pendingApprovals}
        artifactCount={artifactCount}
        questionCount={questionCount}
        taskCount={taskCount}
      />
    </button>
  );
}

function TabBadge({
  id,
  pendingApprovals,
  artifactCount,
  questionCount,
  taskCount,
}: {
  id: SessionWorkspaceTab;
  pendingApprovals: number;
  artifactCount: number;
  questionCount: number;
  taskCount: number;
}) {
  if (id === 'plan' && pendingApprovals > 0) {
    return (
      <Badge tone="yellow" className="ml-1">
        {pendingApprovals}
      </Badge>
    );
  }

  if (id === 'artifacts' && artifactCount > 0) {
    return (
      <Badge tone="blue" className="ml-1">
        {artifactCount}
      </Badge>
    );
  }

  if (id === 'overview' && questionCount > 0) {
    return (
      <Badge tone="yellow" className="ml-1">
        {questionCount} Qs
      </Badge>
    );
  }

  if (id === 'verify' && taskCount > 0) {
    return (
      <Badge tone="blue" className="ml-1">
        {taskCount}
      </Badge>
    );
  }

  return null;
}
