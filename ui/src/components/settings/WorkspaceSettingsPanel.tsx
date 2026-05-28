import { FolderLock } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import type { WorkspaceSettings, WorkspaceMode } from './SettingsTypes';

interface WorkspaceSettingsPanelProps {
  value: WorkspaceSettings;
  onChange: (value: WorkspaceSettings) => void;
}

export function WorkspaceSettingsPanel({ value, onChange }: WorkspaceSettingsPanelProps) {
  return (
    <SettingsSection
      title="Workspace mode"
      description="Control how Zero Runtime reads, writes and protects local projects."
    >
      <div className="flex flex-col gap-1.5 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50 mb-2">
        <div className="flex items-start gap-3">
          <FolderLock size={18} className="text-zinc-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-medium text-zinc-200">Default mode</strong>
            <span className="block text-xs text-zinc-500 mt-0.5">
              Git is optional. local_snapshot is recommended.
            </span>

            <select
              className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors appearance-none"
              value={value.defaultMode}
              onChange={(event) =>
                onChange({
                  ...value,
                  defaultMode: event.target.value as WorkspaceMode,
                })
              }
            >
              <option value="local_snapshot">local_snapshot</option>
              <option value="local_patchless">local_patchless</option>
              <option value="git_diff">git_diff</option>
              <option value="git_branch_pr">git_branch_pr</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg border border-transparent hover:border-zinc-800/60 hover:bg-zinc-950/50 transition-colors">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
            checked={value.requireSnapshotBeforeApply}
            onChange={(event) =>
              onChange({
                ...value,
                requireSnapshotBeforeApply: event.target.checked,
              })
            }
          />
          <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors select-none">
            Require local snapshot before applying changes
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg border border-transparent hover:border-zinc-800/60 hover:bg-zinc-950/50 transition-colors">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
            checked={value.gitRequired}
            onChange={(event) =>
              onChange({
                ...value,
                gitRequired: event.target.checked,
              })
            }
          />
          <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors select-none">
            Require Git for selected projects
          </span>
        </label>
      </div>
    </SettingsSection>
  );
}
