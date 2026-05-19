import type { RealProjectTrialSafetyIssue } from '../types/RealProjectTrialTypes.js';
import {
  RealProjectTrialDiffPreviewer,
  type RealProjectTrialDiffPreview,
} from './RealProjectTrialDiffPreviewer.js';
import { RealProjectTrialFileReader } from './RealProjectTrialFileReader.js';

export interface RealProjectTrialDiffPlanInput {
  projectRoot: string;
  targetFile: string;
  proposedContent: string;
}

export interface RealProjectTrialDiffPlan {
  targetFile: string;
  currentContent: string;
  proposedContent: string;
  preview: RealProjectTrialDiffPreview;
  issues: RealProjectTrialSafetyIssue[];
}

export class RealProjectTrialDiffPlanner {
  private readonly reader = new RealProjectTrialFileReader();
  private readonly previewer = new RealProjectTrialDiffPreviewer();

  public async plan(input: RealProjectTrialDiffPlanInput): Promise<RealProjectTrialDiffPlan> {
    const file = await this.reader.read({
      projectRoot: input.projectRoot,
      relativePath: input.targetFile,
    });

    if (file.issues.some((issue) => issue.severity === 'error')) {
      return {
        targetFile: input.targetFile,
        currentContent: file.content,
        proposedContent: file.content,
        preview: this.previewer.preview(file.content, file.content),
        issues: file.issues,
      };
    }

    const preview = this.previewer.preview(file.content, input.proposedContent);

    return {
      targetFile: input.targetFile,
      currentContent: file.content,
      proposedContent: input.proposedContent,
      preview,
      issues: [],
    };
  }

  public toMarkdown(plan: RealProjectTrialDiffPlan): string {
    return `# Real Project Trial Diff Preview

## Target

${plan.targetFile}

## Issues

${
  plan.issues.map((item) => `- [${item.severity}] ${item.code}: ${item.message}`).join('\n') ||
  '- none'
}

## Diff Preview

${new RealProjectTrialDiffPreviewer().toCompactMarkdown(plan.preview)}

## Notes

No files were edited. This preview was generated from an external patch proposal.
`;
  }
}
