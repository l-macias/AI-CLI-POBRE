import type { ZodError } from 'zod';
import { JsonRepair } from '../providers/JsonRepair.js';
import { safeJsonParse } from '../utils/safeJson.js';
import type { Result } from '../types/SharedTypes.js';
import type { PatchProposal } from '../types/RepairTypes.js';
import { patchProposalSchema } from './PatchProposalSchema.js';

export interface PatchProposalParserOptions {
  allowJsonExtraction?: boolean | undefined;
}

export interface PatchProposalParserDependencies {
  jsonRepair?: JsonRepair | undefined;
}

export class PatchProposalParser {
  private readonly jsonRepair: JsonRepair;

  public constructor(dependencies: PatchProposalParserDependencies = {}) {
    this.jsonRepair = dependencies.jsonRepair ?? new JsonRepair();
  }

  public parse(input: string, options: PatchProposalParserOptions = {}): Result<PatchProposal> {
    const jsonText =
      options.allowJsonExtraction === true ? this.extractJsonLikeContent(input) : input.trim();

    const parsed =
      options.allowJsonExtraction === true
        ? this.parseWithRepair(jsonText)
        : safeJsonParse(jsonText);

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

  private parseWithRepair(input: string): Result<unknown> {
    const directParse = safeJsonParse(input);

    if (directParse.ok) {
      return directParse;
    }

    return safeJsonParse(this.jsonRepair.repair(input));
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
    return this.jsonRepair.repair(input);
  }
}
