import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface PackageJson {
  name?: unknown;
  version?: unknown;
  description?: unknown;
  private?: unknown;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface DemoStatusItem {
  area: string;
  status: 'ready' | 'optional' | 'limited';
  evidence: string[];
}

interface DemoCommand {
  label: string;
  command: string;
  purpose: string;
  requiredForBaseMvp: boolean;
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

assert(packageJson.name === 'zero-runtime', 'Expected package name zero-runtime.');
assert(packageJson.version === '0.1.0', 'Expected package version 0.1.0.');
assert(packageJson.private === true, 'Expected package to remain private.');
assert(
  typeof packageJson.description === 'string' &&
    packageJson.description.includes('runtime-centered'),
  'Expected package description to communicate runtime-centered architecture.',
);

const requiredFiles = [
  'src/examples/runtime-api-smoke-test.ts',
  'src/examples/local-app-launcher-test.ts',
  'src/examples/runtime-launcher-final-lock-test.ts',
  'src/examples/ui-runtime-readiness-smoke-test.ts',
  'src/examples/mvp-real-project-trial-ux-test.ts',
  'src/examples/playwright-browser-smoke-test.ts',
  'src/examples/mvp-public-technical-candidate-test.ts',
  'src/examples/mvp-final-readiness-lock-test.ts',
  'src/examples/session-96-closure-report-test.ts',
  'src/cli.ts',
  'src/api/RuntimeApiServer.ts',
  'src/launcher/LocalAppLauncher.ts',
  'ui/package.json',
  'ui/vite.config.ts',
  'ui/src/App.tsx',
  'ui/src/api/runtimeApi.ts',
];

for (const file of requiredFiles) {
  requireFile(file);
}

const requiredScripts = [
  'runtime',
  'runtime:dry',
  'runtime:api-smoke:test',
  'runtime:launcher:test',
  'ui:runtime-readiness:test',
  'mvp:real-project-trial-ux:test',
  'mvp:local-smoke:test',
  'mvp:public-candidate:test',
  'mvp:final-lock:test',
  'mvp:optional-browser-smoke:test',
  'browser:smoke:test',
  'typecheck',
  'rc:test',
];

for (const script of requiredScripts) {
  requireScript(scripts, script);
}

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
  name: 'mvp:public-candidate:test',
  expected: 'tsx src/examples/mvp-public-technical-candidate-test.ts',
});

requireScriptIncludes({
  scripts,
  name: 'runtime',
  expected: 'tsx src/cli.ts runtime',
});

requireScriptIncludes({
  scripts,
  name: 'runtime:dry',
  expected: 'tsx src/cli.ts runtime --dry-run',
});

requireDependency(packageJson, 'dotenv');
requireDependency(packageJson, 'zod');
requireDependency(packageJson, 'tsx');
requireDependency(packageJson, 'typescript');
requireDependency(packageJson, 'playwright');

const demoStatus: DemoStatusItem[] = [
  {
    area: 'Runtime authority',
    status: 'ready',
    evidence: [
      'Runtime API server has smoke coverage.',
      'Patch/apply flow remains guarded by existing MVP locks.',
      'Real apply is not required for the demo flow.',
    ],
  },
  {
    area: 'Local launcher',
    status: 'ready',
    evidence: [
      'runtime and runtime:dry scripts exist.',
      'Launcher preflight and final lock are included in runtime:launcher:test.',
      'Ports, UI directory, npm and node_modules checks are covered.',
    ],
  },
  {
    area: 'Local API product surface',
    status: 'ready',
    evidence: [
      'Health, settings, providers, artifacts, projects, sessions, workspace, workflow and snapshot are covered by runtime:api-smoke:test.',
      'The smoke validates real RuntimeApiServer connectivity.',
    ],
  },
  {
    area: 'UI readiness',
    status: 'ready',
    evidence: [
      'React entrypoint, Vite proxy, App shell, runtime API client and main pages are covered.',
      'Dashboard, Projects, Session and Settings routes are statically locked.',
    ],
  },
  {
    area: 'Real project trial',
    status: 'ready',
    evidence: [
      'A controlled MERN/PERN-style fixture is registered and analyzed.',
      'Workflow, plan, proposal, diff, sandbox, report, artifact index and inventory are covered.',
      'The trial confirms no real patch is applied to the fixture.',
    ],
  },
  {
    area: 'Browser smoke',
    status: 'optional',
    evidence: [
      'Playwright smoke exists and remains outside mvp:local-smoke:test.',
      'Browser smoke validates dashboard/projects/session/settings and Vite proxy.',
    ],
  },
  {
    area: 'Provider-backed execution',
    status: 'limited',
    evidence: [
      'Base MVP validation excludes real-provider:test.',
      'Provider tests remain separate to avoid accidental paid/network execution.',
    ],
  },
  {
    area: 'Public docs',
    status: 'limited',
    evidence: [
      'Docs are intentionally not required by this lock.',
      'Next step can create README, demo script and quickstart instructions.',
    ],
  },
];

const demoCommands: DemoCommand[] = [
  {
    label: 'Base MVP local smoke',
    command: 'npm run mvp:local-smoke:test',
    purpose: 'Validate API smoke, launcher, UI readiness and real project trial.',
    requiredForBaseMvp: true,
  },
  {
    label: 'Runtime dry run',
    command: 'npm run runtime:dry',
    purpose: 'Show preflight/planned local runtime launch without starting long-running processes.',
    requiredForBaseMvp: true,
  },
  {
    label: 'Run local product',
    command: 'npm run runtime',
    purpose: 'Start the runtime API and local UI for manual demo.',
    requiredForBaseMvp: true,
  },
  {
    label: 'Public technical candidate lock',
    command: 'npm run mvp:public-candidate:test',
    purpose: 'Validate the project is wired as a public technical candidate.',
    requiredForBaseMvp: true,
  },
  {
    label: 'Optional browser smoke',
    command: 'npm run mvp:optional-browser-smoke:test',
    purpose: 'Run Playwright browser validation separately from base MVP smoke.',
    requiredForBaseMvp: false,
  },
  {
    label: 'Full release candidate',
    command: 'npm run rc:test',
    purpose: 'Run the broader release candidate suite without real provider calls.',
    requiredForBaseMvp: false,
  },
];

const recommendedDemoFlow = [
  'Run npm run mvp:local-smoke:test.',
  'Run npm run runtime:dry and show launcher preflight output.',
  'Run npm run runtime and open the local UI.',
  'Show Dashboard health/status.',
  'Open Projects and register/select a local project.',
  'Open Session and start a safe/read-only or UI-only goal.',
  'Prepare workflow, review context, generate plan, preview patch/diff, sandbox, report/artifacts.',
  'Optionally run npm run mvp:optional-browser-smoke:test for automated browser evidence.',
];

const remainingRisks = [
  'Provider-backed model execution is intentionally separate from the base MVP demo.',
  'Large legacy test suites may still be slower than the focused MVP demo commands.',
  'Public README/docs/demo script are not locked by this session yet.',
  'The browser smoke validates navigation and proxy, not every advanced workflow button.',
];

const readyNow = [
  'Runtime API local smoke.',
  'Launcher preflight and dry-run UX.',
  'UI readiness and main page wiring.',
  'Real project trial without applying changes.',
  'Optional Playwright browser smoke.',
  'Public technical candidate lock.',
];

const notClaimedYet = [
  'Production release.',
  'Hosted/cloud deployment.',
  'Provider-backed autonomous coding by default.',
  'Full public documentation.',
  'End-user onboarding polish beyond technical candidate quality.',
];

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'mvp-demo-flow-report-test',
      product: {
        name: packageJson.name,
        version: packageJson.version,
        phase: 'mvp_public_technical_candidate_demo_ready',
        runtimeAuthority: true,
        localFirst: true,
        docsRequired: false,
        browserSmokeOptional: true,
      },
      demoStatus,
      demoCommands,
      recommendedDemoFlow,
      readyNow,
      notClaimedYet,
      remainingRisks,
      nextRecommendedSession: {
        id: '99.A',
        title: 'Public README + Demo Script + Quickstart',
        goal: 'Convert the executable technical candidate evidence into public-facing docs and a concise demo script.',
      },
    },
    null,
    2,
  ),
);
