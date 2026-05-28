import { CheckCircle2, FileCheck2, RotateCcw, XCircle } from 'lucide-react';
import { Badge } from '../Badge';
import type { ApprovalDecisionViewInput, ApprovalRequest } from './ApprovalTypes';
import { ApprovalChecklist } from './ApprovalChecklist';

interface PatchApprovalCardProps {
  request: ApprovalRequest;
  selectedFilePaths: string[];
  onToggleFile: (filePath: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

export function PatchApprovalCard({
  request,
  selectedFilePaths,
  onToggleFile,
  onSelectAll,
  onClearSelection,
  onDecision,
}: PatchApprovalCardProps) {
  const approveAction = request.actions.find((action) => action.kind === 'approve');
  const approveSelectedAction = request.actions.find(
    (action) => action.kind === 'approve_selected_files',
  );
  const rejectAction = request.actions.find((action) => action.kind === 'reject');
  const askRevisionAction = request.actions.find((action) => action.kind === 'ask_revision');

  const selectedCount = selectedFilePaths.length;
  const selectableCount = request.fileReviews.filter((file) => file.userSelectable).length;

  return (
    <article className="flex flex-col rounded-xl border border-indigo-500/20 bg-zinc-900/40 p-6 shadow-sm relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/50" />

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-zinc-100">{request.title}</h3>
          <p className="text-sm text-zinc-400 mt-1">{request.description}</p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Badge tone={toneForRisk(request.riskLevel)}>{request.riskLevel} risk</Badge>
          <Badge tone="indigo">{request.kind}</Badge>
          <Badge tone={request.status === 'pending' ? 'yellow' : 'green'}>{request.status}</Badge>
          <Badge tone={selectedCount > 0 ? 'green' : 'yellow'}>
            {selectedCount}/{selectableCount} selected
          </Badge>
        </div>
      </div>

      <ApprovalChecklist items={request.checklist} />

      <section className="flex flex-col gap-4 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800/60 pb-3">
          <div>
            <strong className="block text-sm font-medium text-zinc-200">File-level review</strong>
            <p className="text-xs text-zinc-400 mt-1">
              Approve all files or only selected files. High-risk files start unselected.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
              type="button"
              onClick={onSelectAll}
            >
              Select all
            </button>
            <button
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
              type="button"
              onClick={onClearSelection}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {request.fileReviews.map((file) => {
            const checked = selectedFilePaths.includes(file.path);

            return (
              <label
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer group ${
                  checked
                    ? 'border-indigo-500/30 bg-indigo-500/5'
                    : 'border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700'
                } ${!file.userSelectable && 'opacity-70 cursor-not-allowed'}`}
                key={file.path}
              >
                <input
                  type="checkbox"
                  className="mt-1 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer disabled:cursor-not-allowed"
                  checked={checked}
                  disabled={!file.userSelectable}
                  onChange={() => onToggleFile(file.path)}
                />

                <div className="flex flex-col flex-1 gap-3 w-full overflow-hidden">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <strong className="text-sm font-mono text-zinc-200 truncate">
                      {file.path}
                    </strong>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Badge tone={toneForOperation(file.operation)}>{file.operation}</Badge>
                      <Badge tone={toneForRisk(file.riskLevel)}>risk: {file.riskLevel}</Badge>
                      <Badge tone={file.userSelectable ? 'green' : 'red'}>
                        {file.userSelectable ? 'selectable' : 'locked'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1 border-t border-zinc-800/40 pt-3">
                    <div>
                      <strong className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                        Summary
                      </strong>
                      <ul className="list-disc list-inside text-xs text-zinc-300 space-y-1.5">
                        {file.changesSummary.map((item) => (
                          <li key={item} className="leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <strong className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                        Reason
                      </strong>
                      <p className="text-xs text-zinc-300 leading-relaxed">{file.reason}</p>
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 mt-8 pt-5 border-t border-zinc-800/60">
        <button
          disabled={!approveAction?.enabled}
          title={approveAction?.blockedReason}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={() =>
            onDecision({
              requestId: request.id,
              action: 'approve',
              selectedFilePaths: request.filePaths,
            })
          }
        >
          <CheckCircle2 size={16} />
          Approve all
        </button>

        <button
          disabled={!approveSelectedAction?.enabled || selectedFilePaths.length === 0}
          title={
            selectedFilePaths.length === 0
              ? 'Select at least one file.'
              : approveSelectedAction?.blockedReason
          }
          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={() =>
            onDecision({
              requestId: request.id,
              action: 'approve_selected_files',
              selectedFilePaths,
            })
          }
        >
          <FileCheck2 size={16} />
          Approve selected
        </button>

        <button
          disabled={!askRevisionAction?.enabled}
          title={askRevisionAction?.blockedReason}
          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={() =>
            onDecision({
              requestId: request.id,
              action: 'ask_revision',
              selectedFilePaths: [],
            })
          }
        >
          <RotateCcw size={16} />
          Ask revision
        </button>

        <button
          disabled={!rejectAction?.enabled}
          title={rejectAction?.blockedReason}
          className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={() =>
            onDecision({
              requestId: request.id,
              action: 'reject',
              selectedFilePaths: [],
            })
          }
        >
          <XCircle size={16} />
          Reject
        </button>
      </div>
    </article>
  );
}

function toneForOperation(operation: ApprovalRequest['fileReviews'][number]['operation']) {
  if (operation === 'delete') {
    return 'red';
  }
  if (operation === 'create') {
    return 'yellow';
  }
  return 'blue';
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
