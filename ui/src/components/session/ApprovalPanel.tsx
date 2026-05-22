import type { InteractiveSessionState } from '../../types/runtime';
import { ApprovalPanel as ApprovalGatePanel } from '../approval/ApprovalPanel';

interface ApprovalPanelProps {
  session: InteractiveSessionState | null;
  snapshotAvailable?: boolean;
  onApproveIntent: () => void;
  onRejectIntent: () => void;
  onCommand?: (command: string) => void;
}

export function ApprovalPanel({
  session,
  snapshotAvailable = false,
  onApproveIntent,
  onRejectIntent,
  onCommand,
}: ApprovalPanelProps) {
  return (
    <section className="panel session-approval-panel">
      <ApprovalGatePanel
        session={session}
        snapshotAvailable={snapshotAvailable}
        onCommand={(command) => {
          if (command === '/apply') {
            onApproveIntent();
            return;
          }

          if (command === '/reject') {
            onRejectIntent();
            return;
          }

          onCommand?.(command);
        }}
      />
    </section>
  );
}
