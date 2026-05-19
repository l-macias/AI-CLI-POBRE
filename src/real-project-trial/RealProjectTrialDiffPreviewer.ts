export interface RealProjectTrialDiffLine {
  line: number;
  current: string | null;
  proposed: string | null;
  type: 'same' | 'changed' | 'added' | 'removed';
}

export interface RealProjectTrialDiffPreview {
  changed: boolean;
  diff: RealProjectTrialDiffLine[];
}

export class RealProjectTrialDiffPreviewer {
  public preview(currentContent: string, proposedContent: string): RealProjectTrialDiffPreview {
    const currentLines = currentContent.split('\n');
    const proposedLines = proposedContent.split('\n');
    const maxLength = Math.max(currentLines.length, proposedLines.length);
    const diff: RealProjectTrialDiffLine[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      const current = currentLines[index] ?? null;
      const proposed = proposedLines[index] ?? null;

      if (current === proposed) {
        diff.push({
          line: index + 1,
          current,
          proposed,
          type: 'same',
        });
        continue;
      }

      if (current === null) {
        diff.push({
          line: index + 1,
          current,
          proposed,
          type: 'added',
        });
        continue;
      }

      if (proposed === null) {
        diff.push({
          line: index + 1,
          current,
          proposed,
          type: 'removed',
        });
        continue;
      }

      diff.push({
        line: index + 1,
        current,
        proposed,
        type: 'changed',
      });
    }

    return {
      changed: diff.some((line) => line.type !== 'same'),
      diff,
    };
  }

  public toCompactMarkdown(preview: RealProjectTrialDiffPreview): string {
    const changedLines = preview.diff.filter((line) => line.type !== 'same');

    if (changedLines.length === 0) {
      return 'No changes proposed.';
    }

    return changedLines
      .map((line) => {
        return [
          `### Line ${line.line} — ${line.type}`,
          '',
          '```diff',
          line.current === null ? '' : `- ${line.current}`,
          line.proposed === null ? '' : `+ ${line.proposed}`,
          '```',
        ]
          .filter((item) => item.length > 0)
          .join('\n');
      })
      .join('\n\n');
  }
}
