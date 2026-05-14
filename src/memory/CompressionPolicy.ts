import type { CompressionPolicyOptions } from '../types/MemoryTypes.js';

export class CompressionPolicy {
  public createDefault(): CompressionPolicyOptions {
    return {
      maxSourceCharacters: 1800,
      maxBulletPoints: 12,
      preserveHeadings: true,
    };
  }

  public merge(input?: Partial<CompressionPolicyOptions>): CompressionPolicyOptions {
    return {
      ...this.createDefault(),
      ...input,
    };
  }
}
