import { FileDown } from 'lucide-react';
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
    <section className="panel integration-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <FileDown size={18} />
          <div>
            <h2>Session Report</h2>
            <p className="muted">Export final report as Markdown and JSON.</p>
          </div>
        </div>

        <button disabled={disabled} onClick={onExport}>
          {loading ? 'Exporting...' : 'Export report'}
        </button>
      </div>

      {result ? (
        <article className="integration-card">
          <div className="integration-card-header">
            <strong>Report exported</strong>
            <Badge tone="green">saved</Badge>
          </div>

          <p>Markdown:</p>
          <code>{result.files.markdownPath}</code>

          <p>JSON:</p>
          <code>{result.files.jsonPath}</code>
        </article>
      ) : (
        <p className="muted">No report exported yet.</p>
      )}
    </section>
  );
}
