import { useEffect, useMemo, useState } from 'react';
import {
  getProviderStatus,
  getRuntimeDataInventory,
  getRuntimeSettings,
  saveRuntimeSettings,
  archiveRuntimeSessions,
  restoreRuntimeSessions,
} from '../api/runtimeApi';
import { ApprovalBehaviorPanel } from '../components/settings/ApprovalBehaviorPanel';
import { GitHubSettingsPanel } from '../components/settings/GitHubSettingsPanel';
import { ModelSettingsPanel } from '../components/settings/ModelSettingsPanel';
import { ProtectedPathsPanel } from '../components/settings/ProtectedPathsPanel';
import { ProviderSettingsPanel } from '../components/settings/ProviderSettingsPanel';
import { WorkspaceSettingsPanel } from '../components/settings/WorkspaceSettingsPanel';
import { RuntimeMaintenancePanel } from '../components/settings/RuntimeMaintenancePanel';
import { Badge } from '../components/Badge';

import type {
  ProviderStatusReport,
  RuntimeSettingsViewModel,
  RuntimeDataInventoryReport,
  RuntimeArchiveSessionsResult,
  RuntimeRestoreSessionsResult,
} from '../types/runtime';

export function SettingsPage() {
  const [settings, setSettings] = useState<RuntimeSettingsViewModel | null>(null);
  const [savedSettings, setSavedSettings] = useState<RuntimeSettingsViewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusReport | null>(null);
  const [inventory, setInventory] = useState<RuntimeDataInventoryReport | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [lastArchive, setLastArchive] = useState<RuntimeArchiveSessionsResult | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [lastRestore, setLastRestore] = useState<RuntimeRestoreSessionsResult | null>(null);

  const dirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);

  const activeProviderStatus = useMemo(() => {
    if (!settings || !providerStatus) {
      return null;
    }

    return (
      providerStatus.providers.find(
        (provider) => provider.provider === settings.provider.provider,
      ) ?? null
    );
  }, [providerStatus, settings]);

  const availableModels = activeProviderStatus?.models.filter(
    (model) => settings?.provider.allowPaidModels || model.free,
  );

  async function loadSettings() {
    setLoading(true);

    try {
      const [loaded, status] = await Promise.all([getRuntimeSettings(), getProviderStatus()]);

      const activeStatus = status.providers.find(
        (provider) => provider.provider === loaded.provider.provider,
      );

      const merged = {
        ...loaded,
        provider: {
          ...loaded.provider,
          apiKeyConfigured: activeStatus?.configured ?? loaded.provider.apiKeyConfigured,
        },
      };

      setSettings(merged);
      setSavedSettings(merged);
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

      const status = await getProviderStatus();
      const activeStatus = status.providers.find(
        (provider) => provider.provider === saved.provider.provider,
      );

      const merged = {
        ...saved,
        provider: {
          ...saved.provider,
          apiKeyConfigured: activeStatus?.configured ?? saved.provider.apiKeyConfigured,
        },
      };

      setSettings(merged);
      setSavedSettings(merged);
      setProviderStatus(status);
    } finally {
      setLoading(false);
    }
  }

  async function refreshInventory() {
    setInventoryLoading(true);

    try {
      const result = await getRuntimeDataInventory();

      setInventory(result.inventory);
    } finally {
      setInventoryLoading(false);
    }
  }

  async function archiveSessions(input: { sessionIds: string[]; dryRun: boolean }) {
    setArchiveLoading(true);

    try {
      const result = await archiveRuntimeSessions(input);

      setLastArchive(result.archive);
      setInventory(result.inventory);
    } finally {
      setArchiveLoading(false);
    }
  }

  async function restoreSessions(input: { sessionIds: string[]; dryRun: boolean }) {
    setRestoreLoading(true);

    try {
      const result = await restoreRuntimeSessions(input);

      setLastRestore(result.restore);
      setInventory(result.inventory);
    } finally {
      setRestoreLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
    void refreshInventory();
  }, []);

  if (!settings) {
    return (
      <section className="settings-page">
        <article className="panel settings-hero-panel settings-hero-panel-polished">
          <div>
            <Badge tone="blue">runtime settings</Badge>
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
      <article className="panel settings-hero-panel settings-hero-panel-polished">
        <div>
          <Badge tone="blue">provider control</Badge>
          <h1>Settings</h1>
          <p className="muted">
            Configure provider, models, fallback behavior and runtime safety without touching code.
          </p>
        </div>

        <div className="settings-provider-summary">
          <div className="settings-provider-summary-card">
            <span>Active provider</span>
            <strong>{settings.provider.provider}</strong>
            <Badge tone={activeProviderStatus?.configured ? 'green' : 'yellow'}>
              {activeProviderStatus?.configured ? 'configured' : 'missing key'}
            </Badge>
          </div>

          <div className="settings-provider-summary-card">
            <span>Active model</span>
            <strong>{providerStatus?.activeModel ?? settings.model.defaultModel}</strong>
            <Badge tone="blue">{availableModels?.length ?? 0} available</Badge>
          </div>

          <div className="settings-provider-summary-card">
            <span>Fallback</span>
            <strong>{settings.model.fallbackModel || 'not set'}</strong>
            <Badge tone={settings.provider.allowPaidModels ? 'yellow' : 'green'}>
              {settings.provider.allowPaidModels ? 'paid allowed' : 'free only'}
            </Badge>
          </div>
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
            {loading ? 'Saving...' : dirty ? 'Save settings' : 'Saved'}
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

        <RuntimeMaintenancePanel
          inventory={inventory}
          lastArchive={lastArchive}
          lastRestore={lastRestore}
          loading={inventoryLoading}
          archiveLoading={archiveLoading}
          restoreLoading={restoreLoading}
          onRefresh={() => void refreshInventory()}
          onArchiveSessions={(input) => void archiveSessions(input)}
          onRestoreSessions={(input) => void restoreSessions(input)}
        />
      </div>
    </section>
  );
}
