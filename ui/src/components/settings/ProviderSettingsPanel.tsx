import { KeyRound } from 'lucide-react';
import { Badge } from '../Badge';
import { SettingsSection } from './SettingsSection';
import type { ProviderSettings } from './SettingsTypes';
import type { ProviderStatusReport } from '../../types/runtime';

interface ProviderSettingsPanelProps {
  value: ProviderSettings;
  providerStatus: ProviderStatusReport | null;
  onChange: (value: ProviderSettings) => void;
}

export function ProviderSettingsPanel({
  value,
  providerStatus,
  onChange,
}: ProviderSettingsPanelProps) {
  const activeStatus = providerStatus?.providers.find(
    (provider) => provider.provider === value.provider,
  );

  const configured = activeStatus?.configured ?? value.apiKeyConfigured;

  return (
    <SettingsSection
      title="Providers"
      description="Configure which provider the runtime may use. API keys are never shown in the UI."
    >
      <div className="settings-row">
        <div className="settings-row-title">
          <KeyRound size={18} />
          <div>
            <strong>Default provider</strong>
            <span>Provider-agnostic runtime adapter.</span>
          </div>
        </div>

        <select
          value={value.provider}
          onChange={(event) =>
            onChange({
              ...value,
              provider: event.target.value as ProviderSettings['provider'],
              apiKeyConfigured:
                providerStatus?.providers.find(
                  (provider) => provider.provider === event.target.value,
                )?.configured ?? false,
            })
          }
        >
          <option value="openrouter">OpenRouter</option>
          <option value="local">Local</option>
          <option value="mock">Mock/Fake</option>
        </select>
      </div>

      <div className="settings-row">
        <div>
          <strong>API key</strong>
          <span>
            {activeStatus?.apiKeySource === 'env'
              ? 'Detected from backend environment.'
              : 'OPENROUTER_API_KEY not visible to backend process.'}
          </span>
        </div>

        <Badge tone={configured ? 'green' : 'yellow'}>
          {configured ? 'configured' : 'missing'}
        </Badge>
      </div>

      {activeStatus ? (
        <div className="settings-row">
          <div>
            <strong>Provider status</strong>
            <span>Generated at {new Date(activeStatus.generatedAt).toLocaleTimeString()}</span>
          </div>

          <Badge tone={activeStatus.configured ? 'green' : 'yellow'}>{activeStatus.provider}</Badge>
        </div>
      ) : null}

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={value.allowPaidModels}
          onChange={(event) =>
            onChange({
              ...value,
              allowPaidModels: event.target.checked,
            })
          }
        />
        <span>Allow paid models after explicit runtime approval</span>
      </label>
    </SettingsSection>
  );
}
