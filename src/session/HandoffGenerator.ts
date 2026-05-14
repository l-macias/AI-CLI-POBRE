import type { HandoffInput } from '../types/SessionTypes.js';

export class HandoffGenerator {
  public generate(input: HandoffInput): string {
    return `# Handoff

## Summary

${input.summary}

## Important Context

${this.renderList(input.importantContext)}

## Resume From

${input.resumeFrom}
`;
  }

  private renderList(items: string[]): string {
    if (items.length === 0) {
      return '- None';
    }

    return items.map((item) => `- ${item}`).join('\n');
  }
}
