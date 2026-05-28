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
  { id: 'overview', label: 'Overview', helper: 'Start here', icon: <Activity size={16} /> },
  { id: 'plan', label: 'Plan', helper: 'Define safe steps', icon: <ClipboardList size={16} /> },
  { id: 'patch', label: 'Patch', helper: 'Review changes', icon: <GitBranch size={16} /> },
  { id: 'verify', label: 'Verify', helper: 'Check safely', icon: <ShieldCheck size={16} /> },
];

const advancedTabs: {
  id: SessionWorkspaceTab;
  label: string;
  helper: string;
  icon: React.ReactNode;
}[] = [
  { id: 'context', label: 'Context', helper: 'Data access', icon: <FileSearch size={16} /> },
  { id: 'memory', label: 'Memory', helper: 'Rules applied', icon: <Brain size={16} /> },
  { id: 'artifacts', label: 'Artifacts', helper: 'Read evidence', icon: <Archive size={16} /> },
  { id: 'audit', label: 'Audit', helper: 'Session timeline', icon: <ScrollText size={16} /> },
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
    <nav className="flex flex-col gap-2 w-full" aria-label="Workspace tabs">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
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

        {/* Separador sutil visible en pantallas que lo permitan */}
        <div className="h-6 w-px bg-zinc-800/60 mx-1 shrink-0 hidden sm:block" />

        <details className="group shrink-0 sm:hidden">
          <summary className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-sm font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer list-none select-none transition-colors">
            Advanced views
          </summary>
          {/* El contenido de 'details' se vería raro en un flex-row, así que en móvil se usaría esto o simplemente dejamos que todo escrollee. 
              Dado que es un dashboard avanzado, mostrar todos los tabs en una línea con scroll es el estándar de VS Code / Github. 
              Por lo tanto, renderizamos los advanced tabs a continuación para todos. */}
        </details>

        {advancedTabs.map((tab) => (
          <div key={tab.id} className="hidden sm:block">
            <WorkspaceTabButton
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
          </div>
        ))}
      </div>

      {/* Solo en móviles muy chicos, permitimos expandir los avanzados hacia abajo para que no queden ocultos */}
      <details className="group sm:hidden border border-zinc-800/60 bg-zinc-900/30 rounded-lg p-2 mt-1">
        <summary className="text-xs font-semibold uppercase tracking-wider text-zinc-500 cursor-pointer pl-2 select-none hover:text-zinc-300 transition-colors focus:outline-none">
          Show advanced tools
        </summary>
        <div className="flex flex-col gap-1 mt-3">
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
    <button
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        active
          ? 'bg-zinc-800/80 border-zinc-700 text-zinc-100 shadow-sm'
          : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200 hover:border-zinc-800/50'
      }`}
      onClick={() => onChange(id)}
    >
      <span className={`shrink-0 ${active ? 'text-indigo-400' : 'text-zinc-500'}`}>{icon}</span>

      <span className="flex flex-col">
        <strong className="text-sm font-semibold leading-tight">{label}</strong>
        <small
          className={`text-[10px] uppercase tracking-wider font-medium mt-0.5 leading-tight ${active ? 'text-indigo-400/80' : 'text-zinc-500'}`}
        >
          {helper}
        </small>
      </span>

      {id === 'plan' && pendingApprovals > 0 ? (
        <Badge tone="yellow" className="ml-2">
          {pendingApprovals}
        </Badge>
      ) : null}

      {id === 'artifacts' && artifactCount > 0 ? (
        <Badge tone="blue" className="ml-2">
          {artifactCount}
        </Badge>
      ) : null}

      {id === 'overview' && questionCount > 0 ? (
        <Badge tone="yellow" className="ml-2">
          {questionCount} Qs
        </Badge>
      ) : null}

      {id === 'verify' && taskCount > 0 ? (
        <Badge tone="blue" className="ml-2">
          {taskCount} tasks
        </Badge>
      ) : null}
    </button>
  );
}
