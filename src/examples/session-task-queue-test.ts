import { rm } from 'node:fs/promises';
import path from 'node:path';
import { SessionTaskQueue } from '../tasks/SessionTaskQueue.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/session-task-queue-test');

await rm(testRoot, {
  recursive: true,
  force: true,
});

const queue = new SessionTaskQueue({
  rootDir: path.join(testRoot, 'tasks'),
});

const sessionId = 'session-72-test';

let state = await queue.create(sessionId);

assert(state.tasks.length === 0, 'new queue should start empty');

state = await queue.addTask(sessionId, {
  sessionId,
  title: 'Review auth backend',
  description: 'Inspect backend authentication routes and middleware.',
  kind: 'inspect',
});

const backendTask = state.tasks[0];

if (!backendTask) {
  throw new Error('backend task should exist');
}

state = await queue.addTask(sessionId, {
  sessionId,
  title: 'Review frontend login',
  description: 'Inspect frontend login components and API usage.',
  kind: 'inspect',
});

const frontendTask = state.tasks[1];

if (!frontendTask) {
  throw new Error('frontend task should exist');
}

state = await queue.addTask(sessionId, {
  sessionId,
  title: 'Detect missing validations',
  description: 'Compare frontend/backend validation boundaries.',
  kind: 'context',
  dependencies: [backendTask.id, frontendTask.id],
});

const validationTask = state.tasks[2];

if (!validationTask) {
  throw new Error('validation task should exist');
}

const initialNext = await queue.nextReadyTask(sessionId);

assert(initialNext?.id === backendTask.id, 'first ready task should be backend review');

state = await queue.transitionTask({
  sessionId,
  taskId: backendTask.id,
  status: 'in_progress',
});

assert(
  state.tasks.find((task) => task.id === backendTask.id)?.status === 'in_progress',
  'backend task should be in progress',
);

state = await queue.transitionTask({
  sessionId,
  taskId: backendTask.id,
  status: 'completed',
});

state = await queue.transitionTask({
  sessionId,
  taskId: frontendTask.id,
  status: 'in_progress',
});

state = await queue.transitionTask({
  sessionId,
  taskId: frontendTask.id,
  status: 'completed',
});

const readyAfterDependencies = await queue.nextReadyTask(sessionId);

assert(
  readyAfterDependencies?.id === validationTask.id,
  'validation task should be ready after dependencies complete',
);

state = await queue.transitionTask({
  sessionId,
  taskId: validationTask.id,
  status: 'in_progress',
});

state = await queue.transitionTask({
  sessionId,
  taskId: validationTask.id,
  status: 'waiting_user',
});

assert(
  state.tasks.find((task) => task.id === validationTask.id)?.status === 'waiting_user',
  'validation task should wait for user',
);

state = await queue.transitionTask({
  sessionId,
  taskId: validationTask.id,
  status: 'in_progress',
});

state = await queue.transitionTask({
  sessionId,
  taskId: validationTask.id,
  status: 'completed',
});

const progress = await queue.progress(sessionId);

assert(progress.total === 3, 'progress should include three tasks');
assert(progress.completed === 3, 'all tasks should be completed');
assert(progress.completionRatio === 1, 'completion ratio should be 1');

const loaded = await queue.load(sessionId);

assert(loaded.tasks.length === 3, 'persisted queue should load all tasks');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'session-task-queue-test',
      sessionId,
      total: progress.total,
      completed: progress.completed,
      completionRatio: progress.completionRatio,
      queuePath: queue.resolvePath(sessionId),
    },
    null,
    2,
  ),
);
