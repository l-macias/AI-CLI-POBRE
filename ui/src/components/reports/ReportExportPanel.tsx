import { CheckCircle2, FileDown } from 'lucide-react';
import type { ReportExportResult } from '../../types/runtime';
import { Badge } from '../Badge';

interface ReportExportPanelProps {
  result: ReportExportResult | null;
  loading: boolean;
  disabled: boolean;
  onExport: () => void;
}

export function ReportExportPanel({ result, loading, disabled, onExport }: ReportExportPanelProps) {
  return (
    <section
      id="report-export-panel"
      className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <div className="flex items-start gap-3">
          <FileDown size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Session report</h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Export the final audit trail for the session: workflow, approvals, sandbox, recovery,
              apply result and runtime decisions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge tone={result ? 'green' : 'slate'}>{result ? 'exported' : 'not exported'}</Badge>

          <button
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={disabled || loading}
            onClick={onExport}
          >
            {loading ? 'Exporting...' : result ? 'Export again' : 'Export report'}
          </button>
        </div>
      </div>

      {disabled ? (
        <article className="flex flex-col items-center justify-center gap-2 p-8 text-center rounded-xl border border-dashed border-yellow-500/30 bg-yellow-500/5">
          <strong className="text-sm font-medium text-yellow-200">No active session.</strong>
          <p className="text-xs text-yellow-500/80">
            Start or resume a session before exporting a report.
          </p>
        </article>
      ) : result ? (
        <article className="flex flex-col gap-5 p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-base font-medium text-emerald-100">
                Demo evidence exported
              </strong>
              <p className="text-sm text-emerald-200/70 mt-1 leading-relaxed">
                The MVP flow now has persistent Markdown and JSON evidence. Keep these files with
                the runtime artifacts for review, debugging or handoff.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pt-5 border-t border-emerald-500/20">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500/70">
                Markdown report
              </span>
              <code className="text-sm font-mono text-emerald-200/90 break-all bg-emerald-500/10 px-3 py-2.5 rounded-md border border-emerald-500/20">
                {result.files.markdownPath}
              </code>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500/70">
                JSON report
              </span>
              <code className="text-sm font-mono text-emerald-200/90 break-all bg-emerald-500/10 px-3 py-2.5 rounded-md border border-emerald-500/20">
                {result.files.jsonPath}
              </code>
            </div>
          </div>
        </article>
      ) : (
        <article className="flex flex-col items-center justify-center gap-2 p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
          <strong className="text-sm font-medium text-zinc-300">No report exported yet.</strong>
          <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
            Export after you have useful evidence. Recommended MVP order: prepare project → create
            plan → create patch → preview diff → run sandbox → dry-run/apply → export report.
          </p>
        </article>
      )}
    </section>
  );
}
