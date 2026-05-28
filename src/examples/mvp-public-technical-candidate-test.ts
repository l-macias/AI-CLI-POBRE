import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface PackageJson {
  name?: unknown;
  version?: unknown;
  description?: unknown;
  type?: unknown;
  private?: unknown;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface CandidateSection {
  name: string;
  status: 'passed';
  checks: string[];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readPackageJson(): PackageJson {
  const raw = readFileSync(path.resolve('package.json'), 'utf8');

  return JSON.parse(raw) as PackageJson;
}

function requireFile(relativePath: string): void {
  assert(existsSync(path.resolve(relativePath)), `Expected file to exist: ${relativePath}`);
}

function requireScript(scripts: Record<string, string>, name: string): string {
  const script = scripts[name];

  assert(typeof script === 'string' && script.length > 0, `Expected package script: ${name}`);

  return script;
}

function requireScriptIncludes(input: {
  scripts: Record<string, string>;
  name: string;
  expected: string;
}): void {
  const script = requireScript(input.scripts, input.name);

  assert(
    script.includes(input.expected),
    `Expected script "${input.name}" to include "${input.expected}". Current: ${script}`,
  );
}

function requireScriptExcludes(input: {
  scripts: Record<string, string>;
  name: string;
  forbidden: string;
}): void {
  const script = requireScript(input.scripts, input.name);

  assert(
    !script.includes(input.forbidden),
    `Expected script "${input.name}" to exclude "${input.forbidden}". Current: ${script}`,
  );
}

function requireDependency(packageJson: PackageJson, name: string): void {
  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};

  assert(
    typeof dependencies[name] === 'string' || typeof devDependencies[name] === 'string',
    `Expected dependency or devDependency: ${name}`,
  );
}

const packageJson = readPackageJson();
const scripts = packageJson.scripts ?? {};
const sections: CandidateSection[] = [];

assert(packageJson.name === 'zero-runtime', 'Package name should be zero-runtime.');
assert(packageJson.version === '0.1.0', 'Package version should be 0.1.0.');
assert(packageJson.type === 'module', 'Package should use ESM.');
assert(packageJson.private === true, 'Package should remain private for technical candidate.');
assert(
  typeof packageJson.description === 'string' &&
    packageJson.description.includes('runtime-centered'),
  'Package description should communicate runtime-centered positioning.',
);

sections.push({
  name: 'package-metadata',
  status: 'passed',
  checks: ['name', 'version', 'type', 'private', 'description'],
});

const requiredRuntimeFiles = [
  'src/cli.ts',
  'src/api/RuntimeApiServer.ts',
  'src/api/RuntimeApiController.ts',
  'src/api/RuntimeApiRouter.ts',
  'src/launcher/LocalAppLauncher.ts',
  'src/launcher/LocalAppPreflight.ts',
  'src/launcher/PortAvailabilityChecker.ts',
  'src/launcher/BrowserOpener.ts',
];

for (const file of requiredRuntimeFiles) {
  requireFile(file);
}

sections.push({
  name: 'runtime-core-files',
  status: 'passed',
  checks: requiredRuntimeFiles,
});

const requiredUiFiles = [
  'ui/package.json',
  'ui/vite.config.ts',
  'ui/src/main.tsx',
  'ui/src/App.tsx',
  'ui/src/api/runtimeApi.ts',
  'ui/src/layouts/AppLayout.tsx',
  'ui/src/components/dashboard/ProjectDashboard.tsx',
  'ui/src/pages/ProjectsPage.tsx',
  'ui/src/pages/SessionPage.tsx',
  'ui/src/pages/SettingsPage.tsx',
];

for (const file of requiredUiFiles) {
  requireFile(file);
}

sections.push({
  name: 'ui-core-files',
  status: 'passed',
  checks: requiredUiFiles,
});

const requiredMvpTests = [
  'src/examples/runtime-api-smoke-test.ts',
  'src/examples/local-app-launcher-test.ts',
  'src/examples/runtime-launcher-preflight-test.ts',
  'src/examples/runtime-launcher-final-lock-test.ts',
  'src/examples/ui-runtime-readiness-smoke-test.ts',
  'src/examples/mvp-real-project-trial-ux-test.ts',
  'src/examples/mvp-final-readiness-lock-test.ts',
  'src/examples/runtime-readiness-check-test.ts',
  'src/examples/release-readiness-check-test.ts',
  'src/examples/session-96-closure-report-test.ts',
];

for (const file of requiredMvpTests) {
  requireFile(file);
}

sections.push({
  name: 'mvp-lock-tests',
  status: 'passed',
  checks: requiredMvpTests,
});

const optionalBrowserFiles = ['src/examples/playwright-browser-smoke-test.ts'];

for (const file of optionalBrowserFiles) {
  requireFile(file);
}

sections.push({
  name: 'optional-browser-smoke',
  status: 'passed',
  checks: optionalBrowserFiles,
});

const requiredScripts = [
  'runtime',
  'runtime:dry',
  'runtime:api-smoke:test',
  'runtime:launcher:test',
  'ui:runtime-readiness:test',
  'mvp:real-project-trial-ux:test',
  'mvp:local-smoke:test',
  'browser:smoke:test',
  'mvp:optional-browser-smoke:test',
  'mvp:platform:test',
  'mvp:final-lock:test',
  'readiness:test',
  'release:readiness:test',
  'session-96:closure:test',
  'mvp:test',
  'rc:test',
  'typecheck',
  'check',
];

for (const script of requiredScripts) {
  requireScript(scripts, script);
}

sections.push({
  name: 'required-scripts',
  status: 'passed',
  checks: requiredScripts,
});

requireScriptIncludes({
  scripts,
  name: 'mvp:local-smoke:test',
  expected: 'npm run runtime:api-smoke:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:local-smoke:test',
  expected: 'npm run runtime:launcher:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:local-smoke:test',
  expected: 'npm run ui:runtime-readiness:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:local-smoke:test',
  expected: 'npm run mvp:real-project-trial-ux:test',
});

requireScriptExcludes({
  scripts,
  name: 'mvp:local-smoke:test',
  forbidden: 'browser:smoke:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:optional-browser-smoke:test',
  expected: 'npm run browser:smoke:test',
});

requireScriptIncludes({
  scripts,
  name: 'runtime:launcher:test',
  expected: 'npm run launcher:local:test',
});

requireScriptIncludes({
  scripts,
  name: 'runtime:launcher:test',
  expected: 'npm run runtime:launcher-preflight:test',
});

requireScriptIncludes({
  scripts,
  name: 'runtime:launcher:test',
  expected: 'npm run runtime:launcher-final-lock:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:platform:test',
  expected: 'npm run runtime:api-smoke:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:test',
  expected: 'npm run mvp:platform:test',
});

requireScriptIncludes({
  scripts,
  name: 'rc:test',
  expected: 'npm run mvp:test',
});

requireScriptIncludes({
  scripts,
  name: 'rc:test',
  expected: 'npm run release:readiness:test',
});

requireScriptExcludes({
  scripts,
  name: 'mvp:test',
  forbidden: 'real-provider:test',
});

requireScriptExcludes({
  scripts,
  name: 'rc:test',
  forbidden: 'real-provider:test',
});

sections.push({
  name: 'script-composition',
  status: 'passed',
  checks: [
    'local smoke includes runtime API, launcher, UI readiness and real trial',
    'browser smoke remains optional',
    'launcher includes preflight and final lock',
    'release candidate excludes real provider calls',
  ],
});

for (const dependency of ['dotenv', 'zod', 'tsx', 'typescript', 'eslint', 'prettier']) {
  requireDependency(packageJson, dependency);
}

requireDependency(packageJson, 'playwright');

sections.push({
  name: 'dependencies',
  status: 'passed',
  checks: ['dotenv', 'zod', 'tsx', 'typescript', 'eslint', 'prettier', 'playwright'],
});

const demoCommands = [
  'npm run mvp:local-smoke:test',
  'npm run runtime:dry',
  'npm run runtime',
  'npm run mvp:optional-browser-smoke:test',
  'npm run rc:test',
];

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'mvp-public-technical-candidate-test',
      candidate: {
        name: packageJson.name,
        version: packageJson.version,
        phase: 'public_technical_candidate',
        docsRequired: false,
        browserSmokeOptional: true,
      },
      sections,
      demoCommands,
      finalValidationCommands: [
        'npm run mvp:local-smoke:test',
        'npm run mvp:final-lock:test',
        'npm run mvp:public-candidate:test',
        'npm run typecheck',
        'cd ui && npm run build',
      ],
    },
    null,
    2,
  ),
);
