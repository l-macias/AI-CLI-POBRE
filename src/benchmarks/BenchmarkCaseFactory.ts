import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { StaticBenchmarkCase } from './BenchmarkCase.js';
import type { BenchmarkCase } from '../types/BenchmarkTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export class BenchmarkCaseFactory {
  public createDefaultSuite(): BenchmarkCase[] {
    return [
      this.createTypeScriptErrorFixCase(),
      this.createEslintFixCase(),
      this.createReactRefactorCase(),
      this.createPackageMigrationCase(),
      this.createMultiFileImportRefactorCase(),
      this.createRuntimeLoopRecoveryCase(),
      this.createRetrievalGuidedEditCase(),
    ];
  }

  public createTypeScriptErrorFixCase(): BenchmarkCase {
    return new StaticBenchmarkCase(
      {
        id: 'typescript-error-fix-basic',
        name: 'TypeScript error fix basic fixture',
        category: 'typescript_error_fix',
        description: 'Simulates fixing a simple TypeScript type mismatch.',
        fixture: {
          id: 'typescript-error-fix-basic',
          name: 'TypeScript error fixture',
          description: 'Small TypeScript fixture with a fixable type issue.',
          files: [
            {
              relativePath: 'src/index.ts',
              content: `export function double(value: number): number {
  return value * 2;
}

export const result: string = double(2);
`,
            },
          ],
        },
        expectations: [
          {
            id: 'type-fixed',
            kind: 'file_contains',
            description: 'Result should be typed as number after the simulated fix.',
            target: 'src/index.ts',
            expectedValue: 'export const result: number = double(2);',
          },
        ],
        metadata: {
          providerExternal: false,
          networkRequired: false,
        },
      },
      async (context) => {
        const target = join(context.fixturePath, 'src/index.ts');
        const source = await readFile(target, 'utf8');
        const fixed = source.replace(
          'export const result: string = double(2);',
          'export const result: number = double(2);',
        );

        await writeFile(target, fixed, 'utf8');

        const updated = await readFile(target, 'utf8');

        assert(
          updated.includes('export const result: number = double(2);'),
          'Expected TypeScript fixture to be fixed.',
        );

        return {
          stepsExecuted: 1,
          actionsBlocked: 0,
          approvalsRequired: 1,
          replans: 0,
          recoveries: 0,
          metadata: {
            fileChanged: 'src/index.ts',
          },
        };
      },
    );
  }

  public createEslintFixCase(): BenchmarkCase {
    return new StaticBenchmarkCase(
      {
        id: 'eslint-fix-unused-var-basic',
        name: 'ESLint unused variable fix fixture',
        category: 'eslint_fix',
        description: 'Simulates removing an unused variable.',
        fixture: {
          id: 'eslint-fix-unused-var-basic',
          name: 'ESLint unused var fixture',
          description: 'Small fixture with unused variable.',
          files: [
            {
              relativePath: 'src/logger.ts',
              content: `export function createMessage(input: string): string {
  const unused = 'remove-me';

  return \`message:\${input}\`;
}
`,
            },
          ],
        },
        expectations: [
          {
            id: 'unused-var-removed',
            kind: 'file_contains',
            description: 'Unused variable should be removed.',
            target: 'src/logger.ts',
            expectedValue: 'return `message:${input}`;',
          },
        ],
      },
      async (context) => {
        const target = join(context.fixturePath, 'src/logger.ts');
        const source = await readFile(target, 'utf8');
        const fixed = source.replace("  const unused = 'remove-me';\n\n", '');

        await writeFile(target, fixed, 'utf8');

        const updated = await readFile(target, 'utf8');

        assert(!updated.includes('remove-me'), 'Expected unused variable to be removed.');

        return {
          stepsExecuted: 1,
          actionsBlocked: 0,
          approvalsRequired: 1,
          replans: 0,
          recoveries: 0,
          metadata: {
            fileChanged: 'src/logger.ts',
          },
        };
      },
    );
  }

  public createReactRefactorCase(): BenchmarkCase {
    return new StaticBenchmarkCase(
      {
        id: 'react-refactor-component-basic',
        name: 'React component refactor fixture',
        category: 'react_refactor',
        description: 'Simulates extracting repeated class names into a constant.',
        fixture: {
          id: 'react-refactor-component-basic',
          name: 'React refactor fixture',
          description: 'Small React-like component fixture.',
          files: [
            {
              relativePath: 'src/ProfileCard.tsx',
              content: `export function ProfileCard(): string {
  return '<article class="rounded shadow p-4">Profile</article>';
}
`,
            },
          ],
        },
        expectations: [
          {
            id: 'class-constant-added',
            kind: 'file_contains',
            description: 'Component should use a reusable cardClass constant.',
            target: 'src/ProfileCard.tsx',
            expectedValue: 'const cardClass =',
          },
        ],
      },
      async (context) => {
        const target = join(context.fixturePath, 'src/ProfileCard.tsx');
        const source = await readFile(target, 'utf8');

        const refactored = source.replace(
          `export function ProfileCard(): string {
  return '<article class="rounded shadow p-4">Profile</article>';
}
`,
          `const cardClass = 'rounded shadow p-4';

export function ProfileCard(): string {
  return \`<article class="\${cardClass}">Profile</article>\`;
}
`,
        );

        await writeFile(target, refactored, 'utf8');

        const updated = await readFile(target, 'utf8');

        assert(updated.includes('const cardClass ='), 'Expected cardClass constant.');
        assert(updated.includes('${cardClass}'), 'Expected component to use cardClass.');

        return {
          stepsExecuted: 1,
          actionsBlocked: 0,
          approvalsRequired: 1,
          replans: 0,
          recoveries: 0,
          metadata: {
            fileChanged: 'src/ProfileCard.tsx',
          },
        };
      },
    );
  }

  public createPackageMigrationCase(): BenchmarkCase {
    return new StaticBenchmarkCase(
      {
        id: 'package-migration-basic',
        name: 'Package migration fixture',
        category: 'package_migration',
        description: 'Simulates a safe package script migration.',
        fixture: {
          id: 'package-migration-basic',
          name: 'Package migration fixture',
          description: 'Small package.json migration fixture.',
          files: [
            {
              relativePath: 'package.json',
              content: JSON.stringify(
                {
                  name: 'benchmark-package-migration',
                  private: true,
                  type: 'module',
                  scripts: {
                    test: 'node test.js',
                  },
                },
                null,
                2,
              ),
            },
          ],
        },
        expectations: [
          {
            id: 'typecheck-script-added',
            kind: 'file_contains',
            description: 'package.json should contain a typecheck script.',
            target: 'package.json',
            expectedValue: '"typecheck": "tsc --noEmit"',
          },
        ],
      },
      async (context) => {
        const target = join(context.fixturePath, 'package.json');
        const source = await readFile(target, 'utf8');
        const parsed = JSON.parse(source) as {
          scripts?: Record<string, string>;
        };

        const scripts = parsed.scripts ?? {};
        const migrated = {
          ...parsed,
          scripts: {
            ...scripts,
            typecheck: 'tsc --noEmit',
          },
        };

        await writeFile(target, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8');

        const updated = await readFile(target, 'utf8');

        assert(updated.includes('"typecheck": "tsc --noEmit"'), 'Expected typecheck script.');

        return {
          stepsExecuted: 1,
          actionsBlocked: 0,
          approvalsRequired: 1,
          replans: 0,
          recoveries: 0,
          metadata: {
            fileChanged: 'package.json',
          },
        };
      },
    );
  }

  public createMultiFileImportRefactorCase(): BenchmarkCase {
    return new StaticBenchmarkCase(
      {
        id: 'multi-file-import-refactor-basic',
        name: 'Multi-file import refactor fixture',
        category: 'multi_file_import_refactor',
        description: 'Simulates updating imports after moving a utility file.',
        fixture: {
          id: 'multi-file-import-refactor-basic',
          name: 'Multi-file import refactor fixture',
          description: 'Two files importing a shared helper.',
          files: [
            {
              relativePath: 'src/utils/math.ts',
              content: `export function add(a: number, b: number): number {
  return a + b;
}
`,
            },
            {
              relativePath: 'src/a.ts',
              content: `import { add } from './utils/math.js';

export const a = add(1, 1);
`,
            },
            {
              relativePath: 'src/b.ts',
              content: `import { add } from './utils/math.js';

export const b = add(2, 2);
`,
            },
          ],
        },
        expectations: [
          {
            id: 'a-import-updated',
            kind: 'file_contains',
            description: 'a.ts should import from shared math path.',
            target: 'src/a.ts',
            expectedValue: './shared/math.js',
          },
          {
            id: 'b-import-updated',
            kind: 'file_contains',
            description: 'b.ts should import from shared math path.',
            target: 'src/b.ts',
            expectedValue: './shared/math.js',
          },
        ],
      },
      async (context) => {
        const files = ['src/a.ts', 'src/b.ts'];

        for (const file of files) {
          const target = join(context.fixturePath, file);
          const source = await readFile(target, 'utf8');
          const updated = source.replace('./utils/math.js', './shared/math.js');

          await writeFile(target, updated, 'utf8');
        }

        const a = await readFile(join(context.fixturePath, 'src/a.ts'), 'utf8');
        const b = await readFile(join(context.fixturePath, 'src/b.ts'), 'utf8');

        assert(a.includes('./shared/math.js'), 'Expected a.ts import to be updated.');
        assert(b.includes('./shared/math.js'), 'Expected b.ts import to be updated.');

        return {
          stepsExecuted: 2,
          actionsBlocked: 0,
          approvalsRequired: 1,
          replans: 0,
          recoveries: 0,
          metadata: {
            filesChanged: 'src/a.ts,src/b.ts',
          },
        };
      },
    );
  }

  public createRuntimeLoopRecoveryCase(): BenchmarkCase {
    return new StaticBenchmarkCase(
      {
        id: 'runtime-loop-recovery-basic',
        name: 'Runtime loop recovery fixture',
        category: 'runtime_loop_recovery',
        description: 'Simulates a blocked action followed by recovery.',
        fixture: {
          id: 'runtime-loop-recovery-basic',
          name: 'Runtime loop recovery fixture',
          description: 'Simple fixture for recovery metrics.',
          files: [
            {
              relativePath: 'README.md',
              content: '# Recovery fixture\n',
            },
          ],
        },
        expectations: [
          {
            id: 'recovery-counted',
            kind: 'metric_at_least',
            description: 'At least one recovery should be counted.',
            target: 'recoveries',
            expectedValue: 1,
          },
        ],
      },
      () => {
        return Promise.resolve({
          stepsExecuted: 1,
          actionsBlocked: 1,
          approvalsRequired: 1,
          replans: 1,
          recoveries: 1,
          metadata: {
            simulated: true,
            recoveryReason: 'Blocked unsafe action, recovered with safe path.',
          },
        });
      },
    );
  }

  public createRetrievalGuidedEditCase(): BenchmarkCase {
    return new StaticBenchmarkCase(
      {
        id: 'retrieval-guided-edit-basic',
        name: 'Retrieval-guided edit fixture',
        category: 'retrieval_guided_edit',
        description: 'Simulates selecting the right file based on retrieved context.',
        fixture: {
          id: 'retrieval-guided-edit-basic',
          name: 'Retrieval-guided edit fixture',
          description: 'Multiple files where only one should be edited.',
          files: [
            {
              relativePath: 'src/profile.ts',
              content: `export const profileTitle = 'Old title';
`,
            },
            {
              relativePath: 'src/settings.ts',
              content: `export const settingsTitle = 'Settings';
`,
            },
            {
              relativePath: 'docs/context.md',
              content: 'The profile title should be renamed to Professional Profile.\n',
            },
          ],
        },
        expectations: [
          {
            id: 'profile-edited',
            kind: 'file_contains',
            description: 'Profile file should be edited based on context.',
            target: 'src/profile.ts',
            expectedValue: 'Professional Profile',
          },
        ],
      },
      async (context) => {
        const contextFile = await readFile(join(context.fixturePath, 'docs/context.md'), 'utf8');

        assert(
          contextFile.includes('profile title'),
          'Expected retrieval context to identify profile title.',
        );

        const profilePath = join(context.fixturePath, 'src/profile.ts');
        const source = await readFile(profilePath, 'utf8');
        const updated = source.replace('Old title', 'Professional Profile');

        await writeFile(profilePath, updated, 'utf8');

        const profile = await readFile(profilePath, 'utf8');
        const settings = await readFile(join(context.fixturePath, 'src/settings.ts'), 'utf8');

        assert(profile.includes('Professional Profile'), 'Expected profile title update.');
        assert(settings.includes('Settings'), 'Expected unrelated settings file untouched.');

        return {
          stepsExecuted: 2,
          actionsBlocked: 0,
          approvalsRequired: 1,
          replans: 0,
          recoveries: 0,
          metadata: {
            retrievedContext: 'docs/context.md',
            fileChanged: 'src/profile.ts',
          },
        };
      },
    );
  }
}
