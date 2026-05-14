import type { RestoredSessionContext } from '../types/CheckpointTypes.js';
import { SessionPersistence } from './SessionPersistence.js';

export class SessionRestorer {
  private readonly persistence = new SessionPersistence();

  public async restore(): Promise<RestoredSessionContext> {
    const currentState = await this.persistence.readRuntimeFile('current-state.md');
    const activeModule = await this.persistence.readRuntimeFile('active-module.md');
    const decisions = await this.persistence.readRuntimeFile('decisions.md');
    const nextSteps = await this.persistence.readRuntimeFile('next-steps.md');
    const progressLog = await this.persistence.readRuntimeFile('progress-log.md');
    const handoff = await this.persistence.readRuntimeFile('handoff.md');

    return {
      currentState,
      activeModule,
      decisions,
      nextSteps,
      progressLog,
      handoff,
      compactSummary: this.buildCompactSummary({
        currentState,
        activeModule,
        decisions,
        nextSteps,
        progressLog,
        handoff,
      }),
    };
  }

  private buildCompactSummary(input: Omit<RestoredSessionContext, 'compactSummary'>): string {
    return `# Restored Session Context

## Current State

${this.fallback(input.currentState)}

## Active Module

${this.fallback(input.activeModule)}

## Next Steps

${this.fallback(input.nextSteps)}

## Handoff

${this.fallback(input.handoff)}
`;
  }

  private fallback(content: string | null): string {
    return content?.trim() || 'No content available.';
  }
}
