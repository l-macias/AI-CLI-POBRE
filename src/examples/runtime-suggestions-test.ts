import { SuggestionEngine } from '../suggestions/SuggestionEngine.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const engine = new SuggestionEngine();

const result = engine.scan({
  projectRoot: 'C:/Users/LUCAS/Desktop/micafecito',
  projectName: 'micafecito',
  stack: ['react', 'node', 'express', 'postgresql', 'prisma', 'pern', 'typescript'],
  workspaceMode: 'local_snapshot',
  gitAvailable: false,
  snapshotAvailable: false,
  runtimeActions: [
    {
      title: 'Patch auth middleware',
      description: 'This change touches auth and database access through Prisma.',
      status: 'pending',
    },
  ],
  errors: ['tsc --noEmit failed with TypeScript error TS2322'],
});

assert(result.projectRoot === 'C:/Users/LUCAS/Desktop/micafecito', 'projectRoot should match');
assert(result.suggestions.length >= 5, 'should produce multiple suggestions');

assert(
  result.suggestions.some((suggestion) => suggestion.title === 'PERN project detected'),
  'should detect PERN suggestion',
);

assert(
  result.suggestions.some((suggestion) => suggestion.title === 'TypeScript errors detected'),
  'should detect TypeScript error suggestion',
);

assert(
  result.suggestions.some((suggestion) => suggestion.title === 'Snapshot recommended'),
  'should recommend snapshot',
);

assert(
  result.suggestions.some(
    (suggestion) => suggestion.title === 'Security-sensitive change detected',
  ),
  'should detect security-sensitive changes',
);

assert(result.suggestions[0]?.priority === 'high', 'high priority suggestions should come first');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-suggestions-test',
      suggestions: result.suggestions.map((suggestion) => ({
        priority: suggestion.priority,
        category: suggestion.category,
        title: suggestion.title,
        recommendedCommand: suggestion.recommendedCommand,
      })),
    },
    null,
    2,
  ),
);
