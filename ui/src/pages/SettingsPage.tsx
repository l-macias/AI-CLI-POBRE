import { useEffect, useMemo, useState } from 'react';
import { getProviderStatus, getRuntimeSettings, saveRuntimeSettings } from '../api/runtimeApi';
import { ApprovalBehaviorPanel } from '../components/settings/ApprovalBehaviorPanel';
import { GitHubSettingsPanel } from '../components/settings/GitHubSettingsPanel';
import { ModelSettingsPanel } from '../components/settings/ModelSettingsPanel';
import { ProtectedPathsPanel } from '../components/settings/ProtectedPathsPanel';
import { ProviderSettingsPanel } from '../components/settings/ProviderSettingsPanel';
import { WorkspaceSettingsPanel } from '../components/settings/WorkspaceSettingsPanel';

import type { ProviderStatusReport, RuntimeSettingsViewModel } from '../types/runtime';

export function SettingsPage() {
  const [settings, setSettings] = useState<RuntimeSettingsViewModel | null>(null);
  const [savedSettings, setSavedSettings] = useState<RuntimeSettingsViewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusReport | null>(null);
  const dirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);

  async function loadSettings() {
    setLoading(true);

    try {
      const [loaded, status] = await Promise.all([getRuntimeSettings(), getProviderStatus()]);

      setSettings({
        ...loaded,
        provider: {
          ...loaded.provider,
          apiKeyConfigured:
            status.providers.find((provider) => provider.provider === loaded.provider.provider)
              ?.configured ?? loaded.provider.apiKeyConfigured,
        },
      });

      setSavedSettings({
        ...loaded,
        provider: {
          ...loaded.provider,
          apiKeyConfigured:
            status.providers.find((provider) => provider.provider === loaded.provider.provider)
              ?.configured ?? loaded.provider.apiKeyConfigured,
        },
      });

      setProviderStatus(status);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) {
      return;
    }

    setLoading(true);

    try {
      const saved = await saveRuntimeSettings(settings);

      setSettings(saved);
      setSavedSettings(saved);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  if (!settings) {
    return (
      <section className="settings-page">
        <article className="panel settings-hero-panel">
          <div>
            <h1>Settings</h1>
            <p className="muted">
              {loading ? 'Loading runtime settings...' : 'Settings unavailable.'}
            </p>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="settings-page">
      <article className="panel settings-hero-panel">
        <div>
          <h1>Settings</h1>
          <p className="muted">
            Configure providers, models, workspace behavior, GitHub integration, protected paths and
            approvals.
          </p>
        </div>

        <div className="settings-actions">
          <button
            className="secondary-button"
            disabled={!dirty || loading || !savedSettings}
            onClick={() => setSettings(savedSettings)}
          >
            Reset
          </button>
          <button disabled={!dirty || loading} onClick={() => void saveSettings()}>
            {loading ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </article>

      <div className="settings-grid">
        <ProviderSettingsPanel
          value={settings.provider}
          providerStatus={providerStatus}
          onChange={(provider) =>
            setSettings((current) => (current ? { ...current, provider } : current))
          }
        />

        <ModelSettingsPanel
          value={settings.model}
          activeProvider={settings.provider.provider}
          providerStatus={providerStatus}
          allowPaidModels={settings.provider.allowPaidModels}
          onChange={(model) =>
            setSettings((current) => (current ? { ...current, model } : current))
          }
        />

        <WorkspaceSettingsPanel
          value={settings.workspace}
          onChange={(workspace) =>
            setSettings((current) => (current ? { ...current, workspace } : current))
          }
        />

        <GitHubSettingsPanel
          value={settings.github}
          onChange={(github) =>
            setSettings((current) => (current ? { ...current, github } : current))
          }
        />

        <ProtectedPathsPanel
          value={settings.protectedPaths}
          onChange={(protectedPaths) =>
            setSettings((current) => (current ? { ...current, protectedPaths } : current))
          }
        />

        <ApprovalBehaviorPanel
          value={settings.approval}
          onChange={(approval) =>
            setSettings((current) => (current ? { ...current, approval } : current))
          }
        />
      </div>
    </section>
  );
}
