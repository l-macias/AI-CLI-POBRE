import { Logger } from '../observability/Logger.js';
import type { ToolExecutionRequest } from '../types/ToolTypes.js';
import { ToolExecutionValidator } from '../tools/ToolExecutionValidator.js';
import { ToolPermissionManager } from '../tools/ToolPermissionManager.js';
import { ToolPermissionPolicy } from '../tools/ToolPermissionPolicy.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { ToolRuntimeExecutor } from '../tools/ToolRuntimeExecutor.js';
import { createReadOnlyFilesystemTools } from '../tools/filesystem/createReadOnlyFilesystemTools.js';

const logger = new Logger({
  namespace: 'zero-runtime:filesystem-readonly-tools-test',
  level: 'debug',
});

let requestSequence = 0;

function createRequest(input: { toolName: string; requestInput: unknown }): ToolExecutionRequest {
  requestSequence += 1;

  return {
    id: `readonly-tool-request-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}-${String(requestSequence).padStart(3, '0')}`,
    toolName: input.toolName,
    input: input.requestInput,
    proposedBy: 'runtime',
    requestedAt: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  const registry = new ToolRegistry();

  for (const tool of createReadOnlyFilesystemTools()) {
    registry.register(tool);
  }

  const validator = new ToolExecutionValidator({
    registry,
    permissionPolicy: new ToolPermissionPolicy({
      allowedPermissions: ['read'],
    }),
  });

  const permissionManager = new ToolPermissionManager({
    allowedPermissions: ['read'],
  });

  const executor = new ToolRuntimeExecutor({
    validator,
    permissionManager,
  });

  const readResult = await executor.execute(
    createRequest({
      toolName: 'read_file',
      requestInput: {
        target: 'package.json',
        maxBytes: 100_000,
      },
    }),
  );

  const listResult = await executor.execute(
    createRequest({
      toolName: 'list_directory',
      requestInput: {
        target: 'src',
        recursive: false,
        maxEntries: 50,
      },
    }),
  );

  const searchResult = await executor.execute(
    createRequest({
      toolName: 'search_files',
      requestInput: {
        target: 'src',
        query: 'Tool',
        maxResults: 25,
      },
    }),
  );

  const diffResult = await executor.execute(
    createRequest({
      toolName: 'diff_file',
      requestInput: {
        target: 'package.json',
        compareContent: '{}',
        maxBytes: 100_000,
      },
    }),
  );

  const protectedReadResult = await executor.execute(
    createRequest({
      toolName: 'read_file',
      requestInput: {
        target: '.env',
      },
    }),
  );

  logger.info('Filesystem read-only tools test completed', {
    readResult,
    listResult,
    searchResult,
    diffResult,
    protectedReadResult,
  });

  if (readResult.status !== 'executed') {
    throw new Error('Expected read_file to execute.');
  }

  if (listResult.status !== 'executed') {
    throw new Error('Expected list_directory to execute.');
  }

  if (searchResult.status !== 'executed') {
    throw new Error('Expected search_files to execute.');
  }

  if (diffResult.status !== 'executed') {
    throw new Error('Expected diff_file to execute.');
  }

  if (protectedReadResult.status !== 'not_executed') {
    throw new Error('Expected protected read to be blocked before execution.');
  }
}

main().catch((error: unknown) => {
  logger.error('Filesystem read-only tools test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
