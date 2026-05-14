import type { RuntimeCheckpoint } from '../types/CheckpointTypes.js';
import { safeJsonParse, safeJsonStringify } from '../utils/safeJson.js';
import { ZeroRuntimeError } from '../utils/errors.js';

export class SessionSerializer {
  public serialize(checkpoint: RuntimeCheckpoint): string {
    const result = safeJsonStringify(checkpoint);

    if (!result.ok) {
      throw new ZeroRuntimeError('Failed to serialize runtime checkpoint.', {
        code: 'CHECKPOINT_SERIALIZE_FAILED',
        cause: result.error,
      });
    }

    return result.value;
  }

  public deserialize(content: string): RuntimeCheckpoint {
    const result = safeJsonParse(content);

    if (!result.ok) {
      throw new ZeroRuntimeError('Failed to parse runtime checkpoint.', {
        code: 'CHECKPOINT_PARSE_FAILED',
        cause: result.error,
      });
    }

    return result.value as unknown as RuntimeCheckpoint;
  }
}
