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
      <div className="flex items-start gap-3 p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 mb-2">
        <ShieldCheck size={20} className="text-indigo-400 mt-0.5 shrink-0" />
        <div>
          <strong className="block text-sm font-medium text-indigo-100">Runtime authority</strong>
          <span className="block text-xs text-indigo-200/70 mt-1 leading-relaxed">
            LLMs propose. Runtime validates, blocks, asks and applies only after approval.
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg border border-transparent hover:border-zinc-800/60 hover:bg-zinc-950/50 transition-colors">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
            checked={value.requireApprovalForPlan}
            onChange={(event) =>
              onChange({
                ...value,
                requireApprovalForPlan: event.target.checked,
              })
            }
          />
          <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors select-none">
            Require approval before accepting plans
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg border border-transparent hover:border-zinc-800/60 hover:bg-zinc-950/50 transition-colors">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
            checked={value.requireApprovalForPatch}
            onChange={(event) =>
              onChange({
                ...value,
                requireApprovalForPatch: event.target.checked,
              })
            }
          />
          <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors select-none">
            Require approval before patches
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg border border-transparent hover:border-zinc-800/60 hover:bg-zinc-950/50 transition-colors">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
            checked={value.requireApprovalForVerify}
            onChange={(event) =>
              onChange({
                ...value,
                requireApprovalForVerify: event.target.checked,
              })
            }
          />
          <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors select-none">
            Require approval before verification commands
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg border border-transparent hover:border-zinc-800/60 hover:bg-zinc-950/50 transition-colors">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
            checked={value.blockHighRiskApply}
            onChange={(event) =>
              onChange({
                ...value,
                blockHighRiskApply: event.target.checked,
              })
            }
          />
          <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors select-none">
            Block high-risk apply actions by default
          </span>
        </label>
      </div>
    </SettingsSection>
  );
}
