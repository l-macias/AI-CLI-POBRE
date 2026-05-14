export class ZeroRuntimeError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;

  public constructor(
    message: string,
    options: { code: string; cause?: unknown },
  ) {
    super(message);
    this.name = "ZeroRuntimeError";
    this.code = options.code;
    this.cause = options.cause;
  }
}
