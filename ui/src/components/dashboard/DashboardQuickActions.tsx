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
    <article className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 shadow-sm h-full">
      <div className="flex items-center gap-2 text-zinc-100 mb-2">
        <Sparkles size={18} className="text-indigo-400" />
        <strong className="font-medium text-base">Start here</strong>
      </div>

      <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
        Follow this order for the MVP demo: select a project, open a session, then let the runtime
        guide the plan → patch → sandbox → report flow.
      </p>

      <div className="flex flex-col gap-3 flex-1">
        <button
          className="flex items-center gap-3 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onClick={onOpenProjects}
        >
          <FolderKanban size={16} />
          {hasProject ? '1. Change project' : '1. Select project'}
        </button>

        <button
          className="flex items-center gap-3 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!hasProject}
          onClick={onOpenSession}
        >
          <TerminalSquare size={16} />
          {hasSession ? '2. Resume session' : '2. Start session'}
        </button>

        <button
          className="flex items-center gap-3 w-full rounded-lg bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
          onClick={onOpenSettings}
        >
          <Settings size={16} />
          3. Check settings
        </button>
      </div>

      {!hasProject ? (
        <article className="mt-5 flex items-start gap-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
          <Play size={16} className="text-yellow-500 mt-0.5 shrink-0" />
          <span className="text-xs text-yellow-600/90 leading-relaxed">
            Select a local project first. Zero needs a project root before it can start.
          </span>
        </article>
      ) : null}
    </article>
  );
}
