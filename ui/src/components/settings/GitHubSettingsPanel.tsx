import { Github } from 'lucide-react';
import { Badge } from '../Badge';
import { SettingsSection } from './SettingsSection';
import type { GitHubSettings } from './SettingsTypes';

interface GitHubSettingsPanelProps {
  value: GitHubSettings;
  onChange: (value: GitHubSettings) => void;
}

export function GitHubSettingsPanel({ value, onChange }: GitHubSettingsPanelProps) {
  return (
    <SettingsSection
      title="GitHub"
      description="Use GitHub CLI integration without storing GitHub tokens inside Zero Runtime."
    >
      <div className="settings-row">
        <div className="settings-row-title">
          <Github size={18} />
          <div>
            <strong>GitHub CLI</strong>
            <span>Zero should use gh when GitHub features are needed.</span>
          </div>
        </div>

        <Badge tone={value.ghInstalled ? 'green' : 'yellow'}>
          gh {value.ghInstalled ? 'installed' : 'not detected'}
        </Badge>
      </div>

      <div className="settings-row">
        <div>
          <strong>Authentication</strong>
          <span>Detected from gh auth status.</span>
        </div>

        <Badge tone={value.ghAuthenticated ? 'green' : 'yellow'}>
          {value.ghAuthenticated ? 'authenticated' : 'not authenticated'}
        </Badge>
      </div>

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={value.useGitHubCli}
          onChange={(event) =>
            onChange({
              ...value,
              useGitHubCli: event.target.checked,
            })
          }
        />
        <span>Enable GitHub CLI integration</span>
      </label>

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={value.allowPullRequests}
          onChange={(event) =>
            onChange({
              ...value,
              allowPullRequests: event.target.checked,
            })
          }
        />
        <span>Allow Pull Request creation after approval</span>
      </label>
    </SettingsSection>
  );
}
