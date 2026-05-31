import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ExpressRouteScanner } from '../intelligence/api/ExpressRouteScanner.js';
import { ApiClientScanner } from '../intelligence/frontend/ApiClientScanner.js';
import { FetchUsageScanner } from '../intelligence/frontend/FetchUsageScanner.js';
import { ProjectStackDetector } from '../languages/ProjectStackDetector.js';
import { PatchCandidateResolver } from '../patches/PatchCandidateResolver.js';
import { RuntimePlanGenerator } from '../planning/RuntimePlanGenerator.js';
import { GeneratedPathPolicy } from '../projects/GeneratedPathPolicy.js';
import { FileIndexer } from '../retrieval/FileIndexer.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function writeFixtureFile(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const absolutePath = path.join(root, relativePath);

  await mkdir(path.dirname(absolutePath), {
    recursive: true,
  });

  await writeFile(absolutePath, content, 'utf8');
}

function assertNoGeneratedPath(paths: string[], label: string): void {
  const policy = new GeneratedPathPolicy();
  const generatedPaths = paths.filter((filePath) => policy.isGeneratedPath(filePath));

  assert(
    generatedPaths.length === 0,
    `${label} should not include generated/dependency/cache paths. Found: ${generatedPaths.join(
      ', ',
    )}`,
  );
}

const testRoot = path.resolve('.runtime/generated-output-exclusion-test');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await writeFixtureFile(
  testRoot,
  'package.json',
  JSON.stringify(
    {
      type: 'module',
      dependencies: {
        '@types/node': '^20.0.0',
        express: '^4.0.0',
        react: '^18.0.0',
        typescript: '^5.0.0',
      },
      devDependencies: {},
      scripts: {
        typecheck: 'tsc --noEmit',
      },
    },
    null,
    2,
  ),
);

await writeFixtureFile(
  testRoot,
  'tsconfig.json',
  JSON.stringify(
    {
      compilerOptions: {
        strict: true,
      },
    },
    null,
    2,
  ),
);

await writeFixtureFile(
  testRoot,
  'src/components/ProfileCard.tsx',
  `export function ProfileCard() {
  return <article>Profile</article>;
}
`,
);

await writeFixtureFile(
  testRoot,
  'src/api/profileApi.ts',
  `export async function loadProfile() {
  return fetch('/api/profile');
}

export async function saveProfile() {
  return api.post('/api/profile', {});
}
`,
);

await writeFixtureFile(
  testRoot,
  'src/routes/profileRoutes.ts',
  `import { getProfile } from '../controllers/profileController';

router.get('/api/profile', getProfile);
`,
);

await writeFixtureFile(
  testRoot,
  'src/controllers/profileController.ts',
  `export function getProfile() {
  return {};
}
`,
);

await writeFixtureFile(
  testRoot,
  '.open-next/.build/durable-objects/queue.js',
  `fetch('/api/generated-open-next');
router.get('/api/generated-open-next', generatedHandler);
`,
);

await writeFixtureFile(
  testRoot,
  '.next/server/app/api/generated.js',
  `fetch('/api/generated-next');
`,
);

await writeFixtureFile(
  testRoot,
  'dist/routes/generatedRoutes.js',
  `router.get('/api/generated-dist', generatedHandler);
`,
);

await writeFixtureFile(
  testRoot,
  'build/client/generatedApi.js',
  `fetch('/api/generated-build');
`,
);

await writeFixtureFile(
  testRoot,
  'out/generatedApi.js',
  `fetch('/api/generated-out');
`,
);

await writeFixtureFile(
  testRoot,
  '.cache/generatedApi.ts',
  `fetch('/api/generated-cache');
`,
);

await writeFixtureFile(
  testRoot,
  '.turbo/generatedApi.ts',
  `fetch('/api/generated-turbo');
`,
);

await writeFixtureFile(
  testRoot,
  '.vercel/generatedApi.ts',
  `fetch('/api/generated-vercel');
`,
);

await writeFixtureFile(
  testRoot,
  'coverage/generatedApi.ts',
  `fetch('/api/generated-coverage');
`,
);

await writeFixtureFile(
  testRoot,
  'public/build/generatedApi.js',
  `fetch('/api/generated-public-build');
`,
);

const stackDetector = new ProjectStackDetector();
const stackResult = await stackDetector.detect(testRoot);

assertNoGeneratedPath(stackResult.detectedFiles, 'ProjectStackDetector detectedFiles');

const apiClientScanner = new ApiClientScanner();
const apiClientResult = await apiClientScanner.scan(testRoot);

assertNoGeneratedPath(apiClientResult.clientFiles, 'ApiClientScanner clientFiles');
assertNoGeneratedPath(
  apiClientResult.functions.map((item) => item.sourceFile),
  'ApiClientScanner functions',
);

const routeScanner = new ExpressRouteScanner();
const routeMap = await routeScanner.scan(testRoot);

assertNoGeneratedPath(routeMap.routeFiles, 'ExpressRouteScanner routeFiles');
assertNoGeneratedPath(routeMap.controllerFiles, 'ExpressRouteScanner controllerFiles');
assertNoGeneratedPath(routeMap.middlewareFiles, 'ExpressRouteScanner middlewareFiles');
assertNoGeneratedPath(
  routeMap.routes.map((route) => route.sourceFile),
  'ExpressRouteScanner routes',
);

const fetchScanner = new FetchUsageScanner();
const fetchResult = await fetchScanner.scan(testRoot);

assertNoGeneratedPath(
  fetchResult.usages.map((usage) => usage.sourceFile),
  'FetchUsageScanner usages',
);

const indexer = new FileIndexer({
  rootDir: testRoot,
});

const indexedFiles = await indexer.indexProject();

assertNoGeneratedPath(
  indexedFiles.map((file) => file.path),
  'FileIndexer indexed files',
);

const planGenerator = new RuntimePlanGenerator();
const planResult = planGenerator.generate({
  sessionId: 'session-generated-output-exclusion-test',
  projectRoot: testRoot,
  projectName: 'generated-output-fixture',
  instruction: 'Analyze frontend and backend API routes without using generated output folders.',
  workspaceMode: 'local_snapshot',
  stack: ['react', 'express', 'typescript'],
  knownFiles: [
    '.open-next/.build/durable-objects/queue.js',
    '.next/server/app/api/generated.js',
    'dist/routes/generatedRoutes.js',
    'build/client/generatedApi.js',
    'out/generatedApi.js',
    '.cache/generatedApi.ts',
    '.turbo/generatedApi.ts',
    '.vercel/generatedApi.ts',
    'coverage/generatedApi.ts',
    'public/build/generatedApi.js',
    'src/components/ProfileCard.tsx',
    'src/api/profileApi.ts',
  ],
});

assertNoGeneratedPath(
  planResult.plan.scope.candidateFiles.map((file) => file.path),
  'RuntimePlanGenerator candidate files',
);

assert(
  planResult.plan.scope.candidateFiles.some(
    (file) => file.path === 'src/components/ProfileCard.tsx',
  ),
  'Expected RuntimePlanGenerator to preserve safe source candidate files.',
);

const patchCandidateResolver = new PatchCandidateResolver();
const resolvedPatchCandidates = await patchCandidateResolver.resolve({
  projectRoot: testRoot,
  maxFiles: 20,
  candidates: [
    {
      path: '.open-next',
      existsKnown: true,
      reason: 'Generated output should be ignored.',
    },
    {
      path: '.next',
      existsKnown: true,
      reason: 'Generated output should be ignored.',
    },
    {
      path: 'dist',
      existsKnown: true,
      reason: 'Generated output should be ignored.',
    },
    {
      path: 'build',
      existsKnown: true,
      reason: 'Generated output should be ignored.',
    },
    {
      path: 'out',
      existsKnown: true,
      reason: 'Generated output should be ignored.',
    },
    {
      path: '.cache',
      existsKnown: true,
      reason: 'Generated output should be ignored.',
    },
    {
      path: 'public/build',
      existsKnown: true,
      reason: 'Generated output should be ignored.',
    },
    {
      path: 'src',
      existsKnown: true,
      reason: 'Safe source directory should be considered.',
    },
  ],
});

assertNoGeneratedPath(
  resolvedPatchCandidates.map((candidate) => candidate.path),
  'PatchCandidateResolver resolved candidates',
);

assert(
  resolvedPatchCandidates.some((candidate) => candidate.path === 'src/components/ProfileCard.tsx'),
  'Expected PatchCandidateResolver to resolve safe source files.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'generated-output-exclusion-test',
      checked: {
        stackDetectedFiles: stackResult.detectedFiles.length,
        apiClientFiles: apiClientResult.clientFiles.length,
        apiClientFunctions: apiClientResult.functions.length,
        routeFiles: routeMap.routeFiles.length,
        routes: routeMap.routes.length,
        fetchUsages: fetchResult.usages.length,
        indexedFiles: indexedFiles.length,
        planCandidateFiles: planResult.plan.scope.candidateFiles.length,
        resolvedPatchCandidates: resolvedPatchCandidates.length,
      },
    },
    null,
    2,
  ),
);
