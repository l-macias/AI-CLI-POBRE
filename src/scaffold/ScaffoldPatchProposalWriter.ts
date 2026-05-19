import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { PatchProposal } from '../types/RepairTypes.js';

export class ScaffoldPatchProposalWriter {
  public async write(input: { outputPath: string; proposal: PatchProposal }): Promise<string> {
    const absoluteOutputPath = resolve(input.outputPath);

    await mkdir(dirname(absoluteOutputPath), {
      recursive: true,
    });

    await writeFile(absoluteOutputPath, `${JSON.stringify(input.proposal, null, 2)}\n`, 'utf8');

    return absoluteOutputPath;
  }
}
