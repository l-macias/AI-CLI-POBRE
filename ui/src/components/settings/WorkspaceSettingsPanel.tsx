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
      <div className="settings-row">
        <div className="settings-row-title">
          <FolderLock size={18} />
          <div>
            <strong>Default mode</strong>
            <span>Git is optional. local_snapshot is recommended.</span>
          </div>
        </div>

        <select
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

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={value.requireSnapshotBeforeApply}
          onChange={(event) =>
            onChange({
              ...value,
              requireSnapshotBeforeApply: event.target.checked,
            })
          }
        />
        <span>Require local snapshot before applying changes</span>
      </label>

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={value.gitRequired}
          onChange={(event) =>
            onChange({
              ...value,
              gitRequired: event.target.checked,
            })
          }
        />
        <span>Require Git for selected projects</span>
      </label>
    </SettingsSection>
  );
}
