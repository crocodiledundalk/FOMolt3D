export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export function createLogger(level: string = "info"): Logger {
  const minLevel = LOG_LEVEL_ORDER[level as LogLevel] ?? LOG_LEVEL_ORDER.info;

  function log(
    logLevel: LogLevel,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    if (LOG_LEVEL_ORDER[logLevel] < minLevel) return;

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      message,
    };

    if (data) {
      entry.data = data;
    }

    const line = JSON.stringify(entry);

    if (logLevel === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }

  return {
    debug: (msg, data) => log("debug", msg, data),
    info: (msg, data) => log("info", msg, data),
    warn: (msg, data) => log("warn", msg, data),
    error: (msg, data) => log("error", msg, data),
  };
}
