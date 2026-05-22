import { rm } from 'node:fs/promises';
import path from 'node:path';
import { RuntimeSettingsStore } from '../settings/RuntimeSettingsStore.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/runtime-settings-store-test');

await rm(testRoot, {
  recursive: true,
  force: true,
});

const store = new RuntimeSettingsStore({
  filePath: path.join(testRoot, 'runtime-settings.json'),
});

const defaults = await store.load();

assert(defaults.version === 1, 'settings version should be 1');
assert(
  defaults.workspace.defaultMode === 'local_snapshot',
  'default workspace should be local_snapshot',
);

const saved = await store.save({
  ...defaults,
  provider: {
    ...defaults.provider,
    provider: 'mock',
    allowPaidModels: true,
  },
  workspace: {
    ...defaults.workspace,
    defaultMode: 'local_patchless',
  },
});

assert(saved.provider.provider === 'mock', 'provider should update');
assert(saved.workspace.defaultMode === 'local_patchless', 'workspace mode should update');

const loaded = await store.load();

assert(loaded.provider.provider === 'mock', 'loaded provider should persist');
assert(loaded.workspace.defaultMode === 'local_patchless', 'loaded workspace should persist');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-settings-store-test',
      settingsPath: store.resolvePath(),
      provider: loaded.provider.provider,
      workspaceMode: loaded.workspace.defaultMode,
    },
    null,
    2,
  ),
);
