import { rm } from 'node:fs/promises';
import path from 'node:path';
import { SessionDecisionStore } from '../interactive/SessionDecisionStore.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/session-decision-store-test');
const sessionId = 'session-73-test';

await rm(testRoot, {
  recursive: true,
  force: true,
});

const store = new SessionDecisionStore({
  rootDir: path.join(testRoot, 'decisions'),
});

const first = await store.add({
  sessionId,
  category: 'scope',
  strength: 'hard_rule',
  statement: 'No tocar backend en esta sesión',
});

assert(first.state.decisions.length === 1, 'should store first decision');
assert(first.appliedContext.blockedScopes.includes('backend'), 'backend should be blocked');

const second = await store.add({
  sessionId,
  category: 'coding_style',
  strength: 'hard_rule',
  statement: 'No usar any',
});

assert(second.state.decisions.length === 2, 'should store second decision');
assert(
  second.appliedContext.codingRules.some((rule) => rule.includes('No usar any')),
  'coding rule should be applied',
);

const third = await store.add({
  sessionId,
  category: 'workspace',
  strength: 'constraint',
  statement: 'Trabajar en modo local_snapshot',
});

assert(third.appliedContext.workspaceMode === 'local_snapshot', 'workspace mode should be applied');

const conflict = await store.add({
  sessionId,
  category: 'scope',
  strength: 'constraint',
  statement: 'Puedo modificar backend si hace falta',
});

assert(conflict.conflicts.length >= 1, 'should detect scope conflict');

const loaded = await store.load(sessionId);

assert(loaded.decisions.length === 4, 'should load all decisions');

const applied = await store.appliedContext(sessionId);

assert(
  applied.blockedScopes.includes('backend'),
  'applied context should preserve blocked backend',
);
assert(applied.workspaceMode === 'local_snapshot', 'applied context should include workspace mode');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'session-decision-store-test',
      sessionId,
      decisions: loaded.decisions.length,
      conflicts: conflict.conflicts.map((item) => ({
        severity: item.severity,
        reason: item.reason,
      })),
      appliedContext: applied,
      decisionStorePath: store.resolvePath(sessionId),
    },
    null,
    2,
  ),
);
