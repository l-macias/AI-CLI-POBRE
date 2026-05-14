import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RuntimeCheckpoint } from '../types/CheckpointTypes.js';
import { fromRoot } from '../utils/paths.js';
import { ContextSnapshotter } from './ContextSnapshotter.js';
import { SessionPersistence } from './SessionPersistence.js';
import { SessionSerializer } from './SessionSerializer.js';

export class SessionCheckpoint {
  private readonly checkpointDir = fromRoot('.runtime', 'checkpoints');
  private readonly persistence = new SessionPersistence();
  private readonly snapshotter = new ContextSnapshotter();
  private readonly serializer = new SessionSerializer();

  public async create(input: {
    projectName: string;
    sessionName: string;
    activeModule: string;
    summary: string;
  }): Promise<RuntimeCheckpoint> {
    await this.ensureCheckpointDir();

    const files = {
      currentState: await this.persistence.readRuntimeFile('current-state.md'),
      activeModule: await this.persistence.readRuntimeFile('active-module.md'),
      decisions: await this.persistence.readRuntimeFile('decisions.md'),
      nextSteps: await this.persistence.readRuntimeFile('next-steps.md'),
      progressLog: await this.persistence.readRuntimeFile('progress-log.md'),
      handoff: await this.persistence.readRuntimeFile('handoff.md'),
    };

    const checkpoint = this.snapshotter.createCheckpoint({
      projectName: input.projectName,
      sessionName: input.sessionName,
      activeModule: input.activeModule,
      summary: input.summary,
      files,
    });

    const checkpointPath = path.join(this.checkpointDir, `${checkpoint.id}.json`);
    const content = this.serializer.serialize(checkpoint);

    await writeFile(checkpointPath, content, 'utf8');

    return checkpoint;
  }

  public async list(): Promise<string[]> {
    await this.ensureCheckpointDir();

    const files = await readdir(this.checkpointDir);

    return files.filter((file) => file.endsWith('.json')).sort();
  }

  public async read(fileName: string): Promise<RuntimeCheckpoint> {
    await this.ensureCheckpointDir();

    const checkpointPath = path.join(this.checkpointDir, fileName);
    const content = await readFile(checkpointPath, 'utf8');

    return this.serializer.deserialize(content);
  }

  private async ensureCheckpointDir(): Promise<void> {
    await mkdir(this.checkpointDir, {
      recursive: true,
    });
  }
}
