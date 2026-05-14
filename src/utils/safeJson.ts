import type { JsonValue, Result } from "../types/SharedTypes.js";

export function safeJsonParse(input: string): Result<JsonValue> {
  try {
    return {
      ok: true,
      value: JSON.parse(input) as JsonValue,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function safeJsonStringify(value: unknown): Result<string> {
  try {
    return {
      ok: true,
      value: JSON.stringify(value, null, 2),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
