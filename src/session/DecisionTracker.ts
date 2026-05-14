import type { RuntimeDecision } from '../types/SessionTypes.js';

export class DecisionTracker {
  public append(existingContent: string | null, decision: RuntimeDecision): string {
    const base = existingContent?.trim() || '# Decisions';

    return `${base}

## ${decision.id} - ${decision.title}

${decision.description}
`;
  }
}
