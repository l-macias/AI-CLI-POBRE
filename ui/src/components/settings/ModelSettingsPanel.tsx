import { BrainCircuit, Cpu, RotateCcw, Sparkles } from 'lucide-react';
import { Badge } from '../Badge';
import { SettingsSection } from './SettingsSection';
import type { ModelSettings } from './SettingsTypes';
import type {
  ProviderStatusReport,
  RuntimeModelOption,
  RuntimeProviderName,
} from '../../types/runtime';

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
  const rawModelOptions = provider?.models ?? [];
  const modelOptions = rawModelOptions.filter((model) => allowPaidModels || model.free);
  const recommendedModels = modelOptions.filter((model) => model.recommended);
  const selectedModel =
    modelOptions.find((model) => model.id === value.defaultModel) ??
    rawModelOptions.find((model) => model.id === value.defaultModel) ??
    null;

  return (
    <SettingsSection
      title="Models"
      description="Choose the default model, review recommended options and configure fallback behavior."
    >
      <article className="model-settings-hero">
        <div>
          <div className="settings-mini-kicker">
            <BrainCircuit size={14} />
            <span>Model selection</span>
            <Badge tone={allowPaidModels ? 'yellow' : 'green'}>
              {allowPaidModels ? 'paid visible' : 'free only'}
            </Badge>
          </div>

          <h3>{selectedModel?.label ?? value.defaultModel}</h3>
          <p>
            {selectedModel?.description ??
              'This model is currently selected but was not returned by the provider status list.'}
          </p>
        </div>

        <div className="model-settings-hero-badges">
          <Badge tone={selectedModel?.free === false ? 'yellow' : 'green'}>
            {selectedModel?.free === false ? 'paid' : 'free/fallback'}
          </Badge>
          {selectedModel?.recommended ? <Badge tone="blue">recommended</Badge> : null}
          <Badge tone="slate">{activeProvider}</Badge>
        </div>
      </article>

      <div className="settings-row settings-row-polished">
        <div className="settings-row-title">
          <Cpu size={18} />
          <div>
            <strong>Default model</strong>
            <span>Used when runtime policy allows external model calls.</span>
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
              {modelLabel(model)}
            </option>
          ))}

          {!modelOptions.some((model) => model.id === value.defaultModel) ? (
            <option value={value.defaultModel}>{value.defaultModel}</option>
          ) : null}
        </select>
      </div>

      {recommendedModels.length > 0 ? (
        <article className="recommended-models-card">
          <div className="settings-mini-kicker">
            <Sparkles size={14} />
            <span>Recommended models</span>
          </div>

          <div className="recommended-models-grid">
            {recommendedModels.map((model) => (
              <button
                className={
                  model.id === value.defaultModel
                    ? 'recommended-model-card active'
                    : 'recommended-model-card'
                }
                key={model.id}
                onClick={() =>
                  onChange({
                    ...value,
                    defaultModel: model.id,
                  })
                }
              >
                <strong>{model.label}</strong>
                <span>{model.description}</span>
                <code>{model.id}</code>

                <div className="suggestion-badges">
                  <Badge tone={model.free ? 'green' : 'yellow'}>
                    {model.free ? 'free' : 'paid'}
                  </Badge>
                  <Badge tone="blue">recommended</Badge>
                </div>
              </button>
            ))}
          </div>
        </article>
      ) : null}

      {modelOptions.length > 0 ? (
        <div className="model-options-list model-options-list-polished">
          {modelOptions.map((model) => (
            <article
              className={
                model.id === value.defaultModel ? 'model-option-card active' : 'model-option-card'
              }
              key={model.id}
            >
              <div>
                <strong>{model.label}</strong>
                <p>{model.description}</p>
                <code>{model.id}</code>
              </div>

              <div className="suggestion-badges">
                <Badge tone={model.free ? 'green' : 'yellow'}>{model.free ? 'free' : 'paid'}</Badge>
                {model.recommended ? <Badge tone="blue">recommended</Badge> : null}
                {model.id === value.defaultModel ? <Badge tone="green">selected</Badge> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="settings-explainer-card warning">
          <BrainCircuit size={18} />
          <div>
            <strong>No model options available</strong>
            <p>
              This provider did not return visible model options. Check provider configuration or
              use mock/local fallback behavior.
            </p>
          </div>
        </article>
      )}

      <div className="settings-row settings-row-polished">
        <div className="settings-row-title">
          <RotateCcw size={18} />
          <div>
            <strong>Fallback model</strong>
            <span>Used when the default provider/model is unavailable or blocked.</span>
          </div>
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

      <div className="settings-row settings-row-polished">
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

function modelLabel(model: RuntimeModelOption): string {
  const tags = [model.free ? 'free' : 'paid', model.recommended ? 'recommended' : null]
    .filter(Boolean)
    .join(', ');

  return `${model.label} (${tags})`;
}
