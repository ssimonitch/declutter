// Custom error classes for structured error handling

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Configuration errors (API keys, environment variables)
 */
export class ConfigurationError extends AppError {
  constructor(
    message: string = "設定エラーが発生しました。管理者にお問い合わせください。",
  ) {
    super(message, 500, "CONFIGURATION_ERROR");
  }
}

/**
 * Rate limiting / quota errors
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = "AI分析の利用制限に達しました。少し時間をおいてから再度お試しください。",
  ) {
    super(message, 429, "RATE_LIMIT_ERROR");
  }
}

/**
 * Network / timeout errors
 */
export class NetworkError extends AppError {
  constructor(
    message: string = "ネットワークエラーが発生しました。接続を確認して再度お試しください。",
  ) {
    super(message, 503, "NETWORK_ERROR");
  }
}

/**
 * AI service errors (Gemini API)
 */
export class AIServiceError extends AppError {
  constructor(
    message: string = "AIサービスから応答がありませんでした。しばらく待ってから再度お試しください。",
  ) {
    super(message, 503, "AI_SERVICE_ERROR");
  }
}

/**
 * Analysis errors (cannot process image)
 */
export class AnalysisError extends AppError {
  constructor(
    message: string = "画像を分析できませんでした。写真が不鮮明か、識別可能な商品が含まれていない可能性があります。",
  ) {
    super(message, 422, "ANALYSIS_ERROR");
  }
}

/**
 * Validation errors (bad input)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR");
    if (details) {
      Object.assign(this, { details });
    }
  }
}

/**
 * Parse response format errors
 */
export class ParseError extends AppError {
  constructor(
    message: string = "AIの応答を処理できませんでした。別の写真で再度お試しください。",
  ) {
    super(message, 422, "PARSE_ERROR");
  }
}

/**
 * Helper to determine error type from error message or error object
 */
export function categorizeError(error: unknown): AppError {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }

  // If it's an Error with a message, analyze it
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for Japanese error messages (already user-friendly from gemini.ts)
    if (
      message.includes("ai") ||
      message.includes("分析") ||
      message.includes("エラー")
    ) {
      // These are already formatted user-friendly messages from gemini.ts
      // Determine the type based on content
      if (message.includes("利用制限")) {
        return new RateLimitError(error.message);
      }
      if (message.includes("ネットワーク")) {
        return new NetworkError(error.message);
      }
      if (message.includes("設定")) {
        return new ConfigurationError(error.message);
      }
      if (message.includes("応答がありません")) {
        return new AIServiceError(error.message);
      }
      if (message.includes("処理できませんでした")) {
        return new ParseError(error.message);
      }
      // Default to AIServiceError for other Japanese messages
      return new AIServiceError(error.message);
    }

    // English error messages (raw errors)
    if (message.includes("api key") || message.includes("authentication")) {
      return new ConfigurationError();
    }

    if (
      message.includes("quota") ||
      message.includes("rate limit") ||
      message.includes("429")
    ) {
      return new RateLimitError();
    }

    if (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("fetch")
    ) {
      return new NetworkError();
    }

    if (message.includes("empty response") || message.includes("no response")) {
      return new AIServiceError();
    }

    if (
      message.includes("parse") ||
      message.includes("invalid") ||
      message.includes("json")
    ) {
      return new ParseError();
    }

    if (message.includes("analysis") || message.includes("cannot process")) {
      return new AnalysisError();
    }
  }

  // Default to generic error
  return new AppError(
    "画像分析中に予期しないエラーが発生しました。時間をおいてから再度お試しください。",
    500,
    "UNKNOWN_ERROR",
  );
}

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
