export interface CliSessionSnapshot {
  id: string;
  startedAt: string;
}

export class CliSession {
  private readonly id: string;
  private readonly startedAt: string;

  public constructor() {
    const timestamp = new Date().toISOString();

    this.id = `cli-session-${timestamp.replaceAll(':', '').replaceAll('.', '')}`;
    this.startedAt = timestamp;
  }

  public snapshot(): CliSessionSnapshot {
    return {
      id: this.id,
      startedAt: this.startedAt,
    };
  }
}
