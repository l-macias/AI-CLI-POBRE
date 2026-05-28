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
      <section className="flex flex-col gap-6 md:gap-8 w-full max-w-[1600px] mx-auto pb-12">
        <article className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 lg:p-8 shadow-sm backdrop-blur-md">
          <div className="flex flex-col items-start gap-2">
            <Badge tone="blue">runtime settings</Badge>
            <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Settings</h1>
            <p className="text-base text-zinc-400 mt-1">
              {loading ? 'Loading runtime settings...' : 'Settings unavailable.'}
            </p>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 md:gap-8 w-full max-w-[1600px] mx-auto pb-12">
      <article className="flex flex-col gap-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 lg:p-8 shadow-sm backdrop-blur-md">
        <div className="flex flex-col items-start gap-2">
          <Badge tone="blue">provider control</Badge>
          <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Settings</h1>
          <p className="text-base text-zinc-400 mt-1">
            Configure provider, models, fallback behavior and runtime safety without touching code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div className="flex flex-col gap-2 p-5 rounded-lg border border-zinc-800/40 bg-zinc-950/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Active provider
            </span>
            <strong className="text-base text-zinc-200">{settings.provider.provider}</strong>
            <div className="mt-1">
              <Badge tone={activeProviderStatus?.configured ? 'green' : 'yellow'}>
                {activeProviderStatus?.configured ? 'configured' : 'missing key'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-5 rounded-lg border border-zinc-800/40 bg-zinc-950/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Active model
            </span>
            <strong
              className="text-base text-zinc-200 truncate"
              title={providerStatus?.activeModel ?? settings.model.defaultModel}
            >
              {providerStatus?.activeModel ?? settings.model.defaultModel}
            </strong>
            <div className="mt-1">
              <Badge tone="blue">{availableModels?.length ?? 0} available</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-5 rounded-lg border border-zinc-800/40 bg-zinc-950/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Fallback
            </span>
            <strong
              className="text-base text-zinc-200 truncate"
              title={settings.model.fallbackModel || 'not set'}
            >
              {settings.model.fallbackModel || 'not set'}
            </strong>
            <div className="mt-1">
              <Badge tone={settings.provider.allowPaidModels ? 'yellow' : 'green'}>
                {settings.provider.allowPaidModels ? 'paid allowed' : 'free only'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 mt-2 pt-6 border-t border-zinc-800/60">
          <button
            className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
            disabled={!dirty || loading || !savedSettings}
            onClick={() => setSettings(savedSettings)}
          >
            Reset
          </button>

          <button
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!dirty || loading}
            onClick={() => void saveSettings()}
          >
            {loading ? 'Saving...' : dirty ? 'Save settings' : 'Saved'}
          </button>
        </div>
      </article>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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

        <div className="lg:col-span-2">
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
      </div>
    </section>
  );
}
