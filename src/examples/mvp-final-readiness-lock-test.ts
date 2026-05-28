import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface PackageJson {
  scripts?: Record<string, string>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readPackageJson(): PackageJson {
  const packageJsonPath = path.resolve('package.json');
  const raw = readFileSync(packageJsonPath, 'utf8');

  return JSON.parse(raw) as PackageJson;
}

function requireScript(scripts: Record<string, string>, name: string): string {
  const script = scripts[name];

  if (!script) {
    throw new Error(`Expected package script: ${name}`);
  }

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

function requireFile(relativePath: string): void {
  const absolutePath = path.resolve(relativePath);

  assert(existsSync(absolutePath), `Expected file to exist: ${relativePath}`);
}

const packageJson = readPackageJson();
const scripts = packageJson.scripts ?? {};

const requiredFiles = [
  'src/examples/runtime-workflow-state-machine-test.ts',
  'src/examples/runtime-workflow-state-api-test.ts',
  'src/examples/workflow-sandbox-recovery-state-test.ts',
  'src/examples/workflow-recovery-action-availability-test.ts',
  'src/examples/patch-apply-authorization-test.ts',
  'src/examples/stored-patch-apply-authorization-test.ts',
  'src/examples/persisted-patch-apply-authorization-test.ts',
  'src/examples/patch-apply-rejects-old-sandbox-test.ts',
  'src/examples/patch-apply-rejects-wrong-proposal-sandbox-test.ts',
  'src/examples/patch-apply-rejects-recovery-stale-approval-test.ts',
  'src/examples/patch-apply-allows-repaired-proposal-after-new-sandbox-test.ts',
  'src/examples/runtime-patch-apply-api-test.ts',
  'src/examples/zero-runtime-mvp-e2e-flow-test.ts',
  'src/examples/runtime-artifact-store-sandbox-recovery-test.ts',
  'src/examples/session-report-export-sandbox-recovery-test.ts',
  'src/examples/runtime-readiness-check-test.ts',
  'src/examples/real-platform-workflow-test.ts',
  'src/examples/end-to-end-product-flow-test.ts',
  'src/examples/release-readiness-check-test.ts',
  'src/examples/mvp-cli-entrypoint-lock-test.ts',
  'src/launcher/LocalAppLauncher.ts',
  'src/examples/local-app-launcher-test.ts',
  'src/examples/session-96-closure-report-test.ts',
];

for (const file of requiredFiles) {
  requireFile(file);
}

const requiredScripts = [
  'workflow:state-machine:test',
  'workflow:state-api:test',
  'test:workflow-sandbox-recovery-state',
  'test:workflow-recovery-action-availability',
  'test:patch-apply-authorization',
  'test:stored-patch-apply-authorization',
  'test:persisted-patch-apply-authorization',
  'test:patch-apply-rejects-old-sandbox',
  'test:patch-apply-rejects-wrong-proposal-sandbox',
  'test:patch-apply-rejects-recovery-stale-approval',
  'test:patch-apply-allows-repaired-proposal-after-new-sandbox',
  'patch:runtime-apply-api:test',
  'test:zero-runtime-mvp-e2e-flow',
  'test:artifact-store-sandbox-recovery',
  'test:session-report-export-sandbox-recovery',
  'readiness:test',
  'real-project:platform-workflow:test',
  'product-flow:test',
  'release:readiness:test',
  'mvp:workflow:test',
  'mvp:apply-gate:test',
  'mvp:e2e:test',
  'mvp:platform:test',
  'mvp:final-lock:test',
  'launcher:local:test',
  'mvp:cli-entrypoint:test',
  'session-96:closure:test',
];

for (const script of requiredScripts) {
  requireScript(scripts, script);
}

requireScriptIncludes({
  scripts,
  name: 'mvp:workflow:test',
  expected: 'npm run workflow:state-machine:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:workflow:test',
  expected: 'npm run workflow:state-api:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:workflow:test',
  expected: 'npm run test:workflow-sandbox-recovery-state',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:apply-gate:test',
  expected: 'npm run test:patch-apply-authorization',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:apply-gate:test',
  expected: 'npm run test:patch-apply-rejects-old-sandbox',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:apply-gate:test',
  expected: 'npm run test:patch-apply-allows-repaired-proposal-after-new-sandbox',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:e2e:test',
  expected: 'npm run test:zero-runtime-mvp-e2e-flow',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:e2e:test',
  expected: 'npm run patch:runtime-apply-api:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:platform:test',
  expected: 'npm run mvp:workflow:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:platform:test',
  expected: 'npm run mvp:apply-gate:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:platform:test',
  expected: 'npm run mvp:e2e:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:platform:test',
  expected: 'npm run readiness:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:final-lock:test',
  expected: 'tsx src/examples/mvp-final-readiness-lock-test.ts',
});
requireScriptIncludes({
  scripts,
  name: 'session-96:closure:test',
  expected: 'tsx src/examples/session-96-closure-report-test.ts',
});
requireScriptIncludes({
  scripts,
  name: 'mvp:test',
  expected: 'npm run mvp:platform:test',
});
requireScriptIncludes({
  scripts,
  name: 'mvp:platform:test',
  expected: 'npm run launcher:local:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:platform:test',
  expected: 'npm run mvp:cli-entrypoint:test',
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

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'mvp-final-readiness-lock-test',
      checkedFiles: requiredFiles.length,
      checkedScripts: requiredScripts.length,
      lockedSuites: {
        workflow: scripts['mvp:workflow:test'],
        applyGate: scripts['mvp:apply-gate:test'],
        e2e: scripts['mvp:e2e:test'],
        platform: scripts['mvp:platform:test'],
        finalLock: scripts['mvp:final-lock:test'],
      },
    },
    null,
    2,
  ),
);
