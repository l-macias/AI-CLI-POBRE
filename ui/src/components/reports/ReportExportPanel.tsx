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
    <section id="report-export-panel" className="panel integration-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <FileDown size={18} />
          <div>
            <h2>Session report</h2>
            <p className="muted">
              Export the final audit trail for the session: workflow, approvals, sandbox, recovery,
              apply result and runtime decisions.
            </p>
          </div>
        </div>

        <div className="artifact-toolbar-actions">
          <Badge tone={result ? 'green' : 'slate'}>{result ? 'exported' : 'not exported'}</Badge>

          <button disabled={disabled || loading} onClick={onExport}>
            {loading ? 'Exporting...' : result ? 'Export again' : 'Export report'}
          </button>
        </div>
      </div>

      {disabled ? (
        <article className="report-empty-state warning">
          <strong>No active session.</strong>
          <p>Start or resume a session before exporting a report.</p>
        </article>
      ) : result ? (
        <article className="report-success-card">
          <div className="panel-title-row">
            <CheckCircle2 size={20} />
            <div>
              <strong>Demo evidence exported</strong>
              <p>
                The MVP flow now has persistent Markdown and JSON evidence. Keep these files with
                the runtime artifacts for review, debugging or handoff.
              </p>
            </div>
          </div>

          <div className="report-path-grid">
            <div>
              <span>Markdown report</span>
              <code>{result.files.markdownPath}</code>
            </div>

            <div>
              <span>JSON report</span>
              <code>{result.files.jsonPath}</code>
            </div>
          </div>
        </article>
      ) : (
        <article className="report-empty-state">
          <strong>No report exported yet.</strong>
          <p>
            Export after you have useful evidence. Recommended MVP order: prepare project → create
            plan → create patch → preview diff → run sandbox → dry-run/apply → export report.
          </p>
        </article>
      )}
    </section>
  );
}
