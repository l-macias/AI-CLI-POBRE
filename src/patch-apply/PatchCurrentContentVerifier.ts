import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type {
  PatchApplyContentCheckResult,
  PatchApplyIssue,
  PatchApplyPlan,
} from './PatchApplyTypes.js';

export class PatchCurrentContentVerifier {
  public async verify(input: { projectRoot: string; plan: PatchApplyPlan }): Promise<{
    checks: PatchApplyContentCheckResult[];
    issues: PatchApplyIssue[];
  }> {
    const checks: PatchApplyContentCheckResult[] = [];
    const issues: PatchApplyIssue[] = [];

    for (const operation of input.plan.operations) {
      if (operation.expectedCurrentContent === undefined) {
        checks.push({
          targetFile: operation.targetFile,
          expectedContentProvided: false,
          matched: true,
          message: 'No expectedCurrentContent provided.',
        });

        continue;
      }

      const absoluteTarget = resolve(input.projectRoot, operation.targetFile);

      try {
        const currentContent = await readFile(absoluteTarget, 'utf8');
        const matched = currentContent === operation.expectedCurrentContent;

        checks.push({
          targetFile: operation.targetFile,
          expectedContentProvided: true,
          matched,
          message: matched
            ? 'Current content matches expectedCurrentContent.'
            : 'Current content does not match expectedCurrentContent.',
        });

        if (!matched) {
          issues.push({
            code: 'PATCH_APPLY_CURRENT_CONTENT_MISMATCH',
            message: `Current content changed before patch application: ${operation.targetFile}`,
            severity: 'error',
          });
        }
      } catch (error) {
        checks.push({
          targetFile: operation.targetFile,
          expectedContentProvided: true,
          matched: false,
          message: error instanceof Error ? error.message : String(error),
        });

        issues.push({
          code: 'PATCH_APPLY_CURRENT_CONTENT_UNREADABLE',
          message: `Could not verify current content: ${operation.targetFile}`,
          severity: 'error',
        });
      }
    }

    return {
      checks,
      issues,
    };
  }
}
