type LogLevel = "debug" | "info" | "warn" | "error";

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  // Prod builds stay quiet: Zod issues / URLs / bid ids must not land in end-user consoles.
  if (import.meta.env.PROD) {
    return;
  }
  const payload = context ? { message, ...context } : { message };
  switch (level) {
    case "debug":
      console.debug("[BidBlitz]", payload);
      break;
    case "info":
      console.info("[BidBlitz]", payload);
      break;
    case "warn":
      console.warn("[BidBlitz]", payload);
      break;
    case "error":
      console.error("[BidBlitz]", payload);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    log("error", message, context),
};
