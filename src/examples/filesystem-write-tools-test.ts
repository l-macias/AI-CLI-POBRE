import { Logger } from '../observability/Logger.js';
import type { ToolExecutionRequest, ToolExecutionResult } from '../types/ToolTypes.js';
import { ToolExecutionValidator } from '../tools/ToolExecutionValidator.js';
import { ToolPermissionManager } from '../tools/ToolPermissionManager.js';
import { ToolPermissionPolicy } from '../tools/ToolPermissionPolicy.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { ToolRuntimeExecutor } from '../tools/ToolRuntimeExecutor.js';
import { createReadOnlyFilesystemTools } from '../tools/filesystem/createReadOnlyFilesystemTools.js';
import { createWriteControlledFilesystemTools } from '../tools/filesystem/createWriteControlledFilesystemTools.js';

const logger = new Logger({
  namespace: 'zero-runtime:filesystem-write-tools-test',
  level: 'debug',
});

let requestSequence = 0;

function createRequest(input: { toolName: string; requestInput: unknown }): ToolExecutionRequest {
  requestSequence += 1;

  return {
    id: `write-tool-request-${new Date()
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

function getOutputRecord(result: ToolExecutionResult): Record<string, unknown> {
  if (typeof result.output === 'object' && result.output !== null) {
    return result.output as Record<string, unknown>;
  }

  throw new Error(`Expected output object for ${result.toolName}.`);
}

async function main(): Promise<void> {
  const registry = new ToolRegistry();

  for (const tool of createReadOnlyFilesystemTools()) {
    registry.register(tool);
  }

  for (const tool of createWriteControlledFilesystemTools()) {
    registry.register(tool);
  }

  const validator = new ToolExecutionValidator({
    registry,
    permissionPolicy: new ToolPermissionPolicy({
      allowedPermissions: ['read', 'write'],
    }),
  });

  const permissionManager = new ToolPermissionManager({
    allowedPermissions: ['read', 'write'],
  });

  const executor = new ToolRuntimeExecutor({
    validator,
    permissionManager,
  });

  const testTarget = `.runtime/write-tests/session-17-${new Date()
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replaceAll('.', '')}.txt`;

  const createResult = await executor.execute(
    createRequest({
      toolName: 'create_file',
      requestInput: {
        target: testTarget,
        content: 'initial content\n',
      },
    }),
  );

  const diffResult = await executor.execute(
    createRequest({
      toolName: 'diff_file',
      requestInput: {
        target: testTarget,
        compareContent: 'edited content\n',
      },
    }),
  );

  const editResult = await executor.execute(
    createRequest({
      toolName: 'edit_file',
      requestInput: {
        target: testTarget,
        expectedCurrentContent: 'initial content\n',
        newContent: 'edited content\n',
        diffConfirmed: true,
      },
    }),
  );

  const backupResult = await executor.execute(
    createRequest({
      toolName: 'backup_file',
      requestInput: {
        target: testTarget,
        reason: 'session 17 write-controlled test backup',
      },
    }),
  );

  const editOutput = getOutputRecord(editResult);
  const backupPath = editOutput['backupPath'];

  if (typeof backupPath !== 'string') {
    throw new Error('Expected edit_file output to include backupPath.');
  }

  const restoreResult = await executor.execute(
    createRequest({
      toolName: 'restore_checkpoint',
      requestInput: {
        target: testTarget,
        backupPath,
        restoreConfirmed: true,
      },
    }),
  );

  const protectedCreateResult = await executor.execute(
    createRequest({
      toolName: 'create_file',
      requestInput: {
        target: '.env',
        content: 'SHOULD_NOT_WRITE=true\n',
      },
    }),
  );

  const unconfirmedEditResult = await executor.execute(
    createRequest({
      toolName: 'edit_file',
      requestInput: {
        target: testTarget,
        newContent: 'should not edit\n',
        diffConfirmed: false,
      },
    }),
  );

  logger.info('Filesystem write-controlled tools test completed', {
    createResult,
    diffResult,
    editResult,
    backupResult,
    restoreResult,
    protectedCreateResult,
    unconfirmedEditResult,
  });

  if (createResult.status !== 'executed') {
    throw new Error('Expected create_file to execute.');
  }

  if (diffResult.status !== 'executed') {
    throw new Error('Expected diff_file to execute before edit.');
  }

  if (editResult.status !== 'executed') {
    throw new Error('Expected edit_file to execute.');
  }

  if (backupResult.status !== 'executed') {
    throw new Error('Expected backup_file to execute.');
  }

  if (restoreResult.status !== 'executed') {
    throw new Error('Expected restore_checkpoint to execute.');
  }

  if (protectedCreateResult.status !== 'not_executed') {
    throw new Error('Expected protected create_file to be blocked before execution.');
  }

  if (unconfirmedEditResult.status !== 'not_executed') {
    throw new Error('Expected unconfirmed edit_file to be rejected by schema validation.');
  }
}

main().catch((error: unknown) => {
  logger.error('Filesystem write-controlled tools test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
