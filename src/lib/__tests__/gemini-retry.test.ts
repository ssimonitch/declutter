// Test file to verify Gemini retry logic
// Run with: npx tsx src/lib/__tests__/gemini-retry.test.ts

import { logger } from "../logger";

// Mock Gemini API response behavior
class MockGeminiAPI {
  private attemptCount = 0;
  private failUntilAttempt: number;
  private errorType: string;

  constructor(failUntilAttempt: number = 2, errorType: string = "rate") {
    this.failUntilAttempt = failUntilAttempt;
    this.errorType = errorType;
  }

  async generateContent(): Promise<{ response: { text: () => string } }> {
    this.attemptCount++;
    logger.info(`Mock API attempt ${this.attemptCount}`);

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

    return {
      response: {
        text: () =>
          JSON.stringify({
            nameJapaneseSpecific: "テスト商品",
            nameEnglishSpecific: "Test Item",
            nameJapaneseGeneric: "商品",
            nameEnglishGeneric: "Item",
            description: "Test description",
            category: "その他",
            condition: "good",
            onlineAuctionPriceJPY: { low: 1000, high: 2000, confidence: 0.8 },
            thriftShopPriceJPY: { low: 500, high: 1000, confidence: 0.7 },
            recommendedAction: "keep",
            actionRationale: "Test rationale",
            marketplaces: ["Mercari"],
            searchQueries: ["test"],
            keywords: ["test"],
          }),
      },
    };
  }
}

// Test retry logic implementation (simplified version of the actual logic)
async function testRetryLogic(
  mockApi: MockGeminiAPI,
  maxAttempts: number = 3,
): Promise<{ success: boolean; attempts: number; error?: string }> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxAttempts) {
    try {
      logger.info(
        `Attempting API call (attempt ${attempt + 1}/${maxAttempts})`,
      );
      await mockApi.generateContent();

      return {
        success: true,
        attempts: attempt + 1,
      };
    } catch (err) {
      lastError = err as Error;
      const message = err instanceof Error ? err.message.toLowerCase() : "";

      // Check if we should retry
      const shouldRetry =
        message.includes("quota") ||
        message.includes("rate") ||
        message.includes("timeout") ||
        message.includes("temporar");

      logger.warn(`API call failed`, {
        attempt: attempt + 1,
        error: message,
        shouldRetry,
      });

      if (!shouldRetry) {
        logger.error(`Non-retryable error encountered`, { error: message });
        break;
      }

      // Exponential backoff
      const backoffMs = 250 * Math.pow(2, attempt);
      logger.info(`Waiting ${backoffMs}ms before retry`);
      await new Promise((r) => setTimeout(r, backoffMs));
      attempt++;
    }
  }

  return {
    success: false,
    attempts: attempt, // Return the actual attempt count
    error: lastError?.message,
  };
}

// Run tests
async function runTests() {
  console.log("\n=== Gemini Retry Logic Test Suite ===\n");

  const tests = [
    {
      name: "Successful after 2 retries (rate limit)",
      mockApi: new MockGeminiAPI(3, "rate"),
      expectedSuccess: true,
      expectedAttempts: 3,
    },
    {
      name: "Successful after 1 retry (quota)",
      mockApi: new MockGeminiAPI(2, "quota"),
      expectedSuccess: true,
      expectedAttempts: 2,
    },
    {
      name: "Successful after 2 retries (timeout)",
      mockApi: new MockGeminiAPI(3, "timeout"),
      expectedSuccess: true,
      expectedAttempts: 3,
    },
    {
      name: "Successful after 1 retry (temporary error)",
      mockApi: new MockGeminiAPI(2, "temporary"),
      expectedSuccess: true,
      expectedAttempts: 2,
    },
    {
      name: "Fails immediately on permanent error",
      mockApi: new MockGeminiAPI(3, "permanent"),
      expectedSuccess: false,
      expectedAttempts: 0, // Doesn't retry on permanent errors
    },
    {
      name: "Fails after max attempts exceeded",
      mockApi: new MockGeminiAPI(5, "rate"), // Will fail 4 times, but max is 3
      expectedSuccess: false,
      expectedAttempts: 3, // Max attempts is 3
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\nTest: ${test.name}`);
    console.log("-".repeat(50));

    const result = await testRetryLogic(test.mockApi);

    const success = result.success === test.expectedSuccess;
    const attempts = result.attempts === test.expectedAttempts;
    const testPassed = success && attempts;

    if (testPassed) {
      console.log(`✅ PASSED`);
      passed++;
    } else {
      console.log(`❌ FAILED`);
      failed++;
    }

    console.log(
      `  Expected: success=${test.expectedSuccess}, attempts=${test.expectedAttempts}`,
    );
    console.log(
      `  Actual:   success=${result.success}, attempts=${result.attempts}`,
    );
    if (result.error) {
      console.log(`  Error:    ${result.error}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50) + "\n");

  // Verify backoff timing
  console.log("\n=== Backoff Timing Verification ===\n");
  console.log("Expected backoff delays:");
  for (let i = 0; i < 3; i++) {
    const backoffMs = 250 * Math.pow(2, i);
    console.log(`  Attempt ${i + 1}: ${backoffMs}ms`);
  }

  // Test actual timing
  console.log("\nTesting actual retry timing...");
  const startTime = Date.now();
  const timingApi = new MockGeminiAPI(3, "rate");
  await testRetryLogic(timingApi);
  const elapsedTime = Date.now() - startTime;
  const expectedTime = 250 + 500; // First two retries
  console.log(`  Total elapsed time: ${elapsedTime}ms`);
  console.log(`  Expected minimum time: ${expectedTime}ms`);
  console.log(
    `  Timing test: ${elapsedTime >= expectedTime ? "✅ PASSED" : "❌ FAILED"}`,
  );

  return failed === 0;
}

// Run the tests
runTests()
  .then((success) => {
    if (success) {
      console.log("\n✅ All tests passed!");
      process.exit(0);
    } else {
      console.log("\n❌ Some tests failed!");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("\n❌ Test suite error:", error);
    process.exit(1);
  });
