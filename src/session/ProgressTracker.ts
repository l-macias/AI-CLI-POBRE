import type { ProgressEntry } from '../types/SessionTypes.js';

export class ProgressTracker {
  public append(existingContent: string | null, entry: ProgressEntry): string {
    const base = existingContent?.trim() || '# Progress Log';

    return `${base}

## ${entry.session}

${entry.timestamp}

${entry.message}
`;
  }
}
