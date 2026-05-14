import { rm } from 'node:fs/promises';
import path from 'node:path';
import { AgentRuntime } from '../core/AgentRuntime.js';

async function main(): Promise<void> {
  await resetLoopTestDirectory();

  const runtime = new AgentRuntime();

  await runtime.initialize();

  const result = await runtime.runRuntimeLoopOnce({
    objective: {
      objective:
        'Create one safe runtime loop test file under .runtime/loop-tests using create_file.',
      module: 'Runtime Loop v1',
    },
    maxSteps: 1,
    autoApprove: true,
  });

  console.log(result);

  if (result.state.status !== 'completed') {
    throw new Error(`Expected loop status "completed", received "${result.state.status}".`);
  }

  if (!result.state.stepResult && !result.state.sequentialResult) {
    throw new Error('Expected runtime loop to execute at least one step.');
  }

  console.log('\nSession 20 runtime loop test completed.');
}

async function resetLoopTestDirectory(): Promise<void> {
  const absolutePath = path.resolve(process.cwd(), '.runtime/loop-tests');

  await rm(absolutePath, {
    recursive: true,
    force: true,
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
