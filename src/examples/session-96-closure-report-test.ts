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
  const raw = readFileSync(path.resolve('package.json'), 'utf8');

  return JSON.parse(raw) as PackageJson;
}

function requireScript(scripts: Record<string, string>, name: string): string {
  const script = scripts[name];

  if (!script) {
    throw new Error(`Expected package script: ${name}`);
  }

  return script;
}

function requireFile(relativePath: string): void {
  assert(existsSync(path.resolve(relativePath)), `Expected file to exist: ${relativePath}`);
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

const packageJson = readPackageJson();
const scripts = packageJson.scripts ?? {};

const closedSessions = [
  {
    id: '96.N',
    title: 'Runtime Workflow State Integration',
    requiredFiles: [
      'src/workflow/RuntimeWorkflowState.ts',
      'src/workflow/RuntimeWorkflowStateMachine.ts',
      'src/workflow/RuntimeActionAvailability.ts',
      'src/examples/runtime-workflow-state-machine-test.ts',
      'src/examples/runtime-workflow-state-api-test.ts',
      'src/examples/workflow-sandbox-recovery-state-test.ts',
      'src/examples/workflow-recovery-action-availability-test.ts',
    ],
    requiredScripts: [
      'mvp:workflow:test',
      'workflow:state-machine:test',
      'workflow:state-api:test',
      'test:workflow-sandbox-recovery-state',
      'test:workflow-recovery-action-availability',
    ],
  },
  {
    id: '96.O',
    title: 'Apply Gate + Workflow Hardening Final',
    requiredFiles: [
      'src/approval/PatchApplyAuthorization.ts',
      'src/approval/ApprovalDecisionStore.ts',
      'src/examples/patch-apply-authorization-test.ts',
      'src/examples/stored-patch-apply-authorization-test.ts',
      'src/examples/persisted-patch-apply-authorization-test.ts',
      'src/examples/patch-apply-rejects-old-sandbox-test.ts',
      'src/examples/patch-apply-rejects-wrong-proposal-sandbox-test.ts',
      'src/examples/patch-apply-rejects-recovery-stale-approval-test.ts',
      'src/examples/patch-apply-allows-repaired-proposal-after-new-sandbox-test.ts',
      'src/examples/runtime-patch-apply-api-test.ts',
    ],
    requiredScripts: [
      'mvp:apply-gate:test',
      'test:patch-apply-authorization',
      'test:stored-patch-apply-authorization',
      'test:persisted-patch-apply-authorization',
      'test:patch-apply-rejects-old-sandbox',
      'test:patch-apply-rejects-wrong-proposal-sandbox',
      'test:patch-apply-rejects-recovery-stale-approval',
      'test:patch-apply-allows-repaired-proposal-after-new-sandbox',
      'patch:runtime-apply-api:test',
    ],
  },
  {
    id: '96.P',
    title: 'Zero Runtime MVP E2E Flow',
    requiredFiles: [
      'src/examples/zero-runtime-mvp-e2e-flow-test.ts',
      'src/examples/runtime-artifact-store-sandbox-recovery-test.ts',
      'src/examples/session-report-export-sandbox-recovery-test.ts',
      'src/artifacts/RuntimeArtifactStore.ts',
      'src/reports/SessionReportBuilder.ts',
      'src/reports/ReportStorage.ts',
    ],
    requiredScripts: [
      'mvp:e2e:test',
      'test:zero-runtime-mvp-e2e-flow',
      'test:artifact-store-sandbox-recovery',
      'test:session-report-export-sandbox-recovery',
    ],
  },
  {
    id: '96.Q',
    title: 'MVP Final Readiness / Product Flow Lock',
    requiredFiles: [
      'src/examples/mvp-final-readiness-lock-test.ts',
      'src/examples/runtime-readiness-check-test.ts',
      'src/examples/real-platform-workflow-test.ts',
      'src/examples/end-to-end-product-flow-test.ts',
      'src/examples/release-readiness-check-test.ts',
    ],
    requiredScripts: [
      'mvp:final-lock:test',
      'mvp:platform:test',
      'readiness:test',
      'real-project:platform-workflow:test',
      'product-flow:test',
      'release:readiness:test',
    ],
  },
  {
    id: '96.R',
    title: 'MVP Final UX / CLI Entry Point Lock',
    requiredFiles: [
      'src/cli.ts',
      'src/launcher/LocalAppLauncher.ts',
      'src/examples/local-app-launcher-test.ts',
      'src/examples/mvp-cli-entrypoint-lock-test.ts',
    ],
    requiredScripts: ['runtime', 'runtime:dry', 'launcher:local:test', 'mvp:cli-entrypoint:test'],
  },
];

for (const session of closedSessions) {
  for (const file of session.requiredFiles) {
    requireFile(file);
  }

  for (const script of session.requiredScripts) {
    requireScript(scripts, script);
  }
}

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
  expected: 'npm run launcher:local:test',
});

requireScriptIncludes({
  scripts,
  name: 'mvp:platform:test',
  expected: 'npm run mvp:cli-entrypoint:test',
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

const releaseConfidenceReport = {
  status: 'closed',
  session: '96',
  title: 'Session 96 Final Closure / Release Confidence Report',
  completedUnits: closedSessions.map((session) => ({
    id: session.id,
    title: session.title,
  })),
  protectedRuntimeCapabilities: [
    'Workflow state now models sandbox, recovery, repaired proposal, dry-run, apply, rollback, verify and report states.',
    'Real apply requires explicit confirmation, valid approval, matching proposal/diff and passed sandbox verification.',
    'Old sandbox results cannot authorize repaired proposals.',
    'Stale approvals cannot authorize repaired proposal/diff pairs.',
    'Runtime artifacts index sandbox and recovery outputs.',
    'Reports include sandbox and recovery evidence.',
    'MVP E2E validates failed sandbox, recovery preparation, repaired patch, fresh sandbox, apply and report export.',
    'CLI runtime dry-run entrypoint is locked by test.',
  ],
  validationCommands: {
    focused: [
      'npm run mvp:workflow:test',
      'npm run mvp:apply-gate:test',
      'npm run mvp:e2e:test',
      'npm run mvp:cli-entrypoint:test',
      'npm run mvp:final-lock:test',
      'npm run session-96:closure:test',
    ],
    platform: ['npm run mvp:platform:test'],
    releaseCandidate: ['npm run rc:test'],
    staticChecks: ['npm run typecheck', 'cd ui && npm run typecheck && npm run build'],
  },
  remainingRisks: [
    'Provider-based recovery generation still depends on provider configuration and should be validated separately with real-provider tests.',
    'Full browser UI interaction is validated indirectly through API/component typecheck/build, not with Playwright-style browser automation.',
    'Large full-suite mvp:test can be slower because it includes legacy suites beyond the new session 96 lock.',
  ],
  recommendedNextSession: {
    id: '97.A',
    title: 'MVP Usability Polish / Browser Workflow QA',
    goals: [
      'Run the actual local UI against the locked API flow.',
      'Improve empty/loading/error states around workflow, approval, sandbox and recovery panels.',
      'Add a small browser-level smoke test if the project accepts that dependency later.',
      'Prepare public MVP instructions and demo script.',
    ],
  },
};

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'session-96-closure-report-test',
      report: releaseConfidenceReport,
    },
    null,
    2,
  ),
);
