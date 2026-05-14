import type { RuntimeCheckpoint, RuntimeCheckpointFiles } from '../types/CheckpointTypes.js';

export interface ContextSnapshotInput {
  projectName: string;
  sessionName: string;
  activeModule: string;
  summary: string;
  files: RuntimeCheckpointFiles;
}

export class ContextSnapshotter {
  public createCheckpoint(input: ContextSnapshotInput): RuntimeCheckpoint {
    return {
      id: this.createCheckpointId(),
      createdAt: new Date().toISOString(),
      projectName: input.projectName,
      sessionName: input.sessionName,
      activeModule: input.activeModule,
      summary: input.summary,
      files: input.files,
    };
  }

  private createCheckpointId(): string {
    const timestamp = new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '');

    return `checkpoint-${timestamp}`;
  }
}
