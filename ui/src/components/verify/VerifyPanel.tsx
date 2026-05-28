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
    <section
      id="verify-panel"
      className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <div className="flex items-start gap-3">
          <PlayCircle size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Safe Verify</h2>
            <p className="text-sm text-zinc-400 mt-1">Approved safe verification commands only.</p>
          </div>
        </div>

        <button
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          onClick={onRefresh}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {scripts ? (
        <article className="p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 mb-5">
          <strong className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Detected safe scripts
          </strong>
          <div className="flex flex-wrap gap-2">
            {scripts.safeVerifyScripts.map((script) => (
              <Badge key={script} tone="green">
                {script}
              </Badge>
            ))}
          </div>
        </article>
      ) : null}

      <div className="flex flex-col gap-3">
        {commands.map((command) => (
          <article
            className="flex flex-col gap-3 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 transition-colors"
            key={command.id}
          >
            <div className="flex justify-between items-start gap-3">
              <strong className="text-sm font-semibold text-zinc-200">{command.label}</strong>
              <Badge tone="blue" className="shrink-0">
                requires approval
              </Badge>
            </div>

            <p className="text-sm text-zinc-400">{command.description}</p>

            <button
              className="w-fit rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              onClick={() => onRun(command)}
            >
              Approve and run
            </button>
          </article>
        ))}
      </div>

      {lastRun ? (
        <article className="mt-6 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50">
          <div className="flex justify-between items-center mb-3">
            <strong className="text-sm font-semibold text-zinc-200 truncate">
              Last run: {lastRun.command}
            </strong>
            <Badge tone={lastRun.status === 'executed' && lastRun.exitCode === 0 ? 'green' : 'red'}>
              {lastRun.status}
            </Badge>
          </div>

          <p className="text-xs text-zinc-500 mb-3">Exit code: {lastRun.exitCode ?? '-'}</p>

          <pre className="p-3 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all">
            {lastRun.stdoutSummary || lastRun.stderrSummary || 'No output.'}
          </pre>
        </article>
      ) : null}
    </section>
  );
}
