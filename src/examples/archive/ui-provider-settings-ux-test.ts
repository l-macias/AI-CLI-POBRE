import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

interface PackageJson {
  scripts?: Record<string, unknown>;
}

interface UxCheck {
  name: string;
  status: 'passed';
  detail: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath);

    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function readText(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readText(filePath);
  const parsed = JSON.parse(raw) as unknown;

  return parsed as T;
}

function checkIncludes(input: {
  content: string;
  expected: string;
  filePath: string;
  reason: string;
}): void {
  assert(
    input.content.includes(input.expected),
    `${input.filePath} should include "${input.expected}" because ${input.reason}.`,
  );
}

function checkAllIncludes(input: {
  content: string;
  expected: string[];
  filePath: string;
  reason: string;
}): void {
  for (const expected of input.expected) {
    checkIncludes({
      content: input.content,
      expected,
      filePath: input.filePath,
      reason: input.reason,
    });
  }
}

function requireScript(scripts: Record<string, unknown>, name: string): string {
  const script = scripts[name];

  assert(typeof script === 'string' && script.length > 0, `Expected package script: ${name}`);

  return script;
}

const root = process.cwd();

const packageJsonPath = path.resolve(root, 'package.json');
const settingsPagePath = path.resolve(root, 'ui/src/pages/SettingsPage.tsx');
const providerPanelPath = path.resolve(
  root,
  'ui/src/components/settings/ProviderSettingsPanel.tsx',
);
const modelPanelPath = path.resolve(root, 'ui/src/components/settings/ModelSettingsPanel.tsx');
const runtimeApiPath = path.resolve(root, 'ui/src/api/runtimeApi.ts');
const runtimeTypesPath = path.resolve(root, 'ui/src/types/runtime.ts');
const stylesPath = path.resolve(root, 'ui/src/styles.css');

const requiredFiles = [
  packageJsonPath,
  settingsPagePath,
  providerPanelPath,
  modelPanelPath,
  runtimeApiPath,
  runtimeTypesPath,
  stylesPath,
];

for (const file of requiredFiles) {
  assert(await fileExists(file), `Expected file to exist: ${file}`);
}

const packageJson = await readJsonFile<PackageJson>(packageJsonPath);
const scripts = packageJson.scripts ?? {};

const settingsPage = await readText(settingsPagePath);
const providerPanel = await readText(providerPanelPath);
const modelPanel = await readText(modelPanelPath);
const runtimeApi = await readText(runtimeApiPath);
const runtimeTypes = await readText(runtimeTypesPath);
const styles = await readText(stylesPath);

const checks: UxCheck[] = [];

checkAllIncludes({
  content: settingsPage,
  filePath: settingsPagePath,
  expected: [
    'provider control',
    'settings-provider-summary',
    'Active provider',
    'Active model',
    'Fallback',
    'getProviderStatus',
    'saveRuntimeSettings',
    'activeProviderStatus',
    'availableModels',
    'Save settings',
  ],
  reason: 'SettingsPage should summarize provider/model/fallback status clearly',
});

checks.push({
  name: 'settings-provider-summary',
  status: 'passed',
  detail: 'Settings hero exposes provider, active model, fallback and save status.',
});

checkAllIncludes({
  content: providerPanel,
  filePath: providerPanelPath,
  expected: [
    'Active provider',
    'missing api key',
    'ProviderStatusCard',
    'Runtime authority remains active',
    'Allow paid models',
    'providerMissingMessage',
    'OPENROUTER_API_KEY',
    'Mock provider',
    'provider-status-hero',
    'provider-status-grid',
  ],
  reason:
    'ProviderSettingsPanel should show provider status, API key status and runtime authority messaging',
});

checks.push({
  name: 'provider-settings-polished',
  status: 'passed',
  detail: 'Provider settings explain active provider, missing key, models and runtime authority.',
});

checkAllIncludes({
  content: modelPanel,
  filePath: modelPanelPath,
  expected: [
    'Model selection',
    'Recommended models',
    'recommendedModels',
    'selectedModel',
    'Fallback model',
    'Max context tokens',
    'modelLabel',
    'free only',
    'paid visible',
    'No model options available',
  ],
  reason:
    'ModelSettingsPanel should support recommended models, paid/free filtering and fallback model',
});

checks.push({
  name: 'model-settings-polished',
  status: 'passed',
  detail:
    'Model panel supports recommended models, selected model, fallback and paid/free visibility.',
});

checkAllIncludes({
  content: runtimeApi,
  filePath: runtimeApiPath,
  expected: ['getRuntimeSettings', 'saveRuntimeSettings', 'getProviderStatus'],
  reason: 'Runtime API client should expose settings and provider status endpoints',
});

checkAllIncludes({
  content: runtimeTypes,
  filePath: runtimeTypesPath,
  expected: [
    'RuntimeProviderName',
    'RuntimeModelOption',
    'ProviderStatus',
    'ProviderStatusReport',
    'apiKeyPresent',
    'apiKeySource',
    'defaultModel',
    'fallbackModel',
    'allowPaidModels',
  ],
  reason: 'Runtime UI types should model providers, model options and settings',
});

checks.push({
  name: 'provider-types-and-api',
  status: 'passed',
  detail: 'Provider/model API client and UI types remain wired.',
});

checkAllIncludes({
  content: styles,
  filePath: stylesPath,
  expected: [
    '99 — Provider Settings + Model Selection Polish',
    'settings-hero-panel-polished',
    'settings-provider-summary',
    'provider-status-hero',
    'provider-status-card',
    'settings-explainer-card',
    'model-settings-hero',
    'recommended-models-card',
    'recommended-model-card',
    'model-options-list-polished',
  ],
  reason: 'styles.css should include provider/model settings polish styles',
});

checks.push({
  name: 'provider-settings-styles',
  status: 'passed',
  detail: 'Provider/model settings polish CSS is present.',
});

const uiReadinessScript = requireScript(scripts, 'ui:runtime-readiness:test');
const guidedWorkflowScript = requireScript(scripts, 'ui:guided-workflow-ux:test');
const projectOnboardingScript = requireScript(scripts, 'ui:project-onboarding-ux:test');

assert(
  uiReadinessScript.includes('src/examples/ui-runtime-readiness-smoke-test.ts'),
  'ui:runtime-readiness:test should remain wired.',
);

assert(
  guidedWorkflowScript.includes('src/examples/ui-guided-workflow-ux-polish-test.ts'),
  'ui:guided-workflow-ux:test should remain wired.',
);

assert(
  projectOnboardingScript.includes('src/examples/ui-project-onboarding-ux-test.ts'),
  'ui:project-onboarding-ux:test should remain wired.',
);

checks.push({
  name: 'existing-ui-locks-still-wired',
  status: 'passed',
  detail: 'Existing UI readiness, workflow UX and onboarding UX scripts remain available.',
});

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'ui-provider-settings-ux-test',
      checks,
      lockedUxPrinciples: [
        'Settings clearly shows active provider and API key state.',
        'OpenRouter missing-key state is visible and understandable.',
        'Model selection shows recommended/free/paid options.',
        'Fallback model is visible and editable.',
        'Paid models remain explicitly gated.',
        'Runtime authority messaging remains visible in provider settings.',
      ],
    },
    null,
    2,
  ),
);
