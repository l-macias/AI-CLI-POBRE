import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';
import { ApprovalActions } from './ApprovalActions';
import { ApprovalChecklist } from './ApprovalChecklist';
import { ApprovalRiskSummary } from './ApprovalRiskSummary';
import type { ApprovalRiskLevel, ApprovalViewModel } from './ApprovalTypes';

interface ApprovalPanelProps {
  session: InteractiveSessionState | null;
  snapshotAvailable?: boolean;
  onCommand: (command: string) => void;
}

export function ApprovalPanel({
  session,
  snapshotAvailable = false,
  onCommand,
}: ApprovalPanelProps) {
  const approval = buildApprovalViewModel(session, snapshotAvailable);
  const applyDisabled = !approval.snapshotAvailable || approval.riskLevel === 'high';

  return (
    <section className="approval-viewer">
      <div className="panel-header">
        <div>
          <h2>Approval Gate</h2>
          <p className="muted">Approve, reject, revise or save the current proposal safely.</p>
        </div>

        <Badge tone={session ? 'yellow' : 'slate'}>{session ? 'requires approval' : 'idle'}</Badge>
      </div>

      <ApprovalRiskSummary approval={approval} />
      <ApprovalChecklist items={approval.checklist} />

      {applyDisabled ? (
        <div className="approval-blocker-note">
          <strong>Apply is blocked.</strong>
          <p>
            Runtime requires snapshot availability and acceptable risk before enabling apply
            actions.
          </p>
        </div>
      ) : null}

      <ApprovalActions
        disabled={!session}
        applyDisabled={applyDisabled}
        onApproveAndApply={() => onCommand('/apply')}
        onApplySingleFile={() => onCommand('Aplicar solo el archivo seleccionado')}
        onReject={() => onCommand('/reject')}
        onRequestRevision={() => onCommand('/revise Revisar propuesta antes de aplicar')}
        onSaveProposal={() => onCommand('Guardar propuesta sin aplicar')}
      />
    </section>
  );
}

function buildApprovalViewModel(
  session: InteractiveSessionState | null,
  snapshotOverride: boolean,
): ApprovalViewModel {
  if (!session) {
    return {
      id: 'approval-empty',
      title: 'No active approval',
      riskLevel: 'low',
      workspaceMode: 'unknown',
      gitActive: false,
      snapshotAvailable: false,
      pendingActions: 0,
      checklist: [
        {
          id: 'session-required',
          label: 'Session required',
          description: 'Start an interactive session before approvals are available.',
          status: 'blocked',
        },
      ],
    };
  }

  const pendingActions = session.runtimeActions.filter((action) => action.status === 'pending');
  const text = session.runtimeActions
    .map((action) => `${action.title} ${action.description}`)
    .join(' ')
    .toLowerCase();

  const snapshotAvailable = snapshotOverride || text.includes('snapshot');
  const gitActive =
    text.includes('git active') || text.includes('git_diff') || text.includes('git_branch_pr');
  const workspaceMode = inferWorkspaceMode(text);
  const riskLevel = inferApprovalRisk(text, pendingActions.length);

  return {
    id: `approval-${session.id}`,
    title: 'Runtime approval required',
    riskLevel,
    workspaceMode,
    gitActive,
    snapshotAvailable,
    pendingActions: pendingActions.length,
    checklist: [
      {
        id: 'runtime-authority',
        label: 'Runtime authority',
        description: 'LLM can propose, but runtime controls validation, approval and application.',
        status: 'passed',
      },
      {
        id: 'pending-actions',
        label: 'Pending runtime actions',
        description:
          pendingActions.length > 0
            ? `${pendingActions.length} action(s) are waiting for user decision.`
            : 'No pending runtime action currently requires approval.',
        status: pendingActions.length > 0 ? 'warning' : 'passed',
      },
      {
        id: 'snapshot-check',
        label: 'Snapshot availability',
        description: snapshotAvailable
          ? 'A local snapshot is available for rollback.'
          : 'No snapshot event/action has been detected yet.',
        status: snapshotAvailable ? 'passed' : 'warning',
      },
      {
        id: 'risk-check',
        label: 'Risk review',
        description:
          riskLevel === 'high'
            ? 'High risk detected. Apply actions should remain blocked until reviewed.'
            : 'Risk level is acceptable for controlled approval flow.',
        status: riskLevel === 'high' ? 'blocked' : 'passed',
      },
    ],
  };
}

function inferWorkspaceMode(text: string): string {
  if (text.includes('git_branch_pr')) {
    return 'git_branch_pr';
  }

  if (text.includes('git_diff')) {
    return 'git_diff';
  }

  if (text.includes('local_patchless')) {
    return 'local_patchless';
  }

  return 'local_snapshot';
}

function inferApprovalRisk(text: string, pendingActions: number): ApprovalRiskLevel {
  if (
    text.includes('delete') ||
    text.includes('database') ||
    text.includes('auth') ||
    text.includes('secret') ||
    text.includes('.env')
  ) {
    return 'high';
  }

  if (text.includes('apply') || text.includes('patch') || pendingActions > 0) {
    return 'medium';
  }

  return 'low';
}
