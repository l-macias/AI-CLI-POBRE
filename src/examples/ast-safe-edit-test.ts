import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ASTEditTool } from '../ast-edit/ASTEditTool.js';
import { Logger } from '../observability/Logger.js';
import type { ASTEditToolOutput } from '../types/ASTEditTypes.js';
import type { ToolExecutionRequest, ToolExecutionResult } from '../types/ToolTypes.js';
import { ToolExecutionValidator } from '../tools/ToolExecutionValidator.js';
import { ToolPermissionManager } from '../tools/ToolPermissionManager.js';
import { ToolPermissionPolicy } from '../tools/ToolPermissionPolicy.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { ToolRuntimeExecutor } from '../tools/ToolRuntimeExecutor.js';
import { DiffFileTool } from '../tools/filesystem/DiffFileTool.js';

const logger = new Logger({
  namespace: 'zero-runtime:ast-safe-edit-test',
  level: 'debug',
});

const testDirectory = '.runtime/ast-edit-tests';
const testTarget = `${testDirectory}/sample.ts`;

let requestSequence = 0;

function createRequest(input: { toolName: string; requestInput: unknown }): ToolExecutionRequest {
  requestSequence += 1;

  return {
    id: `ast-edit-request-${new Date()
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

function getASTEditOutput(result: ToolExecutionResult): ASTEditToolOutput {
  if (typeof result.output === 'object' && result.output !== null) {
    return result.output as ASTEditToolOutput;
  }

  throw new Error('Expected AST edit output object.');
}

async function main(): Promise<void> {
  await resetTestDirectory();

  await writeFile(
    path.resolve(process.cwd(), testTarget),
    [
      "import { Logger } from '../observability/Logger.js';",
      '',
      'export function greet(name: string): string {',
      '  return `Hello ${name}`;',
      '}',
      '',
      'export { greet };',
      '',
    ].join('\n'),
    'utf8',
  );

  const registry = new ToolRegistry();

  registry.register(new ASTEditTool());
  registry.register(new DiffFileTool());

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

  const originalContent = await readFile(path.resolve(process.cwd(), testTarget), 'utf8');

  const addImportResult = await executor.execute(
    createRequest({
      toolName: 'ast_edit_preview',
      requestInput: {
        intent: {
          kind: 'add_import',
          targetFilePath: testTarget,
          importStatement:
            "import { ContextRetriever } from '../../src/retrieval/ContextRetriever.js'",
        },
      },
    }),
  );

  const addImportOutput = getASTEditOutput(addImportResult);

  const diffResult = await executor.execute(
    createRequest({
      toolName: 'diff_file',
      requestInput: addImportOutput.preview.diffFileInput,
    }),
  );

  const replaceBodyResult = await executor.execute(
    createRequest({
      toolName: 'ast_edit_preview',
      requestInput: {
        intent: {
          kind: 'replace_function_body',
          targetFilePath: testTarget,
          functionName: 'greet',
          replacementBody: 'return `Hi ${name}`;',
        },
      },
    }),
  );

  const missingFunctionResult = await executor.execute(
    createRequest({
      toolName: 'ast_edit_preview',
      requestInput: {
        intent: {
          kind: 'replace_function_body',
          targetFilePath: testTarget,
          functionName: 'missingFunction',
          replacementBody: 'return true;',
        },
      },
    }),
  );

  const afterPreviewContent = await readFile(path.resolve(process.cwd(), testTarget), 'utf8');

  logger.info('AST safe edit test completed', {
    addImportResult,
    diffResult,
    replaceBodyResult,
    missingFunctionResult,
  });

  if (addImportResult.status !== 'executed') {
    throw new Error('Expected add import preview to execute.');
  }

  if (!addImportOutput.changed) {
    throw new Error('Expected add import preview to propose a change.');
  }

  if (!addImportOutput.preview.proposedContent.includes('ContextRetriever')) {
    throw new Error('Expected proposed content to include new import.');
  }

  if (diffResult.status !== 'executed') {
    throw new Error('Expected diff_file to execute using structured edit preview.');
  }

  if (replaceBodyResult.status !== 'executed') {
    throw new Error('Expected replace function body preview to execute.');
  }

  if (missingFunctionResult.status !== 'rejected') {
    throw new Error('Expected missing function edit to be rejected.');
  }

  if (afterPreviewContent !== originalContent) {
    throw new Error('AST edit preview must not modify the file.');
  }

  logger.info('Session 24.5 AST safe edit test passed');
}

async function resetTestDirectory(): Promise<void> {
  const absolutePath = path.resolve(process.cwd(), testDirectory);

  await rm(absolutePath, {
    recursive: true,
    force: true,
  });

  await mkdir(absolutePath, {
    recursive: true,
  });
}

main().catch((error: unknown) => {
  logger.error('AST safe edit test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
