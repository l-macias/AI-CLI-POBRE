import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ProjectStackDetector } from '../languages/ProjectStackDetector.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/mern-pern-project-intelligence-test');
const projectRoot = path.join(testRoot, 'project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(projectRoot, 'src', 'components'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'src', 'routes'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'src', 'controllers'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'src', 'middlewares'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'src', 'services'), {
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
  path.join(projectRoot, 'src', 'main.tsx'),
  "import React from 'react';\nimport { App } from './components/App';\n",
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'components', 'App.tsx'),
  'export function App() { return <div>Hello</div>; }\n',
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'server.ts'),
  "import express from 'express';\nconst app = express();\napp.listen(3000);\n",
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'routes', 'profileRoutes.ts'),
  "import { Router } from 'express';\nimport { updateProfile } from '../controllers/profileController';\nconst router = Router();\nrouter.post('/api/profile', updateProfile);\nexport default router;\n",
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'controllers', 'profileController.ts'),
  "import { prisma } from '../services/prisma';\nexport async function updateProfile() { return prisma.user.update({}); }\n",
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'middlewares', 'authMiddleware.ts'),
  'export function authMiddleware() { return true; }\n',
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'services', 'prisma.ts'),
  "import { PrismaClient } from '@prisma/client';\nexport const prisma = new PrismaClient();\n",
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'prisma', 'schema.prisma'),
  'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n',
  'utf8',
);

const detector = new ProjectStackDetector();

const result = await detector.detect(projectRoot);

assert(result.stack.includes('react'), 'should detect React');
assert(result.stack.includes('vite'), 'should detect Vite');
assert(result.stack.includes('express'), 'should detect Express');
assert(result.stack.includes('postgresql'), 'should detect PostgreSQL');
assert(result.stack.includes('prisma'), 'should detect Prisma');
assert(result.stack.includes('pern'), 'should detect PERN');
assert(result.typescript.hasTypeScript, 'should detect TypeScript');
assert(result.typescript.strictLikely, 'should detect strict TypeScript');
assert(result.react.componentFiles.length >= 1, 'should detect React components');
assert(result.express.routeFiles.length >= 1, 'should detect route files');
assert(result.express.controllerFiles.length >= 1, 'should detect controller files');
assert(result.express.middlewareFiles.length >= 1, 'should detect middleware files');
assert(result.postgres.prismaSchemaFiles.length === 1, 'should detect Prisma schema');
assert(result.postgres.queryFiles.length >= 1, 'should detect Prisma query usage');
assert(result.postgres.envUsageFiles.length >= 1, 'should detect env/database usage');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'mern-pern-project-intelligence-test',
      stack: result.stack,
      react: {
        components: result.react.componentFiles,
        entries: result.react.appEntryFiles,
      },
      express: {
        routes: result.express.routeFiles,
        controllers: result.express.controllerFiles,
        middlewares: result.express.middlewareFiles,
        entries: result.express.serverEntryFiles,
      },
      postgres: {
        prismaSchemas: result.postgres.prismaSchemaFiles,
        queryFiles: result.postgres.queryFiles,
        envUsageFiles: result.postgres.envUsageFiles,
      },
    },
    null,
    2,
  ),
);
