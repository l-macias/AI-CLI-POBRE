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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50">
        <div className="flex items-start gap-3">
          <Github size={20} className="text-zinc-400 mt-0.5 shrink-0" />
          <div>
            <strong className="block text-sm font-medium text-zinc-200">GitHub CLI</strong>
            <span className="block text-xs text-zinc-400 mt-0.5">
              Zero should use gh when GitHub features are needed.
            </span>
          </div>
        </div>

        <Badge tone={value.ghInstalled ? 'green' : 'yellow'} className="shrink-0">
          gh {value.ghInstalled ? 'installed' : 'not detected'}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50">
        <div>
          <strong className="block text-sm font-medium text-zinc-200">Authentication</strong>
          <span className="block text-xs text-zinc-400 mt-0.5">Detected from gh auth status.</span>
        </div>

        <Badge tone={value.ghAuthenticated ? 'green' : 'yellow'} className="shrink-0">
          {value.ghAuthenticated ? 'authenticated' : 'not authenticated'}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg border border-transparent hover:border-zinc-800/60 hover:bg-zinc-950/50 transition-colors">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
            checked={value.useGitHubCli}
            onChange={(event) =>
              onChange({
                ...value,
                useGitHubCli: event.target.checked,
              })
            }
          />
          <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors select-none">
            Enable GitHub CLI integration
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg border border-transparent hover:border-zinc-800/60 hover:bg-zinc-950/50 transition-colors">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
            checked={value.allowPullRequests}
            onChange={(event) =>
              onChange({
                ...value,
                allowPullRequests: event.target.checked,
              })
            }
          />
          <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors select-none">
            Allow Pull Request creation after approval
          </span>
        </label>
      </div>
    </SettingsSection>
  );
}
