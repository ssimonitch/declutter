// Server-side logging utility
// Provides structured logging for better debugging and monitoring

const isDevelopment = process.env.NODE_ENV !== "production";
const isServer = typeof window === "undefined";

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

interface LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  error?: Error;
  stack?: string;
}

class Logger {
  private formatLog(context: LogContext): string {
    if (isDevelopment) {
      // Development: Human-readable format
      return JSON.stringify(context, null, 2);
    } else {
      // Production: Compact JSON for log aggregation services
      return JSON.stringify(context);
    }
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const context: LogContext = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    // Only log on server or in development
    if (!isServer && !isDevelopment) {
      return;
    }

    const formattedLog = this.formatLog(context);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.DEBUG:
        if (isDevelopment) {
          console.log(formattedLog);
        }
        break;
    }
  }

  error(message: string, error?: Error | unknown, additionalData?: unknown) {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;

    this.log(LogLevel.ERROR, message, {
      error: errorData,
      ...(additionalData ? additionalData : {}),
    });
  }

  warn(message: string, data?: unknown) {
    this.log(LogLevel.WARN, message, data);
  }

  info(message: string, data?: unknown) {
    this.log(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, data);
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Helper for Gemini-specific logging
export const geminiLogger = {
  analysisStarted: (modelName: string, options: unknown) => {
    logger.info("Gemini analysis started", { modelName, options });
  },

  analysisCompleted: (itemName: string, category: string) => {
    logger.info("Gemini analysis completed", { itemName, category });
  },

  analysisError: (error: Error | unknown, context?: unknown) => {
    logger.error("Gemini analysis failed", error, context);
  },

  retryAttempt: (attempt: number, error: string) => {
    logger.warn("Gemini retry attempt", { attempt, error });
  },

  apiError: (message: string, details?: unknown) => {
    logger.error(`Gemini API error: ${message}`, undefined, details);
  },
};
