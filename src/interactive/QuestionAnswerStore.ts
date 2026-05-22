import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import type { RuntimeQuestionAnswer } from './RuntimeQuestion.js';

export interface QuestionAnswerStoreOptions {
  rootDir?: string | undefined;
}

export interface QuestionAnswerState {
  version: 1;
  sessionId: string;
  answers: RuntimeQuestionAnswer[];
  updatedAt: string;
}

export class QuestionAnswerStore {
  private readonly rootDir: string;

  public constructor(options: QuestionAnswerStoreOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? '.runtime/questions');
  }

  public async addAnswer(input: {
    sessionId: string;
    questionId: string;
    answer: string;
  }): Promise<QuestionAnswerState> {
    const current = await this.load(input.sessionId);
    const answeredAt = new Date().toISOString();

    const next: QuestionAnswerState = {
      version: 1,
      sessionId: input.sessionId,
      answers: [
        ...current.answers.filter((answer) => answer.questionId !== input.questionId),
        {
          questionId: input.questionId,
          answer: input.answer,
          answeredAt,
        },
      ],
      updatedAt: answeredAt,
    };

    await this.save(next);

    return next;
  }

  public async load(sessionId: string): Promise<QuestionAnswerState> {
    const filePath = this.resolvePath(sessionId);

    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      if (!this.isQuestionAnswerState(parsed)) {
        throw new Error(`Invalid question answer state: ${filePath}`);
      }

      return parsed;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return {
          version: 1,
          sessionId,
          answers: [],
          updatedAt: new Date().toISOString(),
        };
      }

      throw error;
    }
  }

  public resolvePath(sessionId: string): string {
    return path.join(this.rootDir, sessionId, 'answers.json');
  }

  private async save(state: QuestionAnswerState): Promise<void> {
    const filePath = this.resolvePath(state.sessionId);

    await mkdir(dirname(filePath), {
      recursive: true,
    });

    await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  private isQuestionAnswerState(value: unknown): value is QuestionAnswerState {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      value['version'] === 1 &&
      typeof value['sessionId'] === 'string' &&
      Array.isArray(value['answers']) &&
      value['answers'].every((answer) => this.isRuntimeQuestionAnswer(answer)) &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isRuntimeQuestionAnswer(value: unknown): value is RuntimeQuestionAnswer {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['questionId'] === 'string' &&
      typeof value['answer'] === 'string' &&
      typeof value['answeredAt'] === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
