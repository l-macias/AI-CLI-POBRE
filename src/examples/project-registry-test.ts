import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ProjectRegistry } from '../projects/ProjectRegistry.js';
import { ProjectScanner } from '../projects/ProjectScanner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/project-registry-test');
const workspaceRoot = path.join(testRoot, 'workspace');
const projectRoot = path.join(testRoot, 'micafecito');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(projectRoot, 'src'), {
  recursive: true,
});

await mkdir(path.join(projectRoot, 'prisma'), {
  recursive: true,
});

await writeFile(
  path.join(projectRoot, 'package.json'),
  JSON.stringify(
    {
      name: 'micafecito',
      dependencies: {
        '@prisma/client': '^5.0.0',
        express: '^4.0.0',
        pg: '^8.0.0',
        react: '^18.0.0',
        vite: '^5.0.0',
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

await writeFile(path.join(projectRoot, 'tsconfig.json'), '{}\n', 'utf8');
await writeFile(path.join(projectRoot, 'package-lock.json'), '{}\n', 'utf8');
await writeFile(
  path.join(projectRoot, 'prisma', 'schema.prisma'),
  'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n',
  'utf8',
);

const scanner = new ProjectScanner();
const registry = new ProjectRegistry({
  workspaceRoot,
});

const scanned = await scanner.scan({
  rootPath: projectRoot,
  name: 'micafecito',
});

assert(scanned.profile.id === 'micafecito', 'project id should be normalized');
assert(scanned.profile.stack.includes('react'), 'project should detect React');
assert(scanned.profile.stack.includes('express'), 'project should detect Express');
assert(scanned.profile.stack.includes('postgresql'), 'project should detect PostgreSQL');
assert(scanned.profile.stack.includes('prisma'), 'project should detect Prisma');
assert(scanned.profile.stack.includes('pern'), 'project should detect PERN');
assert(
  scanned.profile.workingMode === 'local_snapshot',
  'default working mode should be local_snapshot',
);
assert(scanned.profile.gitRequired === false, 'git should not be required by default');

const localConfigRaw = await readFile(scanned.configPath, 'utf8');
const localConfig = JSON.parse(localConfigRaw) as unknown;

assert(
  typeof localConfig === 'object' && localConfig !== null,
  'local config should be JSON object',
);

const added = await registry.add(scanned.profile);

assert(added.projects.length === 1, 'registry should include one project');
assert(added.currentProjectId === 'micafecito', 'added project should become current');

const current = await registry.current();

assert(current?.id === 'micafecito', 'registry should resolve current project');

const listed = await registry.list();

assert(listed.projects.length === 1, 'registry list should persist project');

const used = await registry.use('micafecito');

assert(used.currentProjectId === 'micafecito', 'registry should use project by id');

const removed = await registry.remove('micafecito');

assert(removed.projects.length === 0, 'registry should remove project');
assert(removed.currentProjectId === null, 'current project should clear after removal');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'project-registry-test',
      projectId: scanned.profile.id,
      stack: scanned.profile.stack,
      packageManager: scanned.profile.packageManager,
      configPath: scanned.configPath,
      registryPath: registry.resolveRegistryPath(),
    },
    null,
    2,
  ),
);
