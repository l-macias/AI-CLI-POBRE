import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { InteractiveSession } from '../interactive/InteractiveSession.js';
import { InteractiveSessionStore } from '../interactive/InteractiveSessionStore.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/interactive-session-core-test');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(testRoot, {
  recursive: true,
});

const store = new InteractiveSessionStore({
  rootDir: path.join(testRoot, 'interactive-sessions'),
});

const session = new InteractiveSession({
  store,
});

const started = await session.start({
  id: 'interactive-session-test-001',
  projectRoot: testRoot,
  projectName: 'zero-runtime-test-project',
  goal: 'Convert Zero Runtime into an interactive local platform.',
  createdBy: 'test',
  metadata: {
    test: true,
  },
});

assert(started.status === 'idle', 'session should start as idle');
assert(started.messages.length === 1, 'session should persist initial user goal as message');
assert(started.timeline.length === 1, 'session should create initial timeline event');

const analyzing = await session.setStatus(started, 'analyzing_project');

assert(analyzing.status === 'analyzing_project', 'session should transition to analyzing_project');

const withMessage = await session.addMessage(analyzing, {
  role: 'user',
  content: 'No toques la base de datos todavía.',
});

assert(withMessage.messages.length === 2, 'session should append user messages');

const withDecision = await session.addDecision(withMessage, {
  title: 'Keep database untouched',
  description: 'The runtime must avoid database edits during this session.',
  reason: 'User explicitly constrained the working boundary.',
});

assert(withDecision.decisions.length === 1, 'session should append decisions');

const withAction = await session.addRuntimeAction(withDecision, {
  title: 'Inspect project structure',
  description: 'Runtime inspected the target project structure before planning.',
  status: 'completed',
});

assert(withAction.runtimeActions.length === 1, 'session should append runtime actions');

const withUpdatedGoal = await session.updateGoal(withAction, {
  nextGoal: 'Build only the interactive session core.',
  reason: 'Session 54 must stay focused and avoid router/UI work.',
});

assert(
  withUpdatedGoal.goal.current === 'Build only the interactive session core.',
  'session should update current goal',
);

const paused = await session.pause(withUpdatedGoal, 'User requested pause.');

assert(paused.status === 'paused', 'session should pause');
assert(typeof paused.pausedAt === 'string', 'paused session should include pausedAt');

const resumed = await session.resume(paused);

assert(resumed.status === 'idle', 'session should resume to idle');
assert(resumed.pausedAt === undefined, 'resumed session should clear pausedAt');

const completed = await session.complete(resumed);

assert(completed.status === 'completed', 'session should complete');
assert(typeof completed.completedAt === 'string', 'completed session should include completedAt');

const loaded = await session.load(completed.id);

assert(loaded.id === completed.id, 'store should load persisted session');
assert(loaded.timeline.length >= 8, 'loaded session should include timeline history');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'interactive-session-core-test',
      sessionId: loaded.id,
      finalStatus: loaded.status,
      messages: loaded.messages.length,
      decisions: loaded.decisions.length,
      runtimeActions: loaded.runtimeActions.length,
      timelineEvents: loaded.timeline.length,
    },
    null,
    2,
  ),
);
