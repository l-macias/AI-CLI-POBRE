import type { z } from 'zod';
import { safeJsonParse } from '../utils/safeJson.js';
import type { JsonValue, Result } from '../types/SharedTypes.js';
import { JsonObjectExtractor } from './JsonObjectExtractor.js';
import { JsonRepair } from './JsonRepair.js';
import { ResponseSanitizer } from './ResponseSanitizer.js';

export class StructuredOutputParser {
  private readonly sanitizer = new ResponseSanitizer();
  private readonly jsonRepair = new JsonRepair();
  private readonly jsonObjectExtractor = new JsonObjectExtractor();

  public parseJson(content: string): Result<JsonValue> {
    const sanitized = this.sanitizer.sanitizeJsonLikeContent(content);
    const extracted = this.jsonObjectExtractor.extract(sanitized);
    const repaired = this.jsonRepair.repair(extracted.content);

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
