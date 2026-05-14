import { Logger } from '../observability/Logger.js';
import type { ToolDefinition, ToolExecutionRequest } from '../types/ToolTypes.js';
import { ToolExecutionValidator } from '../tools/ToolExecutionValidator.js';
import { ToolPermissionPolicy } from '../tools/ToolPermissionPolicy.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { inspectOnlyToolInputSchema } from '../tools/ToolSchemas.js';

const logger = new Logger({
  namespace: 'zero-runtime:tool-contract-test',
  level: 'debug',
});

let requestSequence = 0;

function createRequest(input: {
  toolName: string;
  input: unknown;
  proposedBy: ToolExecutionRequest['proposedBy'];
}): ToolExecutionRequest {
  requestSequence += 1;

  return {
    id: `tool-request-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}-${String(requestSequence).padStart(3, '0')}`,
    toolName: input.toolName,
    input: input.input,
    proposedBy: input.proposedBy,
    requestedAt: new Date().toISOString(),
  };
}

function main(): void {
  const registry = new ToolRegistry();

  const inspectProjectFileTool: ToolDefinition<typeof inspectOnlyToolInputSchema> = {
    name: 'inspect_project_file',
    description:
      'Contract-only inspect tool placeholder. It validates intent shape but does not read files.',
    permissions: ['read'],
    inputSchema: inspectOnlyToolInputSchema,
  };

  const writeProjectFileTool: ToolDefinition<typeof inspectOnlyToolInputSchema> = {
    name: 'write_project_file',
    description:
      'Contract-only write tool placeholder. It validates permission rejection but does not write files.',
    permissions: ['write'],
    inputSchema: inspectOnlyToolInputSchema,
  };

  registry.register(inspectProjectFileTool);
  registry.register(writeProjectFileTool);

  const validator = new ToolExecutionValidator({
    registry,
    permissionPolicy: new ToolPermissionPolicy({
      allowedPermissions: ['read'],
    }),
  });

  logger.info('Starting tool contract test', {
    registeredTools: registry.list().map((tool) => ({
      name: tool.name,
      permissions: tool.permissions,
    })),
  });

  const validReadRequest = createRequest({
    toolName: 'inspect_project_file',
    input: {
      target: 'src/core/AgentRuntime.ts',
    },
    proposedBy: 'model',
  });

  const invalidSchemaRequest = createRequest({
    toolName: 'inspect_project_file',
    input: {
      wrong: 'src/core/AgentRuntime.ts',
    },
    proposedBy: 'model',
  });

  const deniedPermissionRequest = createRequest({
    toolName: 'write_project_file',
    input: {
      target: 'src/core/AgentRuntime.ts',
    },
    proposedBy: 'model',
  });

  const unknownToolRequest = createRequest({
    toolName: 'unknown_tool',
    input: {},
    proposedBy: 'model',
  });

  const validReadResult = validator.validate(validReadRequest);
  const invalidSchemaResult = validator.validate(invalidSchemaRequest);
  const deniedPermissionResult = validator.validate(deniedPermissionRequest);
  const unknownToolResult = validator.validate(unknownToolRequest);

  logger.info('Tool contract test completed', {
    validReadResult,
    invalidSchemaResult,
    deniedPermissionResult,
    unknownToolResult,
  });

  if (!validReadResult.valid) {
    throw new Error('Expected read request to be valid.');
  }

  if (invalidSchemaResult.valid) {
    throw new Error('Expected invalid schema request to be rejected.');
  }

  if (deniedPermissionResult.valid) {
    throw new Error('Expected denied permission request to be rejected.');
  }

  if (unknownToolResult.valid) {
    throw new Error('Expected unknown tool request to be rejected.');
  }
}

try {
  main();
} catch (error: unknown) {
  logger.error('Tool contract test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
}
