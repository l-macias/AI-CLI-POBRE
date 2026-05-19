import type { ZodError } from 'zod';
import { safeJsonParse } from '../utils/safeJson.js';
import type { Result } from '../types/SharedTypes.js';
import type { PatchProposal } from '../types/RepairTypes.js';
import { patchProposalSchema } from './PatchProposalSchema.js';

export interface PatchProposalParserOptions {
  allowJsonExtraction?: boolean | undefined;
}

export class PatchProposalParser {
  public parse(input: string, options: PatchProposalParserOptions = {}): Result<PatchProposal> {
    const jsonText =
      options.allowJsonExtraction === true ? this.extractJsonLikeContent(input) : input.trim();

    const parsed = safeJsonParse(jsonText);

    if (!parsed.ok) {
      return {
        ok: false,
        error: new Error(`Invalid PatchProposal JSON: ${parsed.error.message}`),
      };
    }

    const validated = patchProposalSchema.safeParse(parsed.value);

    if (!validated.success) {
      return {
        ok: false,
        error: new Error(this.formatSchemaError(validated.error)),
      };
    }

    return {
      ok: true,
      value: validated.data,
    };
  }

  private formatSchemaError(error: ZodError): string {
    const invalidOperationIssue = error.issues.find((issue) => {
      return (
        issue.path.length >= 2 &&
        issue.path[0] === 'operations' &&
        typeof issue.path[1] === 'number' &&
        (issue.path[2] === 'kind' || issue.code === 'invalid_union_discriminator')
      );
    });

    if (invalidOperationIssue && typeof invalidOperationIssue.path[1] === 'number') {
      return `Patch operation at index ${invalidOperationIssue.path[1]} kind must be replace_file, edit_file, create_file, or delete_file.`;
    }

    const operationTargetIssue = error.issues.find((issue) => {
      return (
        issue.path.length >= 3 &&
        issue.path[0] === 'operations' &&
        typeof issue.path[1] === 'number' &&
        issue.path[2] === 'targetFile'
      );
    });

    if (operationTargetIssue && typeof operationTargetIssue.path[1] === 'number') {
      return `Patch operation at index ${operationTargetIssue.path[1]} targetFile must be a non-empty string.`;
    }

    const operationReasonIssue = error.issues.find((issue) => {
      return (
        issue.path.length >= 3 &&
        issue.path[0] === 'operations' &&
        typeof issue.path[1] === 'number' &&
        issue.path[2] === 'reason'
      );
    });

    if (operationReasonIssue && typeof operationReasonIssue.path[1] === 'number') {
      return `Patch operation at index ${operationReasonIssue.path[1]} reason must be a non-empty string.`;
    }

    const operationNewContentIssue = error.issues.find((issue) => {
      return (
        issue.path.length >= 3 &&
        issue.path[0] === 'operations' &&
        typeof issue.path[1] === 'number' &&
        issue.path[2] === 'newContent'
      );
    });

    if (operationNewContentIssue && typeof operationNewContentIssue.path[1] === 'number') {
      return `Patch operation at index ${operationNewContentIssue.path[1]} newContent must be a string.`;
    }

    const firstIssue = error.issues[0];

    if (!firstIssue) {
      return 'Patch proposal schema validation failed.';
    }

    const path = firstIssue.path.length > 0 ? firstIssue.path.join('.') : 'root';

    return `Patch proposal schema validation failed at ${path}: ${firstIssue.message}`;
  }

  private extractJsonLikeContent(input: string): string {
    const stripped = this.stripMarkdownFence(input.trim());
    const extracted = this.extractFirstJsonObject(stripped);

    return extracted ?? stripped;
  }

  private stripMarkdownFence(input: string): string {
    if (input.startsWith('```json')) {
      return input
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    }

    if (input.startsWith('```')) {
      return input
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    }

    return input;
  }

  private extractFirstJsonObject(input: string): string | null {
    const start = input.indexOf('{');

    if (start === -1) {
      return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < input.length; index += 1) {
      const char = input[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        depth += 1;
      }

      if (char === '}') {
        depth -= 1;
      }

      if (depth === 0) {
        return input.slice(start, index + 1);
      }
    }

    return null;
  }
}
