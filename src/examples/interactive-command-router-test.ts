import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { InteractiveCommandParser } from '../interactive/InteractiveCommandParser.js';
import { InteractiveCommandRouter } from '../interactive/InteractiveCommandRouter.js';
import { InteractiveSession } from '../interactive/InteractiveSession.js';
import { InteractiveSessionStore } from '../interactive/InteractiveSessionStore.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/interactive-command-router-test');

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

const router = new InteractiveCommandRouter({
  session,
});

const parser = new InteractiveCommandParser();

const parsedPlan = parser.parse('/plan');

assert(parsedPlan.ok, '/plan should parse');
assert(
  parsedPlan.ok && parsedPlan.command.commandName === 'plan',
  '/plan should resolve command name',
);
assert(parsedPlan.ok && parsedPlan.command.intent === 'show_plan', '/plan should resolve intent');

const parsedNatural = parser.parse('No toques la base de datos todavía');

assert(parsedNatural.ok, 'natural language should parse');
assert(
  parsedNatural.ok && parsedNatural.command.kind === 'natural_language',
  'natural language should be classified',
);

const parsedUnknown = parser.parse('/unknown');

assert(!parsedUnknown.ok, 'unknown slash command should fail');

const started = await session.start({
  id: 'interactive-command-router-test-001',
  projectRoot: testRoot,
  projectName: 'zero-runtime-test-project',
  goal: 'Build interactive command routing.',
});

const planResult = await router.route(started, '/plan');

assert(planResult.status === 'handled', '/plan should be handled');
assert(planResult.session.runtimeActions.length === 1, '/plan should record runtime action');

const naturalResult = await router.route(
  planResult.session,
  'Mostrame qué archivos pensás modificar',
);

assert(naturalResult.status === 'handled', 'natural instruction should be handled');
assert(
  naturalResult.session.messages.length === 2,
  'natural instruction should append user message',
);
assert(
  naturalResult.session.runtimeActions.length === 2,
  'natural instruction should record runtime action',
);

const applyResult = await router.route(naturalResult.session, '/apply');

assert(applyResult.status === 'handled', '/apply should be handled');
assert(applyResult.session.runtimeActions.length === 3, '/apply should record request');
assert(
  applyResult.session.runtimeActions[2]?.status === 'pending',
  '/apply should not execute automatically',
);

const pauseResult = await router.route(applyResult.session, '/pause testing pause');

assert(pauseResult.status === 'handled', '/pause should be handled');
assert(pauseResult.session.status === 'paused', '/pause should pause session');

const resumeResult = await router.route(pauseResult.session, '/resume');

assert(resumeResult.status === 'handled', '/resume should be handled');
assert(resumeResult.session.status === 'idle', '/resume should resume session');

const helpResult = await router.route(resumeResult.session, '/help');

assert(helpResult.status === 'handled', '/help should be handled');
assert(helpResult.message.includes('/plan'), '/help should include command list');

const blockedResult = await router.route(helpResult.session, '/does-not-exist');

assert(blockedResult.status === 'blocked', 'unknown command should be blocked');
assert(blockedResult.issues.length === 1, 'unknown command should return issue');

const loaded = await session.load(helpResult.session.id);

assert(loaded.id === started.id, 'session should persist routed commands');
assert(loaded.runtimeActions.length >= 4, 'loaded session should include routed actions');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'interactive-command-router-test',
      sessionId: loaded.id,
      finalStatus: loaded.status,
      messages: loaded.messages.length,
      runtimeActions: loaded.runtimeActions.length,
      timelineEvents: loaded.timeline.length,
    },
    null,
    2,
  ),
);
