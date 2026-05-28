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
        className={configured ? 'provider-status-hero ready' : 'provider-status-hero warning'}
      >
        <div className="provider-status-icon">
          {configured ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
        </div>

        <div>
          <div className="settings-mini-kicker">
            <Router size={14} />
            <span>Active provider</span>
            <Badge tone={configured ? 'green' : 'yellow'}>
              {configured ? 'configured' : 'missing api key'}
            </Badge>
          </div>

          <h3>{value.provider}</h3>
          <p>
            {configured
              ? 'This provider is available to the runtime when model calls are explicitly allowed.'
              : providerMissingMessage(value.provider)}
          </p>
        </div>
      </article>

      <div className="settings-row settings-row-polished">
        <div className="settings-row-title">
          <KeyRound size={18} />
          <div>
            <strong>Default provider</strong>
            <span>Provider-agnostic runtime adapter.</span>
          </div>
        </div>

        <select
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

      <div className="provider-status-grid">
        {providers.map((provider) => (
          <ProviderStatusCard
            key={provider.provider}
            status={provider}
            active={provider.provider === value.provider}
          />
        ))}
      </div>

      <article className="settings-explainer-card">
        <ShieldCheck size={18} />
        <div>
          <strong>Runtime authority remains active</strong>
          <p>
            Providers can propose plans or patches, but the runtime still validates, blocks, audits
            and decides what may continue.
          </p>
        </div>
      </article>

      <label className="settings-toggle provider-paid-toggle">
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

        <span>
          <strong>Allow paid models</strong>
          <small>Only after explicit runtime approval. Keep disabled for free-model demos.</small>
        </span>
      </label>
    </SettingsSection>
  );
}

function ProviderStatusCard({ status, active }: { status: ProviderStatus; active: boolean }) {
  return (
    <article className={active ? 'provider-status-card active' : 'provider-status-card'}>
      <div>
        <strong>{status.provider}</strong>
        <span>
          {status.apiKeySource === 'env' ? 'Key loaded from backend env' : 'No key detected'}
        </span>
      </div>

      <div className="suggestion-badges">
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
