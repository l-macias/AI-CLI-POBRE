import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '../Badge';
import type { ApprovalDecisionViewInput, ApprovalRequest } from './ApprovalTypes';
import { ApprovalChecklist } from './ApprovalChecklist';

interface ApprovalRequestCardProps {
  request: ApprovalRequest;
  selectedFilePaths: string[];
  onToggleFile: (filePath: string) => void;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

export function ApprovalRequestCard({
  request,
  selectedFilePaths,
  onToggleFile,
  onDecision,
}: ApprovalRequestCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm relative overflow-hidden">
      {/* Indicador visual del estado del request */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${request.status === 'pending' ? 'bg-yellow-500/50' : 'bg-emerald-500/50'}`}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-zinc-100">{request.title}</h3>
          <p className="text-sm text-zinc-400 mt-1">{request.description}</p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Badge tone={toneForRisk(request.riskLevel)}>{request.riskLevel} risk</Badge>
          <Badge tone="blue">{request.kind}</Badge>
          <Badge tone={request.status === 'pending' ? 'yellow' : 'green'}>{request.status}</Badge>
        </div>
      </div>

      <ApprovalChecklist items={request.checklist} />

      {request.filePaths.length > 0 ? (
        <section className="flex flex-col gap-3 mt-6 p-4 rounded-lg bg-zinc-950/80 border border-zinc-800/60">
          <strong className="text-sm font-medium text-zinc-300 block mb-1">Files</strong>

          <div className="flex flex-col gap-2">
            {request.filePaths.map((filePath) => (
              <label
                className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                key={filePath}
              >
                <input
                  type="checkbox"
                  className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                  checked={selectedFilePaths.includes(filePath)}
                  onChange={() => onToggleFile(filePath)}
                />
                <span className="text-sm text-zinc-300 font-mono group-hover:text-zinc-100 transition-colors">
                  {filePath}
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-zinc-800/60">
        {request.actions.map((action) => (
          <button
            key={action.kind}
            disabled={!action.enabled}
            title={action.blockedReason}
            onClick={() =>
              onDecision({
                requestId: request.id,
                action: action.kind,
                selectedFilePaths:
                  action.kind === 'approve_selected_files' ? selectedFilePaths : request.filePaths,
              })
            }
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              action.kind === 'reject'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            {iconForAction(action.kind)}
            {action.label}
          </button>
        ))}
      </div>
    </article>
  );
}

function toneForRisk(riskLevel: ApprovalRequest['riskLevel']) {
  if (riskLevel === 'high') {
    return 'red';
  }
  if (riskLevel === 'medium') {
    return 'yellow';
  }
  return 'green';
}

function iconForAction(action: ApprovalRequest['actions'][number]['kind']) {
  if (action === 'approve' || action === 'approve_selected_files') {
    return <CheckCircle2 size={16} />;
  }
  if (action === 'reject') {
    return <XCircle size={16} />;
  }
  return <AlertTriangle size={16} />;
}
