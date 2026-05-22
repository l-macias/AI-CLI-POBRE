import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import type { InteractiveSessionState } from './InteractiveSessionTypes.js';
import { InteractiveSessionStateValidator } from './InteractiveSessionState.js';

export interface InteractiveSessionStoreOptions {
  rootDir?: string | undefined;
}

export class InteractiveSessionStore {
  private readonly rootDir: string;
  private readonly validator: InteractiveSessionStateValidator;

  public constructor(options: InteractiveSessionStoreOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? '.runtime/interactive-sessions');
    this.validator = new InteractiveSessionStateValidator();
  }

  public async save(state: InteractiveSessionState): Promise<string> {
    this.validator.assertValid(state);

    const filePath = this.getSessionStatePath(state.id);

    await mkdir(dirname(filePath), {
      recursive: true,
    });

    await writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');

    return filePath;
  }

  public async load(sessionId: string): Promise<InteractiveSessionState> {
    const filePath = this.getSessionStatePath(sessionId);
    const content = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(content);

    this.validator.assertValid(parsed);

    return parsed;
  }

  public getSessionStatePath(sessionId: string): string {
    return path.join(this.rootDir, sessionId, 'session-state.json');
  }
}
