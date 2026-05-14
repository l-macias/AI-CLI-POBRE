import { CurrentStateGenerator } from './CurrentStateGenerator.js';
import { DecisionTracker } from './DecisionTracker.js';
import { HandoffGenerator } from './HandoffGenerator.js';
import { ProgressTracker } from './ProgressTracker.js';
import { SessionPersistence } from './SessionPersistence.js';
import type {
  HandoffInput,
  ProgressEntry,
  RuntimeDecision,
  RuntimeSessionState,
} from '../types/SessionTypes.js';

export class OperationalStateManager {
  private readonly persistence = new SessionPersistence();
  private readonly currentStateGenerator = new CurrentStateGenerator();
  private readonly progressTracker = new ProgressTracker();
  private readonly decisionTracker = new DecisionTracker();
  private readonly handoffGenerator = new HandoffGenerator();

  public async writeCurrentState(state: RuntimeSessionState): Promise<void> {
    const content = this.currentStateGenerator.generate(state);

    await this.persistence.writeRuntimeFile('current-state.md', content);
  }

  public async writeActiveModule(
    moduleName: string,
    purpose: string,
    files: string[],
  ): Promise<void> {
    const content = `# Active Module

## Module

${moduleName}

## Purpose

${purpose}

## Current Files

${this.renderList(files)}
`;

    await this.persistence.writeRuntimeFile('active-module.md', content);
  }

  public async appendProgress(entry: ProgressEntry): Promise<void> {
    const existing = await this.persistence.readRuntimeFile('progress-log.md');
    const updated = this.progressTracker.append(existing, entry);

    await this.persistence.writeRuntimeFile('progress-log.md', updated);
  }

  public async appendDecision(decision: RuntimeDecision): Promise<void> {
    const existing = await this.persistence.readRuntimeFile('decisions.md');
    const updated = this.decisionTracker.append(existing, decision);

    await this.persistence.writeRuntimeFile('decisions.md', updated);
  }

  public async writeNextSteps(steps: string[]): Promise<void> {
    const content = `# Next Steps

${this.renderList(steps)}
`;

    await this.persistence.writeRuntimeFile('next-steps.md', content);
  }

  public async writeHandoff(input: HandoffInput): Promise<void> {
    const content = this.handoffGenerator.generate(input);

    await this.persistence.writeRuntimeFile('handoff.md', content);
  }

  private renderList(items: string[]): string {
    if (items.length === 0) {
      return '- None';
    }

    return items.map((item) => `- ${item}`).join('\n');
  }
}
