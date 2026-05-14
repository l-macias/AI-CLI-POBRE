import { Logger } from '../observability/Logger.js';
import { OperationalStateManager } from '../session/OperationalStateManager.js';

const logger = new Logger({
  namespace: 'zero-runtime:session-state-test',
  level: 'debug',
});

async function main(): Promise<void> {
  const stateManager = new OperationalStateManager();

  await stateManager.writeCurrentState({
    projectName: 'Zero Runtime',
    sessionName: 'Session 004 - Runtime State + Session Persistence',
    objective: 'Implement local runtime state persistence using .runtime markdown files.',
    activeModule: 'Session Persistence',
    status: 'in_progress',
    completed: [
      'Foundation setup',
      'Provider layer',
      'OpenRouter smoke test',
      'Structured output hardening',
      'Model capabilities registry',
    ],
    inProgress: ['Operational state manager', 'Runtime markdown persistence'],
    pending: [
      'Session restore',
      'Runtime state serialization',
      'Checkpoint generation',
      'Runtime loop integration',
    ],
    knownIssues: [],
  });

  await stateManager.writeActiveModule(
    'Session Persistence',
    'Maintain local operational context across model sessions.',
    [
      'src/session/SessionTypes.ts',
      'src/session/SessionPersistence.ts',
      'src/session/CurrentStateGenerator.ts',
      'src/session/OperationalStateManager.ts',
    ],
  );

  await stateManager.appendDecision({
    id: '008',
    title: 'Runtime state is persisted as markdown first',
    description:
      'The first persistence layer uses human-readable markdown files before introducing JSON checkpoints or database-backed memory.',
  });

  await stateManager.appendProgress({
    session: 'Session 004',
    timestamp: new Date().toISOString(),
    message: 'Implemented local runtime state persistence primitives.',
  });

  await stateManager.writeNextSteps([
    'Validate session state files are written correctly.',
    'Implement session restore from .runtime/current-state.md.',
    'Add JSON checkpoints for machine-readable recovery.',
    'Integrate state persistence into the runtime loop.',
  ]);

  await stateManager.writeHandoff({
    summary:
      'Zero Runtime now has foundation, provider layer, structured JSON validation, model capabilities, and initial markdown-based runtime state persistence.',
    importantContext: [
      'The runtime should control execution, not the model.',
      'Model outputs must be validated before use.',
      'Context should be persisted locally in .runtime files.',
      'OpenRouter free model openai/gpt-oss-120b:free works but requires careful token control.',
    ],
    resumeFrom:
      'Continue with session restore and checkpoint generation before implementing the full runtime loop.',
  });

  logger.info('Session state files updated');
}

main().catch((error: unknown) => {
  logger.error('Session state test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
