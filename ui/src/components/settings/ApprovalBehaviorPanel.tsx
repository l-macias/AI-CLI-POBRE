import { ShieldCheck } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import type { ApprovalBehaviorSettings } from './SettingsTypes';

interface ApprovalBehaviorPanelProps {
  value: ApprovalBehaviorSettings;
  onChange: (value: ApprovalBehaviorSettings) => void;
}

export function ApprovalBehaviorPanel({ value, onChange }: ApprovalBehaviorPanelProps) {
  return (
    <SettingsSection
      title="Approval behavior"
      description="Decide where the runtime must stop and ask before moving forward."
    >
      <div className="settings-row-title settings-row-title-alone">
        <ShieldCheck size={18} />
        <div>
          <strong>Runtime authority</strong>
          <span>
            LLMs propose. Runtime validates, blocks, asks and applies only after approval.
          </span>
        </div>
      </div>

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={value.requireApprovalForPlan}
          onChange={(event) =>
            onChange({
              ...value,
              requireApprovalForPlan: event.target.checked,
            })
          }
        />
        <span>Require approval before accepting plans</span>
      </label>

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={value.requireApprovalForPatch}
          onChange={(event) =>
            onChange({
              ...value,
              requireApprovalForPatch: event.target.checked,
            })
          }
        />
        <span>Require approval before patches</span>
      </label>

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={value.requireApprovalForVerify}
          onChange={(event) =>
            onChange({
              ...value,
              requireApprovalForVerify: event.target.checked,
            })
          }
        />
        <span>Require approval before verification commands</span>
      </label>

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={value.blockHighRiskApply}
          onChange={(event) =>
            onChange({
              ...value,
              blockHighRiskApply: event.target.checked,
            })
          }
        />
        <span>Block high-risk apply actions by default</span>
      </label>
    </SettingsSection>
  );
}
