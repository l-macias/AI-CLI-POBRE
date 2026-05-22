import { BrainCircuit } from 'lucide-react';
import { Badge } from '../Badge';
import { SettingsSection } from './SettingsSection';
import type { ModelSettings } from './SettingsTypes';
import type { ProviderStatusReport, RuntimeProviderName } from '../../types/runtime';

interface ModelSettingsPanelProps {
  value: ModelSettings;
  activeProvider: RuntimeProviderName;
  providerStatus: ProviderStatusReport | null;
  allowPaidModels: boolean;
  onChange: (value: ModelSettings) => void;
}

export function ModelSettingsPanel({
  value,
  activeProvider,
  providerStatus,
  allowPaidModels,
  onChange,
}: ModelSettingsPanelProps) {
  const provider = providerStatus?.providers.find((item) => item.provider === activeProvider);
  const modelOptions = (provider?.models ?? []).filter((model) => allowPaidModels || model.free);

  return (
    <SettingsSection
      title="Models"
      description="Set model preferences without hardcoding provider-specific assumptions."
    >
      <div className="settings-row">
        <div className="settings-row-title">
          <BrainCircuit size={18} />
          <div>
            <strong>Default model</strong>
            <span>Used when runtime policy allows external LLM calls.</span>
          </div>
        </div>

        <select
          value={value.defaultModel}
          onChange={(event) =>
            onChange({
              ...value,
              defaultModel: event.target.value,
            })
          }
        >
          {modelOptions.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}

          {!modelOptions.some((model) => model.id === value.defaultModel) ? (
            <option value={value.defaultModel}>{value.defaultModel}</option>
          ) : null}
        </select>
      </div>

      {modelOptions.length > 0 ? (
        <div className="model-options-list">
          {modelOptions.map((model) => (
            <article className="model-option-card" key={model.id}>
              <div>
                <strong>{model.label}</strong>
                <p>{model.description}</p>
                <code>{model.id}</code>
              </div>

              <div className="suggestion-badges">
                <Badge tone={model.free ? 'green' : 'yellow'}>{model.free ? 'free' : 'paid'}</Badge>
                {model.recommended ? <Badge tone="blue">recommended</Badge> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">No model options available for this provider yet.</p>
      )}

      <div className="settings-row">
        <div>
          <strong>Fallback model</strong>
          <span>Optional cheaper or safer backup model.</span>
        </div>

        <input
          value={value.fallbackModel}
          onChange={(event) =>
            onChange({
              ...value,
              fallbackModel: event.target.value,
            })
          }
        />
      </div>

      <div className="settings-row">
        <div>
          <strong>Max context tokens</strong>
          <span>Budget hint before context compression.</span>
        </div>

        <input
          type="number"
          min={1000}
          value={value.maxContextTokens}
          onChange={(event) =>
            onChange({
              ...value,
              maxContextTokens: Number(event.target.value),
            })
          }
        />
      </div>
    </SettingsSection>
  );
}
