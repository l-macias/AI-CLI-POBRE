import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import { DecisionApplier } from './DecisionApplier.js';
import { DecisionConflictDetector, type DecisionConflict } from './DecisionConflictDetector.js';
import type {
  AppliedDecisionContext,
  SessionDecision,
  SessionDecisionCreateInput,
  SessionDecisionState,
} from './SessionDecision.js';

export interface SessionDecisionStoreOptions {
  rootDir?: string | undefined;
  conflictDetector?: DecisionConflictDetector | undefined;
  decisionApplier?: DecisionApplier | undefined;
}

export interface SessionDecisionAddResult {
  state: SessionDecisionState;
  conflicts: DecisionConflict[];
  appliedContext: AppliedDecisionContext;
}

export class SessionDecisionStore {
  private readonly rootDir: string;
  private readonly conflictDetector: DecisionConflictDetector;
  private readonly decisionApplier: DecisionApplier;

  public constructor(options: SessionDecisionStoreOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? '.runtime/session-decisions');
    this.conflictDetector = options.conflictDetector ?? new DecisionConflictDetector();
    this.decisionApplier = options.decisionApplier ?? new DecisionApplier();
  }

  public async add(input: SessionDecisionCreateInput): Promise<SessionDecisionAddResult> {
    const state = await this.loadOrCreate(input.sessionId);
    const now = new Date().toISOString();

    const decision: SessionDecision = {
      id: this.createDecisionId(input.statement),
      sessionId: input.sessionId,
      category: input.category,
      strength: input.strength,
      statement: input.statement,
      normalizedStatement: this.normalize(input.statement),
      source: input.source ?? 'user',
      createdAt: now,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    const updated: SessionDecisionState = {
      version: 1,
      sessionId: input.sessionId,
      decisions: [...state.decisions, decision],
      updatedAt: now,
    };

    await this.save(updated);

    const conflicts = this.conflictDetector.detect(updated.decisions);
    const appliedContext = this.decisionApplier.apply({
      sessionId: updated.sessionId,
      decisions: updated.decisions,
    });

    return {
      state: updated,
      conflicts,
      appliedContext,
    };
  }

  public async loadOrCreate(sessionId: string): Promise<SessionDecisionState> {
    try {
      return await this.load(sessionId);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        const now = new Date().toISOString();

        return {
          version: 1,
          sessionId,
          decisions: [],
          updatedAt: now,
        };
      }

      throw error;
    }
  }

  public async load(sessionId: string): Promise<SessionDecisionState> {
    const filePath = this.resolvePath(sessionId);
    const raw = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (!this.isState(parsed)) {
      throw new Error(`Invalid session decision state: ${filePath}`);
    }

    return parsed;
  }

  public async appliedContext(sessionId: string): Promise<AppliedDecisionContext> {
    const state = await this.loadOrCreate(sessionId);

    return this.decisionApplier.apply({
      sessionId,
      decisions: state.decisions,
    });
  }

  public resolvePath(sessionId: string): string {
    return path.join(this.rootDir, sessionId, 'decisions.json');
  }

  private async save(state: SessionDecisionState): Promise<void> {
    const filePath = this.resolvePath(state.sessionId);

    await mkdir(dirname(filePath), {
      recursive: true,
    });

    await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  private normalize(statement: string): string {
    return statement
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replaceAll(/\p{Diacritic}/gu, '');
  }

  private createDecisionId(statement: string): string {
    const slug = this.normalize(statement)
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '')
      .slice(0, 48);

    const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');

    return `decision-${slug || 'runtime'}-${timestamp}`;
  }

  private isState(value: unknown): value is SessionDecisionState {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      value['version'] === 1 &&
      typeof value['sessionId'] === 'string' &&
      Array.isArray(value['decisions']) &&
      value['decisions'].every((decision) => this.isDecision(decision)) &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isDecision(value: unknown): value is SessionDecision {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['id'] === 'string' &&
      typeof value['sessionId'] === 'string' &&
      typeof value['category'] === 'string' &&
      typeof value['strength'] === 'string' &&
      typeof value['statement'] === 'string' &&
      typeof value['normalizedStatement'] === 'string' &&
      typeof value['source'] === 'string' &&
      typeof value['createdAt'] === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
