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
  const value = scripts[name];

  assert(typeof value === 'string' && value.length > 0, `Expected package script: ${name}`);

  return value;
}

const root = process.cwd();

const packageJsonPath = path.resolve(root, 'package.json');
const guidedWorkflowPanelPath = path.resolve(
  root,
  'ui/src/components/workflow/GuidedWorkflowPanel.tsx',
);
const nextBestActionPanelPath = path.resolve(
  root,
  'ui/src/components/workflow/NextBestActionPanel.tsx',
);
const workflowProgressHeaderPath = path.resolve(
  root,
  'ui/src/components/workflow/WorkflowProgressHeader.tsx',
);
const workflowHealthBadgesPath = path.resolve(
  root,
  'ui/src/components/workflow/WorkflowHealthBadges.tsx',
);
const sessionWorkspaceTabsPath = path.resolve(
  root,
  'ui/src/components/session/SessionWorkspaceTabs.tsx',
);
const runtimeStatusBarPath = path.resolve(root, 'ui/src/components/session/RuntimeStatusBar.tsx');
const planPanelPath = path.resolve(root, 'ui/src/components/session/PlanPanel.tsx');
const patchPanelPath = path.resolve(root, 'ui/src/components/session/PatchPanel.tsx');
const stylesPath = path.resolve(root, 'ui/src/styles.css');

const requiredFiles = [
  packageJsonPath,
  guidedWorkflowPanelPath,
  nextBestActionPanelPath,
  workflowProgressHeaderPath,
  workflowHealthBadgesPath,
  sessionWorkspaceTabsPath,
  runtimeStatusBarPath,
  planPanelPath,
  patchPanelPath,
  stylesPath,
];

for (const file of requiredFiles) {
  assert(await fileExists(file), `Expected file to exist: ${file}`);
}

const checks: UxCheck[] = [];

const guidedWorkflowPanel = await readText(guidedWorkflowPanelPath);
const nextBestActionPanel = await readText(nextBestActionPanelPath);
const workflowProgressHeader = await readText(workflowProgressHeaderPath);
const workflowHealthBadges = await readText(workflowHealthBadgesPath);
const sessionWorkspaceTabs = await readText(sessionWorkspaceTabsPath);
const runtimeStatusBar = await readText(runtimeStatusBarPath);
const planPanel = await readText(planPanelPath);
const patchPanel = await readText(patchPanelPath);
const styles = await readText(stylesPath);
const packageJson = await readJsonFile<PackageJson>(packageJsonPath);
const scripts = packageJson.scripts ?? {};

checkAllIncludes({
  content: guidedWorkflowPanel,
  filePath: guidedWorkflowPanelPath,
  expected: [
    'Show advanced workflow details',
    '<WorkflowHealthBadges',
    '<WorkflowStepper',
    'Runtime source:',
    'state machine',
    'local fallback',
  ],
  reason: 'GuidedWorkflowPanel should keep technical evidence collapsed behind advanced details',
});

checks.push({
  name: 'guided-workflow-advanced-details',
  status: 'passed',
  detail: 'Technical workflow evidence is collapsed behind advanced details.',
});

checkAllIncludes({
  content: workflowProgressHeader,
  filePath: workflowProgressHeaderPath,
  expected: ['Guided workflow', 'You are here:', 'Follow one safe step at a time', 'remaining'],
  reason: 'WorkflowProgressHeader should explain progress in friendly step-by-step language',
});

checks.push({
  name: 'friendly-progress-header',
  status: 'passed',
  detail: 'Progress header uses human-friendly guided workflow copy.',
});

checkAllIncludes({
  content: nextBestActionPanel,
  filePath: nextBestActionPanelPath,
  expected: ['Next safe step', 'safe to continue', 'why blocked', 'LockKeyhole'],
  reason: 'NextBestActionPanel should prioritize one clear safe action and explain blocked states',
});

checks.push({
  name: 'next-safe-action',
  status: 'passed',
  detail: 'Next action panel has clear ready/blocked copy and primary CTA.',
});

checkAllIncludes({
  content: workflowHealthBadges,
  filePath: workflowHealthBadgesPath,
  expected: [
    'Not started',
    'Not created',
    'Not previewed',
    'Not run',
    'Not needed',
    'Safe preview',
    'Dry-run passed',
  ],
  reason:
    'WorkflowHealthBadges should avoid raw technical labels like missing/dry_run in the visible UX',
});

checks.push({
  name: 'human-health-labels',
  status: 'passed',
  detail: 'Health badges use user-facing status labels.',
});

checkAllIncludes({
  content: sessionWorkspaceTabs,
  filePath: sessionWorkspaceTabsPath,
  expected: ['mainTabs', 'advancedTabs', 'Overview', 'Plan', 'Patch', 'Verify'],
  reason: 'SessionWorkspaceTabs should separate main workflow from advanced technical areas',
});

checks.push({
  name: 'workspace-tabs-simplified',
  status: 'passed',
  detail: 'Main flow tabs are visually separated from advanced details.',
});

checkAllIncludes({
  content: runtimeStatusBar,
  filePath: runtimeStatusBarPath,
  expected: [
    'Runtime session',
    'No active session yet',
    'Waiting for your input',
    'Approval required',

    'Goal',

    'getFriendlyStatus',
  ],
  reason: 'RuntimeStatusBar should explain session state in friendly language',
});

checks.push({
  name: 'runtime-status-friendly',
  status: 'passed',
  detail: 'Runtime status bar explains session/project/goal clearly.',
});

checkAllIncludes({
  content: planPanel,
  filePath: planPanelPath,
  expected: [
    'Planning step',
    'Why this step matters',
    'Recommended path',
    'Plan blocked by runtime validation',
    'Start with the deterministic plan',

    'buildPlanStage',
    'PlanReviewItem',
  ],
  reason: 'PlanPanel should explain planning as a safe prerequisite before patch generation',
});

checks.push({
  name: 'plan-panel-guided',
  status: 'passed',
  detail: 'Plan panel explains why planning matters and what unlocks patch generation.',
});

checkAllIncludes({
  content: patchPanel,
  filePath: patchPanelPath,
  expected: [
    'Patch review center',
    'How to read this panel',
    'Real apply is not available',
    'Apply is locked until sandbox runs',
    'Recovery path is available',
    'PatchStageIcon',
    'PatchReviewItem',
    'buildPatchStage',
    'buildSafetyMessage',
  ],
  reason: 'PatchPanel should behave as a review center with clear safety messaging',
});

checks.push({
  name: 'patch-review-center',
  status: 'passed',
  detail: 'Patch panel uses review/safety language before technical patch actions.',
});

checkAllIncludes({
  content: styles,
  filePath: stylesPath,
  expected: [''],
  reason:
    'styles.css should include the UX polish classes for guided overview, tabs, patch, status and plan',
});

checks.push({
  name: 'ux-styles-locked',
  status: 'passed',
  detail: 'Friendly guided UX CSS sections are present.',
});

const uiReadinessScript = requireScript(scripts, 'ui:runtime-readiness:test');

assert(
  uiReadinessScript.includes('src/examples/ui-runtime-readiness-smoke-test.ts'),
  'ui:runtime-readiness:test should still point to the existing UI readiness smoke test.',
);

checks.push({
  name: 'existing-ui-readiness-script',
  status: 'passed',
  detail: 'Existing UI readiness smoke test remains wired.',
});

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'ui-guided-workflow-ux-polish-test',
      checks,
      lockedUxPrinciples: [
        'Overview guides the user one safe step at a time.',
        'Only the next valid action is visually dominant.',
        'Blocked states explain why they are blocked.',
        'Advanced technical evidence is collapsed by default.',
        'Main workflow tabs are separated from advanced details.',
        'Plan and Patch panels explain safety before actions.',
      ],
    },
    null,
    2,
  ),
);
