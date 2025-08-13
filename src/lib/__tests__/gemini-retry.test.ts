import { describe, it, expect, vi } from "vitest";
import { executeWithExponentialBackoff } from "../retry";

class ControlledOperation {
  private attemptCount = 0;
  constructor(
    private readonly failUntilAttempt: number,
    private readonly errorType: string,
  ) {}

  async run(): Promise<string> {
    this.attemptCount++;
    if (this.attemptCount < this.failUntilAttempt) {
      const errors: Record<string, string> = {
        rate: "Rate limit exceeded. Please try again later.",
        quota: "Quota exceeded for this API key.",
        timeout: "Request timeout after 30 seconds.",
        temporary: "Temporary server error. Please retry.",
        permanent: "Invalid API key provided.",
      };
      throw new Error(errors[this.errorType] || "Unknown error");
    }
    return "ok";
  }
}

describe("executeWithExponentialBackoff", () => {
  it("succeeds after 2 retries on rate limit", async () => {
    const op = new ControlledOperation(3, "rate");
    const sleep = vi.fn((ms: number) => {
      void ms;
      return Promise.resolve();
    });
    const onRetryAttempt = vi.fn();
    await expect(
      executeWithExponentialBackoff(() => op.run(), {
        maxAttempts: 3,
        baseDelayMs: 250,
        shouldRetry: (err: unknown) => {
          const msg =
            err instanceof Error
              ? err.message.toLowerCase()
              : String(err).toLowerCase();
          return (
            msg.includes("quota") ||
            msg.includes("rate") ||
            msg.includes("timeout") ||
            msg.includes("temporar")
          );
        },
        onRetryAttempt,
        sleep,
      }),
    ).resolves.toBe("ok");
    expect(onRetryAttempt).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 250);
    expect(sleep).toHaveBeenNthCalledWith(2, 500);
  });

  it("stops immediately on permanent error", async () => {
    const op = new ControlledOperation(99, "permanent");
    const onRetryAttempt = vi.fn();
    await expect(
      executeWithExponentialBackoff(() => op.run(), {
        onRetryAttempt,
        shouldRetry: (err: unknown) => {
          const msg =
            err instanceof Error
              ? err.message.toLowerCase()
              : String(err).toLowerCase();
          return (
            msg.includes("quota") ||
            msg.includes("rate") ||
            msg.includes("timeout") ||
            msg.includes("temporar")
          );
        },
        sleep: (ms: number) => {
          void ms;
          return Promise.resolve();
        },
      }),
    ).rejects.toThrow(/invalid api key/i);
    expect(onRetryAttempt).toHaveBeenCalledTimes(1);
  });

  it("fails after max attempts exceeded", async () => {
    const op = new ControlledOperation(5, "rate");
    const sleep = vi.fn((ms: number) => {
      void ms;
      return Promise.resolve();
    });
    const onRetryAttempt = vi.fn();
    await expect(
      executeWithExponentialBackoff(() => op.run(), {
        maxAttempts: 3,
        baseDelayMs: 250,
        shouldRetry: (err: unknown) => {
          const msg =
            err instanceof Error
              ? err.message.toLowerCase()
              : String(err).toLowerCase();
          return (
            msg.includes("quota") ||
            msg.includes("rate") ||
            msg.includes("timeout") ||
            msg.includes("temporar")
          );
        },
        onRetryAttempt,
        sleep,
      }),
    ).rejects.toThrow();
    // Two retries occur (after first and second failure); third failure throws
    expect(onRetryAttempt).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 250);
    expect(sleep).toHaveBeenNthCalledWith(2, 500);
  });
});
