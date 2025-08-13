export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetryAttempt?: (attempt: number, errorMessage: string) => void;
  sleep?: (ms: number) => Promise<void>;
  jitterRatio?: number; // 0.0 - 1.0 range; 0 means no jitter
}

/**
 * Default predicate to decide if an error is transient and should be retried.
 * - Prefers HTTP-like status codes commonly considered transient
 * - Includes common network/timeout codes and AbortError
 */
export function defaultShouldRetry(error: unknown): boolean {
  const httpLike = error as {
    status?: number;
    code?: number | string;
    response?: { status?: number };
    name?: string;
  };

  const status: number | undefined =
    httpLike?.status ?? httpLike?.response?.status;
  if (typeof status === "number") {
    if ([408, 429, 500, 502, 503, 504].includes(status)) return true;
    return false;
  }

  const code = httpLike?.code;
  if (
    typeof code === "string" &&
    ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND", "EPIPE"].includes(
      code,
    )
  ) {
    return true;
  }

  if (httpLike?.name === "AbortError") {
    return true;
  }

  return false;
}

/**
 * Executes an async function with exponential backoff retry policy.
 * Defaults are aligned with the Gemini client usage.
 */
export async function executeWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250; // 250ms, 500ms, 1000ms
  const sleep: (ms: number) => Promise<void> =
    options.sleep ??
    ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const jitterRatio = Math.max(0, Math.min(1, options.jitterRatio ?? 0));

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < maxAttempts) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err ?? "");

      const shouldRetry = options.shouldRetry
        ? options.shouldRetry(err)
        : defaultShouldRetry(err);

      options.onRetryAttempt?.(attempt + 1, message);

      if (!shouldRetry) break;

      const base = baseDelayMs * Math.pow(2, attempt);
      const jitter =
        jitterRatio > 0
          ? base * (Math.random() * 2 * jitterRatio - jitterRatio)
          : 0;
      const delayMs = Math.max(0, Math.round(base + jitter));
      await sleep(delayMs);
      attempt += 1;
    }
  }

  // If we exit the loop without returning, throw the last error
  throw lastError instanceof Error
    ? lastError
    : new Error("Retry operation failed");
}
