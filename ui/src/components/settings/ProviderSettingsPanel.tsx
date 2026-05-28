import { AlertTriangle, CheckCircle2, KeyRound, Router, ShieldCheck } from 'lucide-react';
import { Badge } from '../Badge';
import { SettingsSection } from './SettingsSection';
import type { ProviderSettings } from './SettingsTypes';
import type { ProviderStatus, ProviderStatusReport } from '../../types/runtime';

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
  const providers = providerStatus?.providers ?? [];

  return (
    <SettingsSection
      title="Provider"
      description="Choose which provider Zero may use when runtime policy allows model calls."
    >
      <article
        className={`flex items-start gap-4 p-5 rounded-xl border transition-colors shadow-sm ${
          configured
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : 'border-yellow-500/20 bg-yellow-500/5'
        }`}
      >
        <div className={`mt-1 shrink-0 ${configured ? 'text-emerald-400' : 'text-yellow-400'}`}>
          {configured ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Router size={14} className={configured ? 'text-emerald-500' : 'text-yellow-500'} />
            <span
              className={`text-xs font-bold uppercase tracking-wider ${configured ? 'text-emerald-500/80' : 'text-yellow-500/80'}`}
            >
              Active provider
            </span>
            <Badge tone={configured ? 'green' : 'yellow'}>
              {configured ? 'configured' : 'missing api key'}
            </Badge>
          </div>

          <h3 className="text-xl font-semibold text-zinc-100">{value.provider}</h3>
          <p
            className={`text-sm mt-1.5 leading-relaxed ${configured ? 'text-emerald-200/70' : 'text-yellow-200/80'}`}
          >
            {configured
              ? 'This provider is available to the runtime when model calls are explicitly allowed.'
              : providerMissingMessage(value.provider)}
          </p>
        </div>
      </article>

      <div className="flex flex-col gap-1.5 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50 mt-2">
        <div className="flex items-start gap-3">
          <KeyRound size={18} className="text-zinc-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-medium text-zinc-200">Default provider</strong>
            <span className="block text-xs text-zinc-500 mt-0.5">
              Provider-agnostic runtime adapter.
            </span>

            <select
              className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors appearance-none"
              value={value.provider}
              onChange={(event) => {
                const nextProvider = event.target.value as ProviderSettings['provider'];
                const nextStatus = providerStatus?.providers.find(
                  (provider) => provider.provider === nextProvider,
                );

                onChange({
                  ...value,
                  provider: nextProvider,
                  apiKeyConfigured: nextStatus?.configured ?? false,
                });
              }}
            >
              <option value="openrouter">OpenRouter</option>
              <option value="local">Local</option>
              <option value="mock">Mock/Fake</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-6 border-t border-zinc-800/60">
        {providers.map((provider) => (
          <ProviderStatusCard
            key={provider.provider}
            status={provider}
            active={provider.provider === value.provider}
          />
        ))}
      </div>

      <article className="flex items-start gap-3 p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 mt-4">
        <ShieldCheck size={18} className="text-indigo-400 mt-0.5 shrink-0" />
        <div>
          <strong className="block text-sm font-medium text-indigo-100 mb-1">
            Runtime authority remains active
          </strong>
          <p className="text-xs text-indigo-200/70 leading-relaxed">
            Providers can propose plans or patches, but the runtime still validates, blocks, audits
            and decides what may continue.
          </p>
        </div>
      </article>

      <label className="flex items-start sm:items-center gap-3 cursor-pointer group p-4 rounded-lg border border-transparent hover:border-zinc-800/60 hover:bg-zinc-950/50 transition-colors mt-2">
        <input
          type="checkbox"
          className="mt-1 sm:mt-0 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
          checked={value.allowPaidModels}
          onChange={(event) =>
            onChange({
              ...value,
              allowPaidModels: event.target.checked,
            })
          }
        />
        <span className="flex flex-col select-none">
          <strong className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
            Allow paid models
          </strong>
          <small className="text-xs text-zinc-500 mt-0.5">
            Only after explicit runtime approval. Keep disabled for free-model demos.
          </small>
        </span>
      </label>
    </SettingsSection>
  );
}

function ProviderStatusCard({ status, active }: { status: ProviderStatus; active: boolean }) {
  return (
    <article
      className={`flex flex-col p-4 rounded-lg border transition-all ${
        active
          ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/40 shadow-sm'
          : 'bg-zinc-950/50 border-zinc-800'
      }`}
    >
      <div className="flex-1 mb-4">
        <strong
          className={`block text-sm font-semibold ${active ? 'text-indigo-300' : 'text-zinc-200'}`}
        >
          {status.provider}
        </strong>
        <span className="block text-xs text-zinc-500 mt-1 leading-relaxed">
          {status.apiKeySource === 'env' ? 'Key loaded from backend env' : 'No key detected'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-auto pt-3 border-t border-zinc-800/40">
        {active ? <Badge tone="blue">active</Badge> : null}
        <Badge tone={status.configured ? 'green' : 'yellow'}>
          {status.configured ? 'configured' : 'missing'}
        </Badge>
        <Badge tone="slate">{status.models.length} models</Badge>
      </div>
    </article>
  );
}

function providerMissingMessage(provider: ProviderSettings['provider']): string {
  if (provider === 'openrouter') {
    return 'OPENROUTER_API_KEY is not visible to the backend process. Free/mock flows can still work, but provider-backed generation will fall back or fail clearly.';
  }

  if (provider === 'local') {
    return 'Local provider is selected, but no local provider is configured yet.';
  }

  return 'Mock provider can be used for deterministic tests and safe demos without paid calls.';
}
