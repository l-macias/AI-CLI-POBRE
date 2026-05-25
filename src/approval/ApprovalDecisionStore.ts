import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ApprovalDecisionResult } from './ApprovalRequest.js';

export interface StoredApprovalDecision {
  sessionId: string;
  projectRoot: string;
  proposalId: string;
  diffId: string;
  decision: ApprovalDecisionResult;
  storedAt: string;
}

export interface ApprovalDecisionStoreSaveInput {
  sessionId: string;
  projectRoot: string;
  proposalId: string;
  diffId: string;
  decision: ApprovalDecisionResult;
}

export interface ApprovalDecisionStoreFindInput {
  sessionId: string;
  proposalId: string;
  diffId: string;
}

export interface ApprovalDecisionStoreDocument {
  version: 1;
  sessionId: string;
  decisions: StoredApprovalDecision[];
  updatedAt: string;
}

export class ApprovalDecisionStore {
  public async save(input: ApprovalDecisionStoreSaveInput): Promise<StoredApprovalDecision> {
    const document = await this.load(input.sessionId);
    const stored: StoredApprovalDecision = {
      sessionId: input.sessionId,
      projectRoot: input.projectRoot,
      proposalId: input.proposalId,
      diffId: input.diffId,
      decision: input.decision,
      storedAt: new Date().toISOString(),
    };

    const nextDocument: ApprovalDecisionStoreDocument = {
      version: 1,
      sessionId: input.sessionId,
      decisions: [
        ...document.decisions.filter(
          (item) =>
            !(
              item.proposalId === input.proposalId &&
              item.diffId === input.diffId &&
              item.decision.requestId === input.decision.requestId
            ),
        ),
        stored,
      ],
      updatedAt: new Date().toISOString(),
    };

    await this.write(nextDocument);

    return stored;
  }

  public async findLatest(
    input: ApprovalDecisionStoreFindInput,
  ): Promise<StoredApprovalDecision | null> {
    const document = await this.load(input.sessionId);

    const matches = document.decisions.filter(
      (item) =>
        item.proposalId === input.proposalId &&
        item.diffId === input.diffId &&
        item.decision.accepted,
    );

    return matches.at(-1) ?? null;
  }

  public async load(sessionId: string): Promise<ApprovalDecisionStoreDocument> {
    const filePath = this.resolveFilePath(sessionId);

    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as ApprovalDecisionStoreDocument;

      return {
        version: 1,
        sessionId,
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        updatedAt:
          typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      };
    } catch {
      return {
        version: 1,
        sessionId,
        decisions: [],
        updatedAt: new Date().toISOString(),
      };
    }
  }

  private async write(document: ApprovalDecisionStoreDocument): Promise<void> {
    const directory = this.resolveDirectory(document.sessionId);

    await mkdir(directory, {
      recursive: true,
    });

    await writeFile(
      this.resolveFilePath(document.sessionId),
      `${JSON.stringify(document, null, 2)}\n`,
      'utf8',
    );
  }

  private resolveDirectory(sessionId: string): string {
    return path.resolve('.runtime', 'approval-decisions', this.safeSegment(sessionId));
  }

  private resolveFilePath(sessionId: string): string {
    return path.join(this.resolveDirectory(sessionId), 'decisions.json');
  }

  private safeSegment(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9._-]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    if (normalized.length === 0) {
      throw new Error('Approval decision storage segment cannot be empty.');
    }

    return normalized;
  }
}
