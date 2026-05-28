import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

interface PackageJson {
  name?: unknown;
  private?: unknown;
  type?: unknown;
  scripts?: Record<string, unknown>;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
}

interface ReadinessCheck {
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

async function directoryExists(directoryPath: string): Promise<boolean> {
  try {
    const directoryStat = await stat(directoryPath);

    return directoryStat.isDirectory();
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

function getScript(packageJson: PackageJson, scriptName: string): string {
  const value = packageJson.scripts?.[scriptName];

  assert(typeof value === 'string' && value.length > 0, `ui/package.json missing ${scriptName}.`);

  return value;
}

const root = process.cwd();
const uiRoot = path.resolve(root, 'ui');

const packageJsonPath = path.join(uiRoot, 'package.json');
const viteConfigPath = path.join(uiRoot, 'vite.config.ts');
const appPath = path.join(uiRoot, 'src', 'App.tsx');
const mainPath = path.join(uiRoot, 'src', 'main.tsx');
const runtimeApiPath = path.join(uiRoot, 'src', 'api', 'runtimeApi.ts');
const projectsPagePath = path.join(uiRoot, 'src', 'pages', 'ProjectsPage.tsx');
const sessionPagePath = path.join(uiRoot, 'src', 'pages', 'SessionPage.tsx');
const settingsPagePath = path.join(uiRoot, 'src', 'pages', 'SettingsPage.tsx');
const appLayoutPath = path.join(uiRoot, 'src', 'layouts', 'AppLayout.tsx');
const dashboardPath = path.join(uiRoot, 'src', 'components', 'dashboard', 'ProjectDashboard.tsx');
const stylesPath = path.join(uiRoot, 'src', 'styles.css');

const checks: ReadinessCheck[] = [];

assert(await directoryExists(uiRoot), 'ui directory should exist.');

checks.push({
  name: 'ui-directory',
  status: 'passed',
  detail: uiRoot,
});

for (const requiredFile of [
  packageJsonPath,
  viteConfigPath,
  appPath,
  mainPath,
  runtimeApiPath,
  projectsPagePath,
  sessionPagePath,
  settingsPagePath,
  appLayoutPath,
  dashboardPath,
  stylesPath,
]) {
  assert(await fileExists(requiredFile), `Required UI file is missing: ${requiredFile}`);

  checks.push({
    name: `file:${path.relative(root, requiredFile).replaceAll('\\', '/')}`,
    status: 'passed',
    detail: 'exists',
  });
}

const packageJson = await readJsonFile<PackageJson>(packageJsonPath);

assert(packageJson.name === 'zero-runtime-ui', 'UI package name should be zero-runtime-ui.');
assert(packageJson.private === true, 'UI package should remain private.');
assert(packageJson.type === 'module', 'UI package should use ESM.');

const devScript = getScript(packageJson, 'dev');
const buildScript = getScript(packageJson, 'build');
const previewScript = getScript(packageJson, 'preview');

assert(devScript.includes('vite'), 'UI dev script should use Vite.');
assert(buildScript.includes('tsc --noEmit'), 'UI build should run TypeScript check first.');
assert(buildScript.includes('vite build'), 'UI build should run vite build.');
assert(previewScript.includes('vite preview'), 'UI preview should use Vite preview.');

for (const dependency of ['@vitejs/plugin-react', 'vite', 'typescript', 'react', 'react-dom']) {
  assert(
    typeof packageJson.dependencies?.[dependency] === 'string',
    `UI dependency missing: ${dependency}`,
  );
}

checks.push({
  name: 'ui-package-json',
  status: 'passed',
  detail: 'scripts and core dependencies are ready',
});

const viteConfig = await readText(viteConfigPath);

checkAllIncludes({
  content: viteConfig,
  filePath: viteConfigPath,
  expected: [
    "import react from '@vitejs/plugin-react'",
    'defineConfig',
    'plugins: [react()]',
    "host: '127.0.0.1'",
    'port: 5173',
    "'/api'",
    "target: 'http://127.0.0.1:17871'",
    'changeOrigin: true',
  ],
  reason: 'the local UI must proxy API calls to RuntimeApiServer',
});

checks.push({
  name: 'vite-config',
  status: 'passed',
  detail: 'React plugin and /api proxy configured',
});

const main = await readText(mainPath);

checkAllIncludes({
  content: main,
  filePath: mainPath,
  expected: [
    "import { StrictMode } from 'react'",
    "import { createRoot } from 'react-dom/client'",
    "import { App } from './App'",
    "import './styles.css'",
    "document.querySelector('#root')",
    'Root element not found.',
    '<StrictMode>',
    '<App />',
  ],
  reason: 'React entrypoint must mount App safely',
});

checks.push({
  name: 'react-entrypoint',
  status: 'passed',
  detail: 'main.tsx mounts App through #root',
});

const app = await readText(appPath);

checkAllIncludes({
  content: app,
  filePath: appPath,
  expected: [
    "useState<AppPage>('dashboard')",
    'getHealth',
    'getCurrentProject',
    'listSessions',
    'subscribeRuntimeEvents',
    '<AppLayout',
    '<ProjectDashboard',
    '<ProjectsPage',
    '<SessionPage',
    '<SettingsPage',
    '<EventTimeline',
  ],
  reason: 'App must expose dashboard/projects/session/settings and runtime events',
});

checks.push({
  name: 'app-shell',
  status: 'passed',
  detail: 'dashboard/projects/session/settings shell is wired',
});

const runtimeApi = await readText(runtimeApiPath);

checkAllIncludes({
  content: runtimeApi,
  filePath: runtimeApiPath,
  expected: [
    "fetch('/api/health')",
    "fetch('/api/projects')",
    "fetch('/api/projects/current')",
    "fetch('/api/projects/scan'",
    "fetch('/api/sessions'",
    'new EventSource',
    "'/api/events'",
    "fetch('/api/settings')",
    "fetch('/api/providers/status')",
    "fetch('/api/artifacts')",
    "fetch('/api/maintenance/inventory')",
    "fetch('/api/workflow/prepare'",
    "fetch('/api/workflow/state'",
    "fetch('/api/plans/generate'",
    "fetch('/api/patches/propose'",
    "fetch('/api/patches/diff'",
    "fetch('/api/patches/sandbox/verify'",
    "fetch('/api/patches/apply'",
    "fetch('/api/reports/export'",
  ],
  reason: 'runtime API client must cover the MVP product flow',
});

checks.push({
  name: 'runtime-api-client',
  status: 'passed',
  detail: 'MVP API client endpoints are present',
});

const projectsPage = await readText(projectsPagePath);

checkAllIncludes({
  content: projectsPage,
  filePath: projectsPagePath,
  expected: [
    'Open a local project',
    'Choose the project folder',
    'Scan and use',
    'Project summary',
    'Registered projects',
    'Start guided session',
    'listFilesystemRoots',
    'listFilesystemChildren',
    'scanProject',
    'local_snapshot',
    'Scan and use project',
    'Use this folder',
  ],
  reason: 'Projects page must support guided browse/select/scan onboarding',
});

checks.push({
  name: 'projects-page',
  status: 'passed',
  detail: 'browse/select/scan onboarding is present',
});

const sessionPage = await readText(sessionPagePath);

checkAllIncludes({
  content: sessionPage,
  filePath: sessionPagePath,
  expected: [
    'sessionGoalTemplates',
    'Safe small improvement',
    'Read-only analysis',
    'prepareRuntimeWorkflow',
    'generateRuntimePlan',
    'generatePatchProposal',
    'generatePatchDiff',
    'verifyPatchSandbox',
    'preparePatchRecovery',
    'applyRuntimePatch',
    'rollbackRuntimePatch',
    'exportSessionReport',
    'GuidedWorkflowPanel',
    'RuntimeArtifactStorePanel',
    'SessionResumePanel',
    'moveToWorkspaceTab',
  ],
  reason: 'Session page must expose the guided MVP runtime workflow',
});

checks.push({
  name: 'session-page',
  status: 'passed',
  detail: 'guided workflow symbols are present',
});

const settingsPage = await readText(settingsPagePath);

checkAllIncludes({
  content: settingsPage,
  filePath: settingsPagePath,
  expected: ['getRuntimeSettings', 'saveRuntimeSettings', 'getProviderStatus'],
  reason: 'Settings page must expose settings/provider connectivity',
});

checks.push({
  name: 'settings-page',
  status: 'passed',
  detail: 'settings and provider status connectivity are present',
});

const layout = await readText(appLayoutPath);

checkAllIncludes({
  content: layout,
  filePath: appLayoutPath,
  expected: ['dashboard', 'projects', 'session', 'settings'],
  reason: 'layout navigation must expose the main MVP pages',
});

checks.push({
  name: 'navigation-layout',
  status: 'passed',
  detail: 'main pages are available in layout',
});

await access(packageJsonPath);
await access(viteConfigPath);
await access(appPath);
await access(mainPath);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'ui-runtime-readiness-smoke-test',
      uiRoot,
      checks,
      summary: {
        filesChecked: checks.filter((check) => check.name.startsWith('file:')).length,
        apiClientReady: true,
        viteProxyReady: true,
        appShellReady: true,
        browserAutomation: 'not_required_for_98A',
      },
    },
    null,
    2,
  ),
);
