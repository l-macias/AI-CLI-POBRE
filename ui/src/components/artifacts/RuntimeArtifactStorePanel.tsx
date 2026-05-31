import { useMemo, useState } from 'react';
import { Archive, RefreshCcw } from 'lucide-react';
import { Badge } from '../Badge';
import { RuntimeArtifactCard } from './RuntimeArtifactCard';
import type {
  RuntimeArtifactIndex,
  RuntimeArtifactKind,
  RuntimeArtifactSummary,
} from '../../types/runtime';

interface RuntimeArtifactStorePanelProps {
  index: RuntimeArtifactIndex | null;
  selectedArtifact: RuntimeArtifactSummary | null;
  selectedContent: string;
  loading?: boolean;
  currentSessionId?: string | null;
  onRefresh: () => void;
  onSelect: (artifact: RuntimeArtifactSummary) => void;
}

const artifactKinds: RuntimeArtifactKind[] = [
  'active_plan',
  'active_patch_proposal',
  'active_patch_diff',
  'runtime_plan',
  'patch_proposal',
  'patch_diff',
  'sandbox_result',
  'patch_recovery',
  'apply_report',
  'session_state',
  'task_state',
  'verify_runs',
  'session_decisions',
  'report_markdown',
  'report_json',
  'unknown',
];

export function RuntimeArtifactStorePanel({
  index,
  selectedArtifact,
  selectedContent,
  loading = false,
  currentSessionId = null,
  onRefresh,
  onSelect,
}: RuntimeArtifactStorePanelProps) {
  const [kindFilter, setKindFilter] = useState<RuntimeArtifactKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sessionOnly, setSessionOnly] = useState(true);

  const activeArtifacts = useMemo(() => {
    return (index?.artifacts ?? []).filter((artifact) => !artifact.path.startsWith('archive/'));
  }, [index]);

  const currentSessionArtifacts = useMemo(() => {
    if (!currentSessionId) {
      return [];
    }

    return activeArtifacts.filter((artifact) => artifact.sessionId === currentSessionId);
  }, [activeArtifacts, currentSessionId]);

  const artifacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = sessionOnly && currentSessionId ? currentSessionArtifacts : activeArtifacts;

    return source.filter((artifact) => {
      if (kindFilter !== 'all' && artifact.kind !== kindFilter) {
        return false;
      }

      if (normalizedQuery.length === 0) {
        return true;
      }

      return (
        artifact.path.toLowerCase().includes(normalizedQuery) ||
        artifact.label.toLowerCase().includes(normalizedQuery) ||
        artifact.kind.toLowerCase().includes(normalizedQuery) ||
        artifact.sessionId?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [activeArtifacts, currentSessionArtifacts, currentSessionId, kindFilter, query, sessionOnly]);

  const sandboxArtifacts =
    activeArtifacts.filter((artifact) => artifact.kind === 'sandbox_result').length ?? 0;

  const reportArtifacts =
    activeArtifacts.filter(
      (artifact) => artifact.kind === 'report_markdown' || artifact.kind === 'report_json',
    ).length ?? 0;

  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <div className="flex items-start gap-3">
          <Archive size={20} className="text-indigo-400 mt-1 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Runtime Artifact Store
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Preserved runtime evidence for resumed sessions, reports, plans, diffs, sandbox
              results and recovery attempts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge tone={index ? 'green' : 'slate'}>{index ? 'indexed' : 'idle'}</Badge>
          <Badge tone="blue">{activeArtifacts.length} active</Badge>
          {currentSessionId ? (
            <Badge tone={currentSessionArtifacts.length > 0 ? 'green' : 'yellow'}>
              {currentSessionArtifacts.length} current session
            </Badge>
          ) : null}
          {sandboxArtifacts > 0 ? <Badge tone="green">{sandboxArtifacts} sandbox</Badge> : null}
          {reportArtifacts > 0 ? <Badge tone="blue">{reportArtifacts} reports</Badge> : null}

          <button
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 ml-2"
            disabled={loading}
            onClick={onRefresh}
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row items-end gap-4 mb-6">
        <label className="flex flex-col gap-1.5 w-full xl:flex-1">
          <span className="text-xs font-medium text-zinc-400">Filter</span>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            value={query}
            placeholder="session id, file name, kind..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 w-full xl:w-64">
          <span className="text-xs font-medium text-zinc-400">Kind</span>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors appearance-none"
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as RuntimeArtifactKind | 'all')}
          >
            <option value="all">all</option>
            {artifactKinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50"
            checked={sessionOnly && currentSessionId !== null}
            disabled={!currentSessionId}
            onChange={(event) => setSessionOnly(event.target.checked)}
          />
          Current session only
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-125">
        <section className="flex flex-col gap-3 overflow-y-auto pr-2 max-h-150 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {!index ? (
            <EmptyArtifactState
              title="No artifact index loaded."
              description="Refresh the artifact store to inspect preserved runtime evidence."
            />
          ) : artifacts.length === 0 ? (
            <EmptyArtifactState
              title={
                sessionOnly && currentSessionId
                  ? 'No artifacts for current session.'
                  : 'No active artifacts found.'
              }
              description={
                sessionOnly && currentSessionId
                  ? 'Disable “Current session only” or export a report to create evidence for this session.'
                  : 'Refresh the index or clear filters. Archived artifacts are hidden from this workspace.'
              }
            />
          ) : (
            artifacts.map((artifact) => (
              <RuntimeArtifactCard
                key={artifact.id}
                artifact={artifact}
                selected={selectedArtifact?.id === artifact.id}
                onSelect={onSelect}
              />
            ))
          )}
        </section>

        <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-950/80 overflow-hidden h-150">
          {!selectedArtifact ? (
            <article className="flex flex-col items-center justify-center p-8 text-center h-full">
              <strong className="text-sm font-medium text-zinc-300">No artifact selected.</strong>
              <p className="text-xs text-zinc-500 mt-2 max-w-sm leading-relaxed">
                Select an artifact to inspect raw runtime evidence. After a complete flow, you
                should usually see plan, patch proposal, diff, sandbox result and report artifacts.
              </p>
            </article>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 p-4 border-b border-zinc-800/60 bg-zinc-900/50 shrink-0">
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm font-medium text-zinc-200 truncate">
                    {selectedArtifact.label}
                  </strong>
                  <p className="text-xs text-zinc-500 font-mono mt-1 truncate">
                    {selectedArtifact.path}
                  </p>
                  {selectedArtifact.sessionId ? (
                    <p className="text-[10px] text-zinc-600 font-mono mt-1 truncate">
                      session: {selectedArtifact.sessionId}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0">
                  <Badge tone={toneForArtifactKind(selectedArtifact.kind)}>
                    {selectedArtifact.kind}
                  </Badge>
                </div>
              </div>

              <div className="p-4 overflow-auto flex-1 bg-zinc-950/50 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all">
                  {selectedContent}
                </pre>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function EmptyArtifactState({ title, description }: { title: string; description: string }) {
  return (
    <article className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 h-full min-h-75">
      <strong className="text-sm font-medium text-zinc-300">{title}</strong>
      <p className="text-xs text-zinc-500 mt-2 max-w-sm leading-relaxed">{description}</p>
    </article>
  );
}

function toneForArtifactKind(
  kind: RuntimeArtifactKind,
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (kind === 'sandbox_result') {
    return 'green';
  }

  if (kind === 'patch_recovery') {
    return 'yellow';
  }

  if (kind === 'report_markdown' || kind === 'report_json') {
    return 'blue';
  }

  if (kind === 'unknown') {
    return 'slate';
  }

  return 'blue';
}
