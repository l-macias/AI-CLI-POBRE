export interface CommandOutputLimitResult {
  output: string;
  truncated: boolean;
  originalBytes: number;
  returnedBytes: number;
}

export class CommandOutputLimiter {
  public limit(output: string, maxBytes: number): CommandOutputLimitResult {
    const buffer = Buffer.from(output, 'utf8');

    if (buffer.byteLength <= maxBytes) {
      return {
        output,
        truncated: false,
        originalBytes: buffer.byteLength,
        returnedBytes: buffer.byteLength,
      };
    }

    const sliced = buffer.subarray(0, maxBytes).toString('utf8');

    return {
      output: sliced,
      truncated: true,
      originalBytes: buffer.byteLength,
      returnedBytes: Buffer.byteLength(sliced, 'utf8'),
    };
  }
}
