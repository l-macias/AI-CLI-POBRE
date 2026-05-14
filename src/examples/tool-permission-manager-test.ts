import { Logger } from '../observability/Logger.js';
import type { ToolExecutionRequest } from '../types/ToolTypes.js';
import { ToolPermissionManager } from '../tools/ToolPermissionManager.js';

const logger = new Logger({
  namespace: 'zero-runtime:tool-permission-manager-test',
  level: 'debug',
});

let requestSequence = 0;

function createRequest(input: { toolName: string; requestInput: unknown }): ToolExecutionRequest {
  requestSequence += 1;

  return {
    id: `guard-request-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}-${String(requestSequence).padStart(3, '0')}`,
    toolName: input.toolName,
    input: input.requestInput,
    proposedBy: 'model',
    requestedAt: new Date().toISOString(),
  };
}

function main(): void {
  const manager = new ToolPermissionManager({
    allowedPermissions: ['read'],
  });

  const allowedRead = manager.check({
    request: createRequest({
      toolName: 'inspect_project_file',
      requestInput: {
        target: 'src/core/AgentRuntime.ts',
      },
    }),
    requiredPermissions: ['read'],
    estimatedTokens: 500,
    maxTokens: 1000,
    estimatedContextTokens: 1000,
    maxContextTokens: 1500,
  });

  const deniedWrite = manager.check({
    request: createRequest({
      toolName: 'write_project_file',
      requestInput: {
        target: 'src/core/AgentRuntime.ts',
      },
    }),
    requiredPermissions: ['write'],
  });

  const protectedFile = manager.check({
    request: createRequest({
      toolName: 'inspect_project_file',
      requestInput: {
        target: '.env',
      },
    }),
    requiredPermissions: ['read'],
  });

  const dangerousCommand = manager.check({
    request: createRequest({
      toolName: 'run_command',
      requestInput: {
        command: 'rm -rf .',
      },
    }),
    requiredPermissions: ['execute'],
  });

  const tokenLimitExceeded = manager.check({
    request: createRequest({
      toolName: 'inspect_project_file',
      requestInput: {
        target: 'src/core/AgentRuntime.ts',
      },
    }),
    requiredPermissions: ['read'],
    estimatedTokens: 2000,
    maxTokens: 1000,
  });

  const contextOverflow = manager.check({
    request: createRequest({
      toolName: 'inspect_project_file',
      requestInput: {
        target: 'src/core/AgentRuntime.ts',
      },
    }),
    requiredPermissions: ['read'],
    estimatedContextTokens: 2000,
    maxContextTokens: 1500,
  });

  logger.info('Tool permission manager test completed', {
    allowedRead,
    deniedWrite,
    protectedFile,
    dangerousCommand,
    tokenLimitExceeded,
    contextOverflow,
  });

  if (!allowedRead.allowed) {
    throw new Error('Expected read request to be allowed.');
  }

  if (deniedWrite.allowed) {
    throw new Error('Expected write request to be denied.');
  }

  if (protectedFile.allowed) {
    throw new Error('Expected protected file request to be denied.');
  }

  if (dangerousCommand.allowed) {
    throw new Error('Expected dangerous command request to be denied.');
  }

  if (tokenLimitExceeded.allowed) {
    throw new Error('Expected token limit request to be denied.');
  }

  if (contextOverflow.allowed) {
    throw new Error('Expected context overflow request to be denied.');
  }
}

try {
  main();
} catch (error: unknown) {
  logger.error('Tool permission manager test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
}
