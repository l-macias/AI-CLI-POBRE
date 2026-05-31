import { rm } from 'node:fs/promises';
import path from 'node:path';
import { DecisionApplier } from '../interactive/DecisionApplier.js';
import { SessionDecisionStore } from '../interactive/SessionDecisionStore.js';
import { RuntimePlanGenerator } from '../planning/RuntimePlanGenerator.js';
import { RuntimePlanProviderBridge } from '../planning/RuntimePlanProviderBridge.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoBlockedCandidatePaths(paths: string[], blockedPatterns: string[]): void {
  const normalizedBlockedPatterns = blockedPatterns.map((pattern) =>
    pattern.toLowerCase().replaceAll('\\', '/'),
  );

  const blocked = paths.filter((filePath) => {
    const normalized = filePath.toLowerCase().replaceAll('\\', '/');

    return normalizedBlockedPatterns.some((pattern) => {
      return (
        normalized === pattern ||
        normalized.startsWith(`${pattern}/`) ||
        normalized.includes(`/${pattern}/`) ||
        normalized.includes(`/${pattern}`)
      );
    });
  });

  assert(
    blocked.length === 0,
    `Expected no memory-blocked candidate paths. Found: ${blocked.join(', ')}`,
  );
}

const testRoot = path.resolve('.runtime/session-memory-rules-enforcement-test');
const decisionRoot = path.join(testRoot, 'session-decisions');
const sessionId = 'session-memory-rules-enforcement-test';

await rm(testRoot, {
  recursive: true,
  force: true,
});

const store = new SessionDecisionStore({
  rootDir: decisionRoot,
});

const addResult = await store.add({
  sessionId,
  category: 'scope',
  strength: 'hard_rule',
  statement:
    'Do not use generated build output folders like .open-next, dist, build, node_modules or cache directories as candidate files. Prefer source files, app/pages/components/api routes/config files and package scripts.',
  source: 'user',
});

assert(
  addResult.appliedContext.blockedPathPatterns.includes('.open-next'),
  'Expected .open-next to become an executable blocked path pattern.',
);

assert(
  addResult.appliedContext.blockedPathPatterns.includes('dist'),
  'Expected dist to become an executable blocked path pattern.',
);

assert(
  addResult.appliedContext.blockedPathPatterns.includes('build'),
  'Expected build to become an executable blocked path pattern.',
);

assert(
  addResult.appliedContext.blockedPathPatterns.includes('node_modules'),
  'Expected node_modules to become an executable blocked path pattern.',
);

assert(
  addResult.appliedContext.blockedPathPatterns.includes('.cache'),
  'Expected .cache to become an executable blocked path pattern.',
);

const inspected = await store.inspect(sessionId);
const applier = new DecisionApplier();
const applied = applier.apply({
  sessionId,
  decisions: inspected.state.decisions,
});

const generator = new RuntimePlanGenerator();
const generated = generator.generate({
  sessionId,
  projectRoot: testRoot,
  projectName: 'memory-rules-fixture',
  instruction: 'Analyze frontend and backend project source files.',
  workspaceMode: 'local_snapshot',
  stack: ['react', 'typescript', 'nextjs'],
  knownFiles: [
    '.open-next/.build/durable-objects/queue.js',
    'dist/server/generated.js',
    'build/client/generated.js',
    'node_modules/pkg/index.js',
    '.cache/generated.js',
    'src/app/page.tsx',
    'src/components/Hero.tsx',
    'package.json',
  ],
  appliedDecisionContext: applied,
});

const candidatePaths = generated.plan.scope.candidateFiles.map((candidate) => candidate.path);

assertNoBlockedCandidatePaths(candidatePaths, applied.blockedPathPatterns);

assert(
  candidatePaths.includes('src/app/page.tsx'),
  'Expected safe source file to remain candidate.',
);

assert(
  candidatePaths.includes('src/components/Hero.tsx'),
  'Expected safe component file to remain candidate.',
);

assert(
  candidatePaths.includes('package.json'),
  'Expected package.json to remain candidate when not blocked by memory.',
);

const providerBridgePrototype = RuntimePlanProviderBridge.prototype as unknown as {
  buildUserPrompt: (input: {
    sessionId: string;
    projectRoot: string;
    projectName: string;
    instruction: string;
    workspaceMode: string;
    stack?: string[] | undefined;
    knownFiles?: string[] | undefined;
    appliedDecisionContext?: typeof applied | undefined;
  }) => string;
};

assert(
  typeof providerBridgePrototype.buildUserPrompt === 'function',
  'Expected RuntimePlanProviderBridge to keep buildUserPrompt available for runtime policy prompt coverage.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'session-memory-rules-enforcement-test',
      checked: {
        blockedPathPatterns: applied.blockedPathPatterns,
        candidatePaths,
        validationValid: generated.validation.valid,
      },
    },
    null,
    2,
  ),
);
