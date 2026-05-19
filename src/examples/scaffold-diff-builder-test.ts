import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ScaffoldDiffBuilder } from '../scaffold/ScaffoldDiffBuilder.js';
import type { PatchProposal } from '../types/RepairTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const projectRoot = resolve('.runtime/scaffold-diff-builder-test/project');

  await resetFixture(projectRoot);

  const proposal: PatchProposal = {
    id: 'scaffold-diff-builder-test-proposal',
    summary: 'Diff builder test proposal.',
    riskLevel: 'low',
    operations: [
      {
        kind: 'create_file',
        targetFile: 'src/modules/auth/index.ts',
        newContent: "export * from './auth.service.js';\n",
        reason: 'Create module entrypoint.',
      },
      {
        kind: 'replace_file',
        targetFile: 'src/modules/auth/existing.ts',
        expectedCurrentContent: 'export const existing = true;\n',
        newContent: 'export const existing = false;\n',
        reason: 'Replace existing module file.',
      },
    ],
    explanation: 'Test scaffold diff builder.',
  };

  const previews = await new ScaffoldDiffBuilder().build({
    projectRoot,
    proposal,
  });

  assert(previews.length === 2, 'Expected two diff previews.');

  const createPreview = requirePreview(previews, 'src/modules/auth/index.ts');

  assert(createPreview.changed, 'Expected create preview to be changed.');
  assert(createPreview.changedLines > 0, 'Expected create preview changed lines.');
  assert(
    createPreview.markdown.includes('+export * from'),
    'Expected create preview to include added export.',
  );

  const replacePreview = requirePreview(previews, 'src/modules/auth/existing.ts');

  assert(replacePreview.changed, 'Expected replace preview to be changed.');
  assert(replacePreview.changedLines === 1, 'Expected one changed replace line.');
  assert(
    replacePreview.markdown.includes('-export const existing = true;'),
    'Expected replace preview to include removed line.',
  );
  assert(
    replacePreview.markdown.includes('+export const existing = false;'),
    'Expected replace preview to include added line.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'scaffold-diff-builder-test',
        previews: previews.length,
        changedLines: previews.reduce((total, preview) => total + preview.changedLines, 0),
      },
      null,
      2,
    ),
  );
}

function requirePreview(
  previews: readonly {
    targetFile: string;
    changed: boolean;
    changedLines: number;
    markdown: string;
  }[],
  targetFile: string,
): {
  targetFile: string;
  changed: boolean;
  changedLines: number;
  markdown: string;
} {
  const preview = previews.find((item) => item.targetFile === targetFile);

  if (!preview) {
    throw new Error(`Expected preview for ${targetFile}`);
  }

  return preview;
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/scaffold-diff-builder-test'), {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(projectRoot, 'src/modules/auth'), {
    recursive: true,
  });

  await writeFile(
    resolve(projectRoot, 'src/modules/auth/existing.ts'),
    'export const existing = true;\n',
    'utf8',
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'scaffold-diff-builder-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
