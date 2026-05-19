import type { ScaffoldProposalParseResult } from './ScaffoldTypes.js';
import { ScaffoldProposalSchema } from './ScaffoldProposalSchema.js';

export interface ScaffoldProposalParserOptions {
  schema?: ScaffoldProposalSchema | undefined;
}

export class ScaffoldProposalParser {
  private readonly schema: ScaffoldProposalSchema;

  public constructor(options: ScaffoldProposalParserOptions = {}) {
    this.schema = options.schema ?? new ScaffoldProposalSchema();
  }

  public parse(rawOutput: string): ScaffoldProposalParseResult {
    const extracted = this.extractJson(rawOutput);

    if (!extracted) {
      return {
        ok: false,
        validation: {
          valid: false,
          issues: [
            {
              code: 'SCAFFOLD_PROPOSAL_JSON_NOT_FOUND',
              message: 'No JSON object found in scaffold provider output.',
              severity: 'error',
            },
          ],
        },
      };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(extracted);
    } catch (error) {
      return {
        ok: false,
        rawJson: extracted,
        validation: {
          valid: false,
          issues: [
            {
              code: 'SCAFFOLD_PROPOSAL_JSON_INVALID',
              message: error instanceof Error ? error.message : String(error),
              severity: 'error',
            },
          ],
        },
      };
    }

    const validation = this.schema.validate(parsed);

    if (!validation.valid || !validation.proposal) {
      return {
        ok: false,
        rawJson: extracted,
        validation: {
          valid: false,
          issues: validation.issues,
        },
      };
    }

    return {
      ok: true,
      proposal: validation.proposal,
      rawJson: extracted,
      validation: {
        valid: true,
        issues: validation.issues,
      },
    };
  }

  private extractJson(rawOutput: string): string | undefined {
    const fenced = this.extractFencedJson(rawOutput);

    if (fenced) {
      return fenced;
    }

    return this.extractBalancedJsonObject(rawOutput);
  }

  private extractFencedJson(rawOutput: string): string | undefined {
    const match = /```(?:json)?\s*([\s\S]*?)```/i.exec(rawOutput);

    if (!match?.[1]) {
      return undefined;
    }

    return match[1].trim();
  }

  private extractBalancedJsonObject(rawOutput: string): string | undefined {
    const firstBrace = rawOutput.indexOf('{');

    if (firstBrace < 0) {
      return undefined;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = firstBrace; index < rawOutput.length; index += 1) {
      const char = rawOutput[index];

      if (char === undefined) {
        continue;
      }

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

        if (depth === 0) {
          return rawOutput.slice(firstBrace, index + 1).trim();
        }
      }
    }

    return undefined;
  }
}
