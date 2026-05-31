import { RuntimePlanGenerator } from '../planning/RuntimePlanGenerator.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertReadOnlyPlan(input: {
  label: string;
  instruction: string;
  workspaceMode: string;
}): void {
  const generator = new RuntimePlanGenerator();

  const result = generator.generate({
    sessionId: `read-only-runtime-plan-test-${input.label}`,
    projectRoot: '.',
    projectName: 'read-only-fixture',
    instruction: input.instruction,
    workspaceMode: input.workspaceMode,
    stack: ['react', 'typescript', 'nextjs'],
    knownFiles: [
      'src/app/page.tsx',
      'src/components/Hero.tsx',
      'package.json',
      '.open-next/.build/generated.js',
      'dist/generated.js',
    ],
  });

  const stepKinds = result.plan.steps.map((step) => step.kind);
  const candidatePaths = result.plan.scope.candidateFiles.map((candidate) => candidate.path);

  assert(result.validation.valid, `${input.label}: expected read-only plan validation to pass.`);
  assert(result.plan.mode === 'read_only', `${input.label}: expected mode read_only.`);
  assert(result.plan.needsSnapshot === false, `${input.label}: read-only must not need snapshot.`);
  assert(
    result.plan.requiresApproval === false,
    `${input.label}: read-only must not require patch approval.`,
  );
  assert(
    result.plan.verifyCommands.length === 0,
    `${input.label}: read-only must not include verify commands.`,
  );
  assert(!stepKinds.includes('patch'), `${input.label}: read-only must not include patch step.`);
  assert(
    !stepKinds.includes('approval'),
    `${input.label}: read-only must not include approval step.`,
  );
  assert(
    !stepKinds.includes('snapshot'),
    `${input.label}: read-only must not include snapshot step.`,
  );
  assert(!stepKinds.includes('verify'), `${input.label}: read-only must not include verify step.`);
  assert(
    stepKinds.includes('inspect') && stepKinds.includes('context') && stepKinds.includes('report'),
    `${input.label}: read-only should include inspect/context/report steps.`,
  );
  assert(
    !candidatePaths.some((candidatePath) => candidatePath.includes('.open-next')),
    `${input.label}: generated output must not be candidate context.`,
  );
  assert(
    !candidatePaths.some((candidatePath) => candidatePath.includes('dist')),
    `${input.label}: dist output must not be candidate context.`,
  );
  assert(
    candidatePaths.includes('src/app/page.tsx'),
    `${input.label}: safe source files should remain in context.`,
  );
}

assertReadOnlyPlan({
  label: 'explicit-read-only',
  instruction:
    'Analyze the project in read-only mode and produce recommendations only. Do not generate patches, do not apply files, and do not create snapshots.',
  workspaceMode: 'local_snapshot',
});

assertReadOnlyPlan({
  label: 'patchless-workspace',
  instruction: 'Analyze frontend and backend boundaries and produce recommendations.',
  workspaceMode: 'local_patchless',
});

const patchGenerator = new RuntimePlanGenerator();
const patchResult = patchGenerator.generate({
  sessionId: 'read-only-runtime-plan-test-patch',
  projectRoot: '.',
  projectName: 'patch-fixture',
  instruction: 'Improve the frontend component structure.',
  workspaceMode: 'local_snapshot',
  stack: ['react', 'typescript'],
  knownFiles: ['src/components/Hero.tsx'],
});

const patchStepKinds = patchResult.plan.steps.map((step) => step.kind);

assert(patchResult.validation.valid, 'Expected normal patch plan validation to pass.');
assert(
  patchResult.plan.mode === 'patch',
  'Expected normal improvement objective to remain patch mode.',
);
assert(patchStepKinds.includes('patch'), 'Expected patch mode to include patch step.');
assert(patchStepKinds.includes('approval'), 'Expected patch mode to include approval step.');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'read-only-runtime-plan-test',
      checked: {
        readOnlyCases: 2,
        patchCase: true,
      },
    },
    null,
    2,
  ),
);
