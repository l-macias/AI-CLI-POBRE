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
      <article className="flex flex-col gap-4 p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit size={14} className="text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400/80">
                Model selection
              </span>
              <Badge tone={allowPaidModels ? 'yellow' : 'green'}>
                {allowPaidModels ? 'paid visible' : 'free only'}
              </Badge>
            </div>

            <h3 className="text-lg font-semibold text-zinc-100">
              {selectedModel?.label ?? value.defaultModel}
            </h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed max-w-md">
              {selectedModel?.description ??
                'This model is currently selected but was not returned by the provider status list.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Badge tone={selectedModel?.free === false ? 'yellow' : 'green'}>
              {selectedModel?.free === false ? 'paid' : 'free/fallback'}
            </Badge>
            {selectedModel?.recommended ? <Badge tone="blue">recommended</Badge> : null}
            <Badge tone="slate">{activeProvider}</Badge>
          </div>
        </div>
      </article>

      <div className="flex flex-col gap-1.5 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50 mt-2">
        <div className="flex items-start gap-3">
          <Cpu size={18} className="text-zinc-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-medium text-zinc-200">Default model</strong>
            <span className="block text-xs text-zinc-500 mt-0.5">
              Used when runtime policy allows external model calls.
            </span>

            <select
              className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors appearance-none"
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
        </div>
      </div>

      {recommendedModels.length > 0 ? (
        <article className="flex flex-col gap-4 mt-2 border-t border-zinc-800/60 pt-6">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-yellow-400" />
            <span className="text-sm font-medium text-zinc-200">Recommended models</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendedModels.map((model) => {
              const isActive = model.id === value.defaultModel;
              return (
                <button
                  key={model.id}
                  className={`flex flex-col text-left p-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isActive
                      ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/40 shadow-sm'
                      : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                  onClick={() =>
                    onChange({
                      ...value,
                      defaultModel: model.id,
                    })
                  }
                >
                  <strong
                    className={`text-sm font-semibold truncate w-full ${isActive ? 'text-indigo-300' : 'text-zinc-200'}`}
                  >
                    {model.label}
                  </strong>
                  <span className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
                    {model.description}
                  </span>
                  <code className="text-[10px] text-zinc-500 font-mono mt-2 truncate w-full">
                    {model.id}
                  </code>

                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-800/40">
                    <Badge tone={model.free ? 'green' : 'yellow'}>
                      {model.free ? 'free' : 'paid'}
                    </Badge>
                    <Badge tone="blue">recommended</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </article>
      ) : null}

      {modelOptions.length > 0 ? (
        <div className="flex flex-col gap-3 mt-4 pt-6 border-t border-zinc-800/60">
          <strong className="text-sm font-medium text-zinc-200 mb-1">All available models</strong>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {modelOptions.map((model) => {
              const isActive = model.id === value.defaultModel;
              return (
                <article
                  key={model.id}
                  className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                    isActive
                      ? 'bg-indigo-500/5 border-indigo-500/30'
                      : 'bg-zinc-950/30 border-zinc-800/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <strong
                      className={`block text-sm font-medium truncate ${isActive ? 'text-indigo-300' : 'text-zinc-200'}`}
                    >
                      {model.label}
                    </strong>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{model.description}</p>
                    <code className="block text-[10px] text-zinc-500 font-mono mt-1 truncate">
                      {model.id}
                    </code>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Badge tone={model.free ? 'green' : 'yellow'}>
                      {model.free ? 'free' : 'paid'}
                    </Badge>
                    {model.recommended ? <Badge tone="blue">recommended</Badge> : null}
                    {isActive ? <Badge tone="green">selected</Badge> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <article className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 mt-4">
          <BrainCircuit size={18} className="text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <strong className="block text-sm font-medium text-yellow-200 mb-1">
              No model options available
            </strong>
            <p className="text-xs text-yellow-500/80 leading-relaxed">
              This provider did not return visible model options. Check provider configuration or
              use mock/local fallback behavior.
            </p>
          </div>
        </article>
      )}

      <div className="flex flex-col gap-1.5 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50 mt-4">
        <div className="flex items-start gap-3">
          <RotateCcw size={18} className="text-zinc-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-medium text-zinc-200">Fallback model</strong>
            <span className="block text-xs text-zinc-500 mt-0.5">
              Used when the default provider/model is unavailable or blocked.
            </span>

            <input
              className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              value={value.fallbackModel}
              onChange={(event) =>
                onChange({
                  ...value,
                  fallbackModel: event.target.value,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50 mt-2">
        <div className="flex-1">
          <strong className="block text-sm font-medium text-zinc-200">Max context tokens</strong>
          <span className="block text-xs text-zinc-500 mt-0.5">
            Budget hint before context compression.
          </span>
        </div>

        <input
          type="number"
          min={1000}
          className="w-full sm:w-32 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
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
