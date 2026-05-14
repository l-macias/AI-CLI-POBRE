import type { RuntimeSummary, RuntimeSummaryInput } from '../types/MemoryTypes.js';

export class SummaryMemory {
  public create(input: RuntimeSummaryInput): RuntimeSummary {
    return {
      createdAt: new Date().toISOString(),
      projectName: input.projectName,
      status: this.extractStatus(input.currentState),
      activeModule: this.extractFirstHeadingValue(input.activeModule) ?? 'unknown',
      nextStep: this.extractFirstHeadingValue(input.nextSteps) ?? 'unknown',
      keyDecisions: this.extractRecentBullets(input.decisions, 8),
      recentProgress: this.extractRecentBullets(input.progressLog, 8),
    };
  }

  public render(summary: RuntimeSummary): string {
    return `# Runtime Summary

Created at: ${summary.createdAt}

Project: ${summary.projectName}

Status: ${summary.status}

Active module: ${summary.activeModule}

Next step: ${summary.nextStep}

## Key decisions

${this.renderList(summary.keyDecisions)}

## Recent progress

${this.renderList(summary.recentProgress)}
`;
  }

  private extractStatus(content: string | null): string {
    if (!content) {
      return 'unknown';
    }

    const statusMatch = content.match(/## Status\s+([\s\S]*?)(\n## |\n# |$)/i);

    if (!statusMatch?.[1]) {
      return 'unknown';
    }

    return statusMatch[1].trim().split('\n')[0]?.trim() ?? 'unknown';
  }

  private extractFirstHeadingValue(content: string | null): string | null {
    if (!content) {
      return null;
    }

    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const nonHeading = lines.find((line) => !line.startsWith('#'));

    return nonHeading ?? null;
  }

  private extractRecentBullets(content: string | null, limit: number): string[] {
    if (!content) {
      return [];
    }

    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.replace(/^- /, '').trim())
      .filter(Boolean);

    return lines.slice(-limit);
  }

  private renderList(items: string[]): string {
    if (items.length === 0) {
      return '- none';
    }

    return items.map((item) => `- ${item}`).join('\n');
  }
}
