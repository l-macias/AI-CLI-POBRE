export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerOptions {
  namespace?: string;
  level?: LogLevel;
}

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  private readonly namespace: string;
  private readonly level: LogLevel;

  public constructor(options: LoggerOptions = {}) {
    this.namespace = options.namespace ?? "zero-runtime";
    this.level = options.level ?? "info";
  }

  public debug(message: string, meta?: unknown): void {
    this.write("debug", message, meta);
  }

  public info(message: string, meta?: unknown): void {
    this.write("info", message, meta);
  }

  public warn(message: string, meta?: unknown): void {
    this.write("warn", message, meta);
  }

  public error(message: string, meta?: unknown): void {
    this.write("error", message, meta);
  }

  private write(level: LogLevel, message: string, meta?: unknown): void {
    if (levelPriority[level] < levelPriority[this.level]) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      namespace: this.namespace,
      message,
      meta,
    };

    const output = JSON.stringify(payload);

    if (level === "error") {
      console.error(output);
      return;
    }

    if (level === "warn") {
      console.warn(output);
      return;
    }

    console.log(output);
  }
}
