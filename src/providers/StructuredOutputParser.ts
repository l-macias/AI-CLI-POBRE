import type { z } from 'zod';
import { safeJsonParse } from '../utils/safeJson.js';
import type { JsonValue, Result } from '../types/SharedTypes.js';
import { JsonRepair } from './JsonRepair.js';
import { ResponseSanitizer } from './ResponseSanitizer.js';

export class StructuredOutputParser {
  private readonly sanitizer = new ResponseSanitizer();
  private readonly jsonRepair = new JsonRepair();

  public parseJson(content: string): Result<JsonValue> {
    const sanitized = this.sanitizer.sanitizeJsonLikeContent(content);
    const repaired = this.jsonRepair.repair(sanitized);

    return safeJsonParse(repaired);
  }

  public parseWithSchema<TOutput>(content: string, schema: z.ZodType<TOutput>): Result<TOutput> {
    const parsed = this.parseJson(content);

    if (!parsed.ok) {
      return parsed;
    }

    const validated = schema.safeParse(parsed.value);

    if (!validated.success) {
      return {
        ok: false,
        error: validated.error,
      };
    }

    return {
      ok: true,
      value: validated.data,
    };
  }
}
