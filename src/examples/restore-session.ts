import { Logger } from '../observability/Logger.js';
import { SessionCheckpoint } from '../session/SessionCheckpoint.js';
import { SessionRestorer } from '../session/SessionRestorer.js';

const logger = new Logger({
  namespace: 'zero-runtime:restore-session',
  level: 'debug',
});

async function main(): Promise<void> {
  const restorer = new SessionRestorer();
  const checkpointManager = new SessionCheckpoint();

  const restored = await restorer.restore();

  logger.info('Session restored', {
    compactSummaryLength: restored.compactSummary.length,
    hasCurrentState: Boolean(restored.currentState),
    hasHandoff: Boolean(restored.handoff),
  });

  const checkpoint = await checkpointManager.create({
    projectName: 'Zero Runtime',
    sessionName: 'Session 005 - Session Restore + Checkpoints',
    activeModule: 'Session Restore',
    summary:
      'Created a checkpoint from current .runtime markdown files after restoring local session context.',
  });

  const checkpoints = await checkpointManager.list();

  logger.info('Checkpoint created', {
    checkpointId: checkpoint.id,
    checkpointCount: checkpoints.length,
  });
}

main().catch((error: unknown) => {
  logger.error('Restore session failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
