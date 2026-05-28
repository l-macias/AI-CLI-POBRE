import { Network, WandSparkles } from 'lucide-react';
import type {
  ApiRouteMapResult,
  FrontendBackendLinkResult,
  ProjectStackIntelligence,
} from '../../types/runtime';
import { Badge } from '../Badge';

interface ProjectIntelligencePanelProps {
  stack: ProjectStackIntelligence | null;
  routes: ApiRouteMapResult | null;
  links: FrontendBackendLinkResult | null;
  loading: boolean;
  workflowLoading?: boolean;
  onAnalyze: () => void;
  onPrepareWorkflow?: () => void;
}

export function ProjectIntelligencePanel({
  stack,
  routes,
  links,
  loading,
  workflowLoading = false,
  onAnalyze,
  onPrepareWorkflow,
}: ProjectIntelligencePanelProps) {
  return (
    <section
      id="project-intelligence-panel"
      className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <div className="flex items-start gap-3">
          <Network size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Project Intelligence
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              Stack, backend routes and frontend/backend links.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onPrepareWorkflow ? (
            <button
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={workflowLoading}
              onClick={onPrepareWorkflow}
            >
              <WandSparkles size={16} className={workflowLoading ? 'animate-pulse' : ''} />
              {workflowLoading ? 'Preparing...' : 'Prepare Workflow'}
            </button>
          ) : null}

          <button
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
            disabled={loading}
            onClick={onAnalyze}
          >
            {loading ? 'Analyzing...' : 'Analyze only'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {stack ? (
          <article className="flex flex-col gap-3 p-5 rounded-lg border border-zinc-800/60 bg-zinc-950/50">
            <strong className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Detected stack
            </strong>
            <div className="flex flex-wrap gap-2">
              {stack.stack.map((item) => (
                <Badge key={item} tone={item === 'pern' || item === 'mern' ? 'green' : 'blue'}>
                  {item}
                </Badge>
              ))}
            </div>
          </article>
        ) : null}

        {routes ? (
          <article className="flex flex-col gap-3 p-5 rounded-lg border border-zinc-800/60 bg-zinc-950/50">
            <strong className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              API routes
            </strong>
            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {routes.routes.map((route) => (
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-2.5 rounded-md hover:bg-zinc-800/40 transition-colors border border-transparent hover:border-zinc-700/50"
                  key={route.id}
                >
                  <Badge tone="yellow" className="w-fit">
                    {route.method}
                  </Badge>
                  <code className="text-sm font-mono text-zinc-200 flex-1 break-all">
                    {route.path}
                  </code>
                  <span className="text-xs text-zinc-500 shrink-0 font-mono bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                    {route.controller?.name ?? 'no controller'}
                  </span>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {links ? (
          <article className="flex flex-col gap-3 p-5 rounded-lg border border-zinc-800/60 bg-zinc-950/50">
            <strong className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Frontend/backend links
            </strong>
            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {links.links.map((link) => (
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-2.5 rounded-md hover:bg-zinc-800/40 transition-colors border border-transparent hover:border-zinc-700/50"
                  key={link.id}
                >
                  <Badge
                    tone={
                      link.matchType === 'exact'
                        ? 'green'
                        : link.matchType === 'method_mismatch'
                          ? 'yellow'
                          : 'red'
                    }
                    className="w-fit"
                  >
                    {link.matchType}
                  </Badge>
                  <code className="text-sm font-mono text-zinc-200 flex-1 break-all">
                    {link.usage.method} {link.usage.endpoint}
                  </code>
                  <span
                    className="text-xs text-zinc-500 shrink-0 truncate max-w-[200px]"
                    title={link.usage.sourceFile}
                  >
                    {link.usage.sourceFile}
                  </span>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
