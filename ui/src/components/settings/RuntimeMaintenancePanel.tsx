import { Archive, Database, RefreshCcw, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../Badge';
import { SettingsSection } from './SettingsSection';
import type {
  RuntimeArchiveSessionsResult,
  RuntimeDataInventoryReport,
  RuntimeRestoreSessionsResult,
} from '../../types/runtime';

interface RuntimeMaintenancePanelProps {
  inventory: RuntimeDataInventoryReport | null;
  lastArchive: RuntimeArchiveSessionsResult | null;
  lastRestore: RuntimeRestoreSessionsResult | null;
  loading: boolean;
  archiveLoading: boolean;
  restoreLoading: boolean;
  onRefresh: () => void;
  onArchiveSessions: (input: { sessionIds: string[]; dryRun: boolean }) => void;
  onRestoreSessions: (input: { sessionIds: string[]; dryRun: boolean }) => void;
}

export function RuntimeMaintenancePanel({
  inventory,
  lastArchive,
  lastRestore,
  loading,
  archiveLoading,
  restoreLoading,
  onRefresh,
  onArchiveSessions,
  onRestoreSessions,
}: RuntimeMaintenancePanelProps) {
  const [selectedActiveSessionIds, setSelectedActiveSessionIds] = useState<string[]>([]);
  const [selectedArchivedSessionIds, setSelectedArchivedSessionIds] = useState<string[]>([]);

  const activeSessions = useMemo(() => {
    return (inventory?.sessions ?? []).filter((session) => session.status === 'active');
  }, [inventory]);

  const archivedSessions = useMemo(() => {
    return (inventory?.sessions ?? []).filter((session) => session.status === 'archived');
  }, [inventory]);

  const suspectedTestSessionIds = useMemo(() => {
    return activeSessions
      .filter((session) => session.suspectedTest)
      .map((session) => session.sessionId);
  }, [activeSessions]);

  const canArchiveSelected = selectedActiveSessionIds.length > 0 && !archiveLoading;
  const canRestoreSelected = selectedArchivedSessionIds.length > 0 && !restoreLoading;

  function toggleActiveSession(sessionId: string): void {
    setSelectedActiveSessionIds((current) =>
      current.includes(sessionId)
        ? current.filter((candidate) => candidate !== sessionId)
        : [...current, sessionId],
    );
  }

  function toggleArchivedSession(sessionId: string): void {
    setSelectedArchivedSessionIds((current) =>
      current.includes(sessionId)
        ? current.filter((candidate) => candidate !== sessionId)
        : [...current, sessionId],
    );
  }

  function selectSuspectedTests(): void {
    setSelectedActiveSessionIds(suspectedTestSessionIds);
  }

  function clearArchiveSelection(): void {
    setSelectedActiveSessionIds([]);
  }

  function clearRestoreSelection(): void {
    setSelectedArchivedSessionIds([]);
  }

  return (
    <SettingsSection
      title="Runtime data"
      description="Archive old runtime sessions without deleting them. Restore archived sessions when needed."
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-lg border border-zinc-800/40 bg-zinc-950/50 mb-2">
        <div className="flex items-start gap-3">
          <Database size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <strong className="block text-sm font-medium text-zinc-200">
              {inventory ? 'Inventory ready' : 'Inventory not loaded'}
            </strong>
            <span className="block text-xs text-zinc-400 mt-1">
              {inventory
                ? `Runtime root: ${inventory.runtimeRoot}`
                : 'Refresh to inspect sessions, artifacts, reports, sandbox results and recoveries.'}
            </span>
          </div>
        </div>

        <button
          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 shrink-0"
          disabled={loading}
          onClick={onRefresh}
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh inventory'}
        </button>
      </div>

      {inventory ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <MetricCard label="Files" value={inventory.totals.files} tone="blue" />
            <MetricCard label="Directories" value={inventory.totals.directories} tone="blue" />
            <MetricCard
              label="Active sessions"
              value={inventory.totals.sessions.active}
              tone="green"
            />
            <MetricCard
              label="Archived sessions"
              value={inventory.totals.sessions.archived}
              tone={inventory.totals.sessions.archived > 0 ? 'blue' : 'slate'}
            />
            <MetricCard
              label="Test-like sessions"
              value={inventory.totals.sessions.suspectedTest}
              tone={inventory.totals.sessions.suspectedTest > 0 ? 'yellow' : 'slate'}
            />
            <MetricCard label="Size" value={formatBytes(inventory.totals.sizeBytes)} tone="slate" />
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
            <Archive size={20} className="text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-sm font-medium text-indigo-100 mb-2">
                Recommendations
              </strong>
              <p className="text-xs text-indigo-200/70 mb-3">
                Archive keeps evidence but removes noise from the active workspace.
              </p>

              <ul className="list-disc list-inside text-xs text-indigo-200/90 space-y-1">
                {inventory.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start mt-2 border-t border-zinc-800/60 pt-8">
            <div className="flex flex-col gap-4 p-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
              <div>
                <strong className="block text-base font-semibold text-zinc-100">
                  Archive active sessions
                </strong>
                <p className="text-sm text-zinc-400 mt-1">
                  Selected: {selectedActiveSessionIds.length}. Suspected test sessions:{' '}
                  {suspectedTestSessionIds.length}.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  disabled={suspectedTestSessionIds.length === 0 || archiveLoading}
                  onClick={selectSuspectedTests}
                >
                  Select test-like
                </button>

                <button
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  disabled={selectedActiveSessionIds.length === 0}
                  onClick={clearArchiveSelection}
                >
                  Clear
                </button>

                <button
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  disabled={!canArchiveSelected}
                  onClick={() =>
                    onArchiveSessions({ sessionIds: selectedActiveSessionIds, dryRun: true })
                  }
                >
                  Dry-run archive
                </button>

                <button
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ml-auto"
                  disabled={!canArchiveSelected}
                  onClick={() =>
                    onArchiveSessions({ sessionIds: selectedActiveSessionIds, dryRun: false })
                  }
                >
                  Archive selected
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
              <div className="flex items-start gap-3">
                <RotateCcw size={20} className="text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-base font-semibold text-zinc-100">
                    Restore archived sessions
                  </strong>
                  <p className="text-sm text-zinc-400 mt-1">
                    Bring archived sessions back into the active workspace without changing their
                    evidence.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  disabled={selectedArchivedSessionIds.length === 0}
                  onClick={clearRestoreSelection}
                >
                  Clear
                </button>

                <button
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  disabled={!canRestoreSelected}
                  onClick={() =>
                    onRestoreSessions({ sessionIds: selectedArchivedSessionIds, dryRun: true })
                  }
                >
                  Dry-run restore
                </button>

                <button
                  className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 ml-auto"
                  disabled={!canRestoreSelected}
                  onClick={() =>
                    onRestoreSessions({ sessionIds: selectedArchivedSessionIds, dryRun: false })
                  }
                >
                  Restore selected
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {lastArchive ? (
              <ArchiveResultCard
                title="Last archive result"
                mode={lastArchive.dryRun ? 'dry-run' : 'archived'}
                count={lastArchive.results.length}
                moved={lastArchive.results.reduce(
                  (total, result) => total + result.moved.length,
                  0,
                )}
              />
            ) : null}

            {lastRestore ? (
              <ArchiveResultCard
                title="Last restore result"
                mode={lastRestore.dryRun ? 'dry-run' : 'restored'}
                count={lastRestore.results.length}
                moved={lastRestore.results.reduce(
                  (total, result) => total + result.moved.length,
                  0,
                )}
              />
            ) : null}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-4">
            <section className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
                Active sessions
              </h3>

              <SessionList
                emptyTitle="No active sessions found."
                emptyDescription="Archived sessions are preserved outside the active workspace."
                sessions={activeSessions}
                selectedSessionIds={selectedActiveSessionIds}
                onToggle={toggleActiveSession}
              />
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60 pb-2">
                Archived sessions
              </h3>

              <SessionList
                emptyTitle="No archived sessions found."
                emptyDescription="Archive old/test sessions to keep the main UI clean."
                sessions={archivedSessions}
                selectedSessionIds={selectedArchivedSessionIds}
                onToggle={toggleArchivedSession}
              />
            </section>
          </div>

          <div className="flex flex-col gap-4 mt-6 pt-8 border-t border-zinc-800/60">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Directory Inventory
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {inventory.directories.map((directory) => (
                <article
                  className="flex flex-col p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50"
                  key={directory.name}
                >
                  <div className="mb-3">
                    <strong className="block text-sm font-semibold text-zinc-200">
                      {directory.name}
                    </strong>
                    <span
                      className="block text-xs text-zinc-500 font-mono mt-0.5 truncate"
                      title={directory.path}
                    >
                      {directory.exists ? directory.path : 'missing'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-auto">
                    <Badge tone={directory.exists ? 'green' : 'slate'}>
                      {directory.exists ? 'exists' : 'missing'}
                    </Badge>
                    <Badge tone="blue">{directory.fileCount} files</Badge>
                    <Badge tone="slate">{formatBytes(directory.sizeBytes)}</Badge>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <article className="flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 mt-4">
          <strong className="block text-sm font-medium text-zinc-300">No inventory loaded.</strong>
          <p className="text-xs text-zinc-500 mt-1">
            Refresh inventory to inspect local runtime data safely.
          </p>
        </article>
      )}
    </SettingsSection>
  );
}

function SessionList({
  emptyTitle,
  emptyDescription,
  sessions,
  selectedSessionIds,
  onToggle,
}: {
  emptyTitle: string;
  emptyDescription: string;
  sessions: RuntimeDataInventoryReport['sessions'];
  selectedSessionIds: string[];
  onToggle: (sessionId: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <article className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50">
        <strong className="block text-sm font-medium text-zinc-300">{emptyTitle}</strong>
        <p className="text-xs text-zinc-500 mt-1">{emptyDescription}</p>
      </article>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
      {sessions.slice(0, 40).map((session) => (
        <label
          className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800/40 bg-zinc-950/50 hover:bg-zinc-800/40 hover:border-zinc-700 transition-colors cursor-pointer group"
          key={session.sessionId}
        >
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
            checked={selectedSessionIds.includes(session.sessionId)}
            onChange={() => onToggle(session.sessionId)}
          />

          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-mono text-zinc-300 truncate group-hover:text-zinc-100 transition-colors">
              {session.sessionId}
            </strong>
            <span className="block text-xs text-zinc-500 mt-0.5">
              {session.artifactCount} artifacts · {formatBytes(session.sizeBytes)}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge tone={session.suspectedTest ? 'yellow' : 'green'}>
              {session.suspectedTest ? 'test-like' : 'normal'}
            </Badge>
            <Badge tone={session.status === 'archived' ? 'blue' : 'green'}>{session.status}</Badge>
          </div>
        </label>
      ))}
    </div>
  );
}

function ArchiveResultCard({
  title,
  mode,
  count,
  moved,
}: {
  title: string;
  mode: string;
  count: number;
  moved: number;
}) {
  return (
    <article className="flex items-center justify-between gap-4 p-4 rounded-lg border border-zinc-800/60 bg-zinc-900/50">
      <div className="flex items-center gap-3">
        <strong className="text-sm font-semibold text-zinc-200">{title}</strong>
        <Badge tone={mode === 'dry-run' ? 'yellow' : 'green'}>{mode}</Badge>
      </div>

      <p className="text-sm text-zinc-400">
        {count} session(s), {moved} path(s) affected.
      </p>
    </article>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'blue' | 'green' | 'yellow' | 'red' | 'slate';
}) {
  return (
    <article className="flex flex-col p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </span>
      <div className="flex items-end justify-between mt-auto">
        <strong className="text-xl font-bold text-zinc-200">{value}</strong>
        <Badge tone={tone}>runtime</Badge>
      </div>
    </article>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
