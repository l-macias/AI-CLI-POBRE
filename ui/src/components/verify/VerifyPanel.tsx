import { PlayCircle } from 'lucide-react';
import type {
  PackageScriptScanResult,
  VerifyCommandDefinition,
  VerifyRunResult,
} from '../../types/runtime';
import { Badge } from '../Badge';

interface VerifyPanelProps {
  commands: VerifyCommandDefinition[];
  scripts: PackageScriptScanResult | null;
  lastRun: VerifyRunResult | null;
  loading: boolean;
  onRefresh: () => void;
  onRun: (command: VerifyCommandDefinition) => void;
}

export function VerifyPanel({
  commands,
  scripts,
  lastRun,
  loading,
  onRefresh,
  onRun,
}: VerifyPanelProps) {
  return (
    <section className="panel integration-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <PlayCircle size={18} />
          <div>
            <h2>Safe Verify</h2>
            <p className="muted">Approved safe verification commands only.</p>
          </div>
        </div>

        <button className="secondary-button" onClick={onRefresh}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {scripts ? (
        <div className="integration-card">
          <strong>Detected safe scripts</strong>
          <div className="stack-row">
            {scripts.safeVerifyScripts.map((script) => (
              <Badge key={script} tone="green">
                {script}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="integration-list">
        {commands.map((command) => (
          <article className="integration-card" key={command.id}>
            <div className="integration-card-header">
              <strong>{command.label}</strong>
              <Badge tone="blue">requires approval</Badge>
            </div>

            <p>{command.description}</p>

            <button onClick={() => onRun(command)}>Approve and run</button>
          </article>
        ))}
      </div>

      {lastRun ? (
        <article className="integration-card">
          <div className="integration-card-header">
            <strong>Last run: {lastRun.command}</strong>
            <Badge tone={lastRun.status === 'executed' && lastRun.exitCode === 0 ? 'green' : 'red'}>
              {lastRun.status}
            </Badge>
          </div>

          <p>Exit code: {lastRun.exitCode ?? '-'}</p>

          <pre className="verify-output">
            {lastRun.stdoutSummary || lastRun.stderrSummary || 'No output.'}
          </pre>
        </article>
      ) : null}
    </section>
  );
}
