import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RuntimeWorkflowOrchestrator } from '../workflow/RuntimeWorkflowOrchestrator.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/runtime-workflow-orchestrator-test');
const projectRoot = path.join(testRoot, 'project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(projectRoot, 'src', 'routes'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'src', 'controllers'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'src', 'api'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'prisma'), {
  recursive: true,
});

await writeFile(
  path.join(projectRoot, 'package.json'),
  JSON.stringify(
    {
      type: 'module',
      scripts: {
        build: 'echo build-ok',
        lint: 'echo lint-ok',
        typecheck: 'echo typecheck-ok',
      },
      dependencies: {
        '@prisma/client': '^5.0.0',
        express: '^4.0.0',
        pg: '^8.0.0',
        react: '^19.0.0',
        vite: '^6.0.0',
      },
      devDependencies: {
        prisma: '^5.0.0',
        typescript: '^5.0.0',
      },
    },
    null,
    2,
  ),
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        strict: true,
      },
    },
    null,
    2,
  ),
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'routes', 'profileRoutes.ts'),
  [
    "import { Router } from 'express';",
    "import { getProfile } from '../controllers/profileController';",
    'const router = Router();',
    "router.get('/api/profile', getProfile);",
    'export default router;',
  ].join('\n'),
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'controllers', 'profileController.ts'),
  'export function getProfile() { return true; }\n',
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'api', 'profileApi.ts'),
  "export async function getProfile() { return fetch('/api/profile'); }\n",
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'prisma', 'schema.prisma'),
  'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n',
  'utf8',
);

const orchestrator = new RuntimeWorkflowOrchestrator({
  taskQueue: undefined,
});

const result = await orchestrator.prepare({
  sessionId: 'session-81-e-test',
  projectRoot,
  projectName: 'workflow-project',
  objective: 'Improve profile flow frontend and backend safely',
  workspaceMode: 'local_snapshot',
});

assert(result.workflowStatus === 'prepared', 'workflow should be prepared');
assert(result.tasks.tasks.length >= 6, 'workflow should create default tasks');
assert(result.taskProgress.total >= 6, 'workflow progress should include tasks');
assert(result.stack.stack.includes('react'), 'workflow should detect React');
assert(result.stack.stack.includes('express'), 'workflow should detect Express');
assert(result.stack.stack.includes('pern'), 'workflow should detect PERN');
assert(result.apiRoutes.routes.length === 1, 'workflow should map backend route');
assert(result.frontendBackend.links.length === 1, 'workflow should link frontend backend usage');
assert(result.questions.questions.length >= 1, 'workflow should generate runtime questions');
assert(result.suggestions.length >= 1, 'workflow should generate suggestions');
assert(
  result.verifyScripts?.safeVerifyScripts.includes('build') === true,
  'workflow should detect build script',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-workflow-orchestrator-test',
      workflow: {
        sessionId: result.sessionId,
        stack: result.stack.stack,
        tasks: result.tasks.tasks.length,
        routes: result.apiRoutes.routes.length,
        links: result.frontendBackend.links.length,
        questions: result.questions.questions.length,
        suggestions: result.suggestions.length,
        verifyScripts: result.verifyScripts?.safeVerifyScripts ?? [],
      },
    },
    null,
    2,
  ),
);
