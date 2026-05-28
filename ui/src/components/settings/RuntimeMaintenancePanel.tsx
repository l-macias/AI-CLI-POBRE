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
      <div className="maintenance-header-card">
        <div className="settings-row-title-alone">
          <Database size={18} />
          <div>
            <strong>{inventory ? 'Inventory ready' : 'Inventory not loaded'}</strong>
            <span>
              {inventory
                ? `Runtime root: ${inventory.runtimeRoot}`
                : 'Refresh to inspect sessions, artifacts, reports, sandbox results and recoveries.'}
            </span>
          </div>
        </div>

        <button className="secondary-button" disabled={loading} onClick={onRefresh}>
          <RefreshCcw size={16} />
          {loading ? 'Refreshing...' : 'Refresh inventory'}
        </button>
      </div>

      {inventory ? (
        <>
          <div className="maintenance-metric-grid">
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

          <div className="maintenance-recommendations">
            <div className="settings-row-title-alone">
              <Archive size={18} />
              <div>
                <strong>Recommendations</strong>
                <span>Archive keeps evidence but removes noise from the active workspace.</span>
              </div>
            </div>

            <ul>
              {inventory.recommendations.map((recommendation) => (
                <li key={recommendation}>{recommendation}</li>
              ))}
            </ul>
          </div>

          <div className="maintenance-actions-card">
            <div>
              <strong>Archive active sessions</strong>
              <p>
                Selected: {selectedActiveSessionIds.length}. Suspected test sessions:{' '}
                {suspectedTestSessionIds.length}.
              </p>
            </div>

            <div className="maintenance-actions">
              <button
                className="secondary-button"
                disabled={suspectedTestSessionIds.length === 0 || archiveLoading}
                onClick={selectSuspectedTests}
              >
                Select test-like
              </button>

              <button
                className="secondary-button"
                disabled={selectedActiveSessionIds.length === 0}
                onClick={clearArchiveSelection}
              >
                Clear
              </button>

              <button
                className="secondary-button"
                disabled={!canArchiveSelected}
                onClick={() =>
                  onArchiveSessions({ sessionIds: selectedActiveSessionIds, dryRun: true })
                }
              >
                Dry-run archive
              </button>

              <button
                className="danger-button"
                disabled={!canArchiveSelected}
                onClick={() =>
                  onArchiveSessions({ sessionIds: selectedActiveSessionIds, dryRun: false })
                }
              >
                Archive selected
              </button>
            </div>
          </div>

          <div className="maintenance-actions-card">
            <div className="settings-row-title-alone">
              <RotateCcw size={18} />
              <div>
                <strong>Restore archived sessions</strong>
                <span>
                  Bring archived sessions back into the active workspace without changing their
                  evidence.
                </span>
              </div>
            </div>

            <div className="maintenance-actions">
              <button
                className="secondary-button"
                disabled={selectedArchivedSessionIds.length === 0}
                onClick={clearRestoreSelection}
              >
                Clear
              </button>

              <button
                className="secondary-button"
                disabled={!canRestoreSelected}
                onClick={() =>
                  onRestoreSessions({ sessionIds: selectedArchivedSessionIds, dryRun: true })
                }
              >
                Dry-run restore
              </button>

              <button
                disabled={!canRestoreSelected}
                onClick={() =>
                  onRestoreSessions({ sessionIds: selectedArchivedSessionIds, dryRun: false })
                }
              >
                Restore selected
              </button>
            </div>
          </div>

          {lastArchive ? (
            <ArchiveResultCard
              title="Last archive result"
              mode={lastArchive.dryRun ? 'dry-run' : 'archived'}
              count={lastArchive.results.length}
              moved={lastArchive.results.reduce((total, result) => total + result.moved.length, 0)}
            />
          ) : null}

          {lastRestore ? (
            <ArchiveResultCard
              title="Last restore result"
              mode={lastRestore.dryRun ? 'dry-run' : 'restored'}
              count={lastRestore.results.length}
              moved={lastRestore.results.reduce((total, result) => total + result.moved.length, 0)}
            />
          ) : null}

          <div className="maintenance-session-columns">
            <section className="maintenance-session-column">
              <h3>Active sessions</h3>

              <SessionList
                emptyTitle="No active sessions found."
                emptyDescription="Archived sessions are preserved outside the active workspace."
                sessions={activeSessions}
                selectedSessionIds={selectedActiveSessionIds}
                onToggle={toggleActiveSession}
              />
            </section>

            <section className="maintenance-session-column">
              <h3>Archived sessions</h3>

              <SessionList
                emptyTitle="No archived sessions found."
                emptyDescription="Archive old/test sessions to keep the main UI clean."
                sessions={archivedSessions}
                selectedSessionIds={selectedArchivedSessionIds}
                onToggle={toggleArchivedSession}
              />
            </section>
          </div>

          <div className="maintenance-directory-list">
            {inventory.directories.map((directory) => (
              <article className="maintenance-directory-card" key={directory.name}>
                <div>
                  <strong>{directory.name}</strong>
                  <span>{directory.exists ? directory.path : 'missing'}</span>
                </div>

                <div className="maintenance-directory-badges">
                  <Badge tone={directory.exists ? 'green' : 'slate'}>
                    {directory.exists ? 'exists' : 'missing'}
                  </Badge>
                  <Badge tone="blue">{directory.fileCount} files</Badge>
                  <Badge tone="slate">{formatBytes(directory.sizeBytes)}</Badge>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <article className="maintenance-empty-state">
          <strong>No inventory loaded.</strong>
          <p>Refresh inventory to inspect local runtime data safely.</p>
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
      <article className="maintenance-empty-state">
        <strong>{emptyTitle}</strong>
        <p>{emptyDescription}</p>
      </article>
    );
  }

  return (
    <div className="maintenance-session-list">
      {sessions.slice(0, 40).map((session) => (
        <label className="maintenance-session-row" key={session.sessionId}>
          <input
            type="checkbox"
            checked={selectedSessionIds.includes(session.sessionId)}
            onChange={() => onToggle(session.sessionId)}
          />

          <div>
            <strong>{session.sessionId}</strong>
            <span>
              {session.artifactCount} artifacts · {formatBytes(session.sizeBytes)}
            </span>
          </div>

          <div className="maintenance-directory-badges">
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
    <article className="maintenance-archive-result">
      <div className="integration-card-header">
        <strong>{title}</strong>
        <Badge tone={mode === 'dry-run' ? 'yellow' : 'green'}>{mode}</Badge>
      </div>

      <p>
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
    <article className="maintenance-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <Badge tone={tone}>runtime</Badge>
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
