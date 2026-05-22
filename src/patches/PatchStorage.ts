import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PatchProposalGenerationResult } from './PatchProposal.js';

export interface PatchStorageSaveResult {
  proposalPath: string;
  activeProposalPath: string;
}

export class PatchStorage {
  public async save(result: PatchProposalGenerationResult): Promise<PatchStorageSaveResult> {
    const proposalDirectory = path.resolve(
      '.runtime',
      'patch-proposals',
      this.safeSegment(result.proposal.sessionId),
    );

    await mkdir(proposalDirectory, {
      recursive: true,
    });

    const proposalPath = path.join(
      proposalDirectory,
      `${this.safeSegment(result.proposal.id)}.json`,
    );

    const activeProposalPath = path.resolve('.runtime', 'active-patch-proposal.json');

    const serialized = `${JSON.stringify(result, null, 2)}\n`;

    await writeFile(proposalPath, serialized, 'utf8');
    await writeFile(activeProposalPath, serialized, 'utf8');

    return {
      proposalPath,
      activeProposalPath,
    };
  }

  private safeSegment(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9._-]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    if (normalized.length === 0) {
      throw new Error('Patch storage segment cannot be empty.');
    }

    return normalized;
  }
}
