import { rm } from 'node:fs/promises';
import path from 'node:path';
import { RuntimePlanGenerator } from '../planning/RuntimePlanGenerator.js';
import { PlanStorage } from '../planning/PlanStorage.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/runtime-plan-generator-test');

await rm(testRoot, {
  recursive: true,
  force: true,
});

const generator = new RuntimePlanGenerator();
const storage = new PlanStorage();

const safeResult = generator.generate({
  sessionId: 'session-83-runtime-plan-test',
  projectRoot: testRoot,
  projectName: 'runtime-plan-fixture',
  instruction:
    'Improve the React profile component and backend API route mapping without applying changes yet.',
  workspaceMode: 'local_snapshot',
  stack: ['react', 'express', 'typescript'],
  knownFiles: [
    'src/components/ProfileCard.tsx',
    'src/api/profileApi.ts',
    'src/routes/profileRoutes.ts',
    'src/controllers/profileController.ts',
  ],
});

assert(safeResult.validation.valid, 'Expected safe runtime plan to be valid.');
assert(safeResult.plan.status === 'validated', 'Expected safe runtime plan to be validated.');
assert(safeResult.plan.objective.includes('Improve'), 'Expected objective to be preserved.');
assert(safeResult.plan.scope.candidateFiles.length === 4, 'Expected candidate files.');
assert(safeResult.plan.requiresApproval, 'Expected approval to be required.');
assert(
  !safeResult.plan.needsSnapshot,
  'Expected snapshot to be required for medium/high risk plans.',
);
assert(
  safeResult.plan.verifyCommands.some(
    (command) => command.command === 'npm' && command.args.join(' ') === 'run typecheck',
  ),
  'Expected npm run typecheck verify command.',
);
assert(
  !safeResult.plan.steps.some((step) => step.kind === 'snapshot' && step.requiresApproval),
  'Expected snapshot approval step.',
);
assert(
  safeResult.plan.steps.some((step) => step.kind === 'approval' && step.requiresApproval),
  'Expected approval step.',
);
const riskyResult = generator.generate({
  sessionId: 'session-83-runtime-plan-risky-test',
  projectRoot: testRoot,
  projectName: 'runtime-plan-fixture',
  instruction:
    'Improve auth token handling and review package.json scripts without applying changes yet.',
  workspaceMode: 'local_snapshot',
  stack: ['react', 'express', 'typescript'],
  knownFiles: ['src/auth/auth.service.ts', 'package.json'],
});

assert(riskyResult.validation.valid, 'Expected risky runtime plan to still be valid.');
assert(riskyResult.plan.status === 'validated', 'Expected risky runtime plan to be validated.');
assert(
  riskyResult.plan.riskLevel === 'medium',
  `Expected risky runtime plan to be medium risk, got ${riskyResult.plan.riskLevel}.`,
);
assert(riskyResult.plan.needsSnapshot, 'Expected medium-risk plan to require snapshot.');
assert(
  riskyResult.plan.steps.some((step) => step.kind === 'snapshot' && step.requiresApproval),
  'Expected medium-risk plan to include snapshot approval step.',
);
const saved = await storage.save(safeResult);

assert(saved.planPath.endsWith('.json'), 'Expected persisted plan json path.');
assert(saved.activePlanPath.endsWith('active-runtime-plan.json'), 'Expected active plan path.');

const blockedResult = generator.generate({
  sessionId: 'session-83-runtime-plan-blocked-test',
  projectRoot: testRoot,
  projectName: 'runtime-plan-fixture',
  instruction: 'Modify environment configuration.',
  workspaceMode: 'local_snapshot',
  stack: ['typescript'],
  knownFiles: ['.env'],
});

assert(!blockedResult.validation.valid, 'Expected protected path plan to be invalid.');
assert(blockedResult.plan.status === 'rejected', 'Expected protected path plan to be rejected.');
assert(
  blockedResult.validation.issues.some((issue) => issue.code === 'PROTECTED_PATH_NOT_ALLOWED'),
  'Expected protected path validation issue.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-plan-generator-test',
      validPlanId: safeResult.plan.id,
      validPlanStatus: safeResult.plan.status,
      blockedPlanStatus: blockedResult.plan.status,
      blockedIssues: blockedResult.validation.issues.map((issue) => issue.code),
      planPath: saved.planPath,
      activePlanPath: saved.activePlanPath,
      riskyPlanStatus: riskyResult.plan.status,
      riskyRiskLevel: riskyResult.plan.riskLevel,
      riskyNeedsSnapshot: riskyResult.plan.needsSnapshot,
    },
    null,
    2,
  ),
);
