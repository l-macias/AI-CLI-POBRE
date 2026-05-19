import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Logger } from '../observability/Logger.js';
import { TargetProjectManager } from '../workspace/TargetProjectManager.js';
import { TargetProjectResolver } from '../workspace/TargetProjectResolver.js';
import { WorkspaceConfigLoader } from '../workspace/WorkspaceConfigLoader.js';

const logger = new Logger({
  namespace: 'zero-runtime:workspace-config-test',
  level: 'debug',
});

async function main(): Promise<void> {
  const workspaceRoot = resolve('.runtime/workspace-tests/runtime-root');
  const targetRoot = resolve('.runtime/workspace-tests/target-project');

  await rm(resolve('.runtime/workspace-tests'), {
    recursive: true,
    force: true,
  });

  await mkdir(targetRoot, {
    recursive: true,
  });

  await writeFile(resolve(targetRoot, 'package.json'), '{"name":"target-project"}\n', 'utf8');

  const loader = new WorkspaceConfigLoader();
  const manager = new TargetProjectManager();
  const resolver = new TargetProjectResolver({
    manager,
  });

  const emptyConfig = await loader.load(workspaceRoot);

  if (emptyConfig.projects.length !== 0) {
    throw new Error('Expected empty workspace config when file is missing.');
  }

  const addedConfig = await manager.add(
    {
      name: 'Target Project',
      rootPath: targetRoot,
    },
    workspaceRoot,
  );

  if (addedConfig.currentProjectId !== 'target-project') {
    throw new Error('Expected added project to become current.');
  }

  if (addedConfig.projects.length !== 1) {
    throw new Error('Expected one target project.');
  }

  const currentProject = await manager.current(workspaceRoot);

  if (!currentProject || currentProject.name !== 'Target Project') {
    throw new Error('Expected current project to resolve.');
  }

  const explicitResolution = await resolver.resolve({
    explicitProjectRoot: targetRoot,
    workspaceRoot,
  });

  if (explicitResolution.source !== 'explicit') {
    throw new Error('Expected explicit project root to win.');
  }

  const workspaceResolution = await resolver.resolve({
    workspaceRoot,
  });

  if (workspaceResolution.source !== 'workspace_current') {
    throw new Error('Expected workspace current project resolution.');
  }

  if (workspaceResolution.projectRoot !== targetRoot) {
    throw new Error('Expected workspace current project root.');
  }

  const usedConfig = await manager.use(
    {
      projectRef: 'Target Project',
    },
    workspaceRoot,
  );

  if (usedConfig.currentProjectId !== 'target-project') {
    throw new Error('Expected project use by name.');
  }

  const removedConfig = await manager.remove(
    {
      projectRef: 'target-project',
    },
    workspaceRoot,
  );

  if (removedConfig.projects.length !== 0) {
    throw new Error('Expected project removal.');
  }

  if (removedConfig.currentProjectId !== null) {
    throw new Error('Expected current project to be cleared after removal.');
  }

  logger.info('Workspace config test completed', {
    workspaceRoot,
    targetRoot,
    addedProjectId: addedConfig.currentProjectId,
    explicitResolution,
    workspaceResolution,
  });

  logger.info('Session 35 workspace config test passed');
}

main().catch((error: unknown) => {
  logger.error('Workspace config test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
