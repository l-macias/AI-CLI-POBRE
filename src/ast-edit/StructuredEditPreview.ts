import type {
  SafeReplacementPlan,
  StructuredEditPreview,
  StructuredEditPreviewLine,
} from '../types/ASTEditTypes.js';

export class StructuredEditPreviewBuilder {
  public build(plan: SafeReplacementPlan): StructuredEditPreview {
    return {
      targetFilePath: plan.targetFilePath,
      intent: plan.intent,
      changed: plan.changed,
      affectedStartLine: plan.affectedStartLine,
      affectedEndLine: plan.affectedEndLine,
      previewLines: this.createSimpleDiff(plan.currentContent, plan.proposedContent),
      proposedContent: plan.proposedContent,
      diffFileInput: {
        target: plan.targetFilePath,
        compareContent: plan.proposedContent,
      },
      issues: plan.issues,
    };
  }

  private createSimpleDiff(
    currentContent: string,
    proposedContent: string,
  ): StructuredEditPreviewLine[] {
    const currentLines = currentContent.split('\n');
    const proposedLines = proposedContent.split('\n');
    const maxLength = Math.max(currentLines.length, proposedLines.length);
    const diff: StructuredEditPreviewLine[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      const current = currentLines[index] ?? null;
      const proposed = proposedLines[index] ?? null;

      if (current === proposed) {
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

    return diff;
  }
}
