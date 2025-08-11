// Exa Search API client for enhanced web search capabilities
// Replaces Google web grounding to enable consistent responseSchema usage
// Includes caching, rate limiting, and cost controls for production safety

import Exa from "exa-js";

// Configuration constants
const EXA_CONFIG = {
  DEFAULT_NUM_RESULTS: 2, // Reduced from 3 to control costs
  MAX_NUM_RESULTS: 3,
  MAX_QUERIES_PER_ITEM: 2, // Reduced from 5 to control costs
  CACHE_TTL_MS: 600000, // 10 minutes
  MAX_REQUESTS_PER_MINUTE: 30, // Rate limit
  ESTIMATED_COST_PER_SEARCH: 0.005, // $0.005 per search
  MAX_DAILY_COST: 5.0, // $5 daily limit
  JAPANESE_MARKETPLACE_DOMAINS: [
    "mercari.com",
    "jp.mercari.com", // Japanese Mercari subdomain
    "auctions.yahoo.co.jp",
    "2ndstreet.jp",
    "hardoff.co.jp",
    "bookoff.co.jp",
    "kakaku.com",
    "amazon.co.jp",
    "rakuten.co.jp",
    "fril.jp", // Rakuma (formerly Fril)
    "jmty.jp", // Jimoty - local classifieds
  ],
  // Removed domain restrictions for disposal info to support all municipalities
  // For MVP, we'll let Exa search broadly for municipal disposal information
  DISPOSAL_INFO_DOMAINS: [] as string[],
  PRICE_REGEX: /[¥￥]\s*([\d,]+)|(\d{1,3}(?:,\d{3})*)\s*円/g,
} as const;

// Search options for Japanese market research
export interface ExaSearchOptions {
  enabled: boolean;
  numResults?: number;
  searchType?: "keyword" | "neural" | "auto";
  category?: string;
  includeDomains?: string[];
}

// Search result structure with proper typing
export interface ExaSearchResult {
  title: string;
  url: string;
  snippet?: string;
  text?: string;
  publishedDate?: string;
}

// Formatted search context for Gemini
export interface ExaSearchContext {
  query: string;
  results: ExaSearchResult[];
  summary: string;
  timestamp: string;
  searchStatus: "success" | "partial" | "failed" | "cached";
  resultCount: number;
  estimatedCost: number;
}

// Cache entry structure
interface CacheEntry {
  data: ExaSearchContext;
  timestamp: number;
}

// Metrics for monitoring
interface ExaMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  totalCost: number;
  dailyCost: number;
  lastResetDate: string;
}

// Type guard for Exa API response validation
interface ExaApiResponse {
  results?: Array<{
    title?: string;
    url: string;
    text?: string;
    publishedDate?: string;
  }>;
}

class ExaClient {
  private client: Exa | null = null;
  private readonly apiKey: string | undefined;
  private cache = new Map<string, CacheEntry>();
  private requestTimestamps: number[] = [];
  private metrics: ExaMetrics;

  constructor() {
    this.apiKey = process.env.EXA_API_KEY;
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize metrics with daily reset
   */
  private initializeMetrics(): ExaMetrics {
    const today = new Date().toISOString().split("T")[0];
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      totalCost: 0,
      dailyCost: 0,
      lastResetDate: today,
    };
  }

  /**
   * Reset daily metrics if needed
   */
  private checkDailyReset(): void {
    const today = new Date().toISOString().split("T")[0];
    if (this.metrics.lastResetDate !== today) {
      this.metrics.dailyCost = 0;
      this.metrics.lastResetDate = today;
      console.log("Exa metrics daily reset completed");
    }
  }

  /**
   * Initialize Exa client (lazy initialization)
   */
  private getClient(): Exa {
    if (!this.apiKey) {
      throw new Error("EXA_API_KEY environment variable is not set");
    }

    if (!this.client) {
      this.client = new Exa(this.apiKey);
    }

    return this.client;
  }

  /**
   * Generate cache key for consistent caching
   */
  private getCacheKey(
    itemName: string,
    options: Partial<ExaSearchOptions>,
  ): string {
    const normalizedName = itemName.toLowerCase().trim();
    const optionsKey = JSON.stringify({
      numResults: options.numResults,
      searchType: options.searchType,
      includeDomains: options.includeDomains,
    });
    return `${normalizedName}-${optionsKey}`;
  }

  /**
   * Check cache for existing results
   */
  private checkCache(cacheKey: string): ExaSearchContext | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < EXA_CONFIG.CACHE_TTL_MS) {
      this.metrics.cacheHits++;
      console.log("Exa cache hit for:", cacheKey);
      return {
        ...cached.data,
        searchStatus: "cached",
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > EXA_CONFIG.CACHE_TTL_MS) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo,
    );

    // Check if we're within rate limit
    if (this.requestTimestamps.length >= EXA_CONFIG.MAX_REQUESTS_PER_MINUTE) {
      console.warn("Exa API rate limit reached");
      return false;
    }

    // Add current timestamp
    this.requestTimestamps.push(now);
    return true;
  }

  /**
   * Check cost limits
   */
  private checkCostLimit(): boolean {
    this.checkDailyReset();

    if (this.metrics.dailyCost >= EXA_CONFIG.MAX_DAILY_COST) {
      console.error(`Daily Exa cost limit reached: $${this.metrics.dailyCost}`);
      return false;
    }

    return true;
  }

  /**
   * Record API request metrics
   */
  private recordRequest(
    success: boolean,
    cached: boolean = false,
    estimatedCost: number = 0,
  ): void {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    if (!cached && estimatedCost > 0) {
      this.metrics.totalCost += estimatedCost;
      this.metrics.dailyCost += estimatedCost;
    }

    // Log metrics periodically
    if (this.metrics.totalRequests % 10 === 0) {
      console.log("Exa metrics:", {
        requests: this.metrics.totalRequests,
        cacheHitRate:
          ((this.metrics.cacheHits / this.metrics.totalRequests) * 100).toFixed(
            1,
          ) + "%",
        dailyCost: `$${this.metrics.dailyCost.toFixed(3)}`,
        totalCost: `$${this.metrics.totalCost.toFixed(3)}`,
      });
    }
  }

  /**
   * Sanitize search terms to prevent injection
   */
  private sanitizeSearchTerm(term: string): string {
    return term
      .replace(/[<>"'&]/g, "") // Remove potentially dangerous characters
      .substring(0, 100) // Limit length
      .trim();
  }

  /**
   * Validate Exa API response
   */
  private isValidExaResponse(response: unknown): response is ExaApiResponse {
    return Boolean(
      response &&
        typeof response === "object" &&
        response !== null &&
        (!("results" in response) ||
          Array.isArray((response as ExaApiResponse).results)),
    );
  }

  /**
   * Validate individual search result
   */
  private isValidSearchResult(result: unknown): result is {
    url: string;
    title?: string;
    text?: string;
    publishedDate?: string;
  } {
    return Boolean(
      result &&
        typeof result === "object" &&
        result !== null &&
        "url" in result &&
        typeof (result as { url: unknown }).url === "string" &&
        (result as { url: string }).url.length > 0,
    );
  }

  /**
   * Search for Japanese market information about an item
   */
  async searchMarketInfo(
    itemName: string,
    options: Partial<ExaSearchOptions> = {},
  ): Promise<ExaSearchContext | null> {
    try {
      // Skip if Exa is not enabled or no API key
      if (!options.enabled || !this.apiKey) {
        return null;
      }

      // Sanitize input
      const sanitizedItemName = this.sanitizeSearchTerm(itemName);
      if (!sanitizedItemName) {
        console.warn("Invalid item name for Exa search");
        return null;
      }

      // Check cache first
      const cacheKey = this.getCacheKey(sanitizedItemName, options);
      const cachedResult = this.checkCache(cacheKey);
      if (cachedResult) {
        this.recordRequest(true, true, 0);
        return cachedResult;
      }

      // Check rate limit and cost limit
      if (!this.checkRateLimit() || !this.checkCostLimit()) {
        this.recordRequest(false, false, 0);
        return null;
      }

      // Clean cache periodically
      if (this.cache.size > 100) {
        this.cleanCache();
      }

      const client = this.getClient();

      // Build optimized search queries (reduced from 5 to 2)
      const queries = this.buildOptimizedQueries(sanitizedItemName, options);
      const allResults: ExaSearchResult[] = [];
      let searchErrors = 0;

      // Search with limited queries for cost control
      const searchPromises = queries
        .slice(0, EXA_CONFIG.MAX_QUERIES_PER_ITEM)
        .map(async (query) => {
          try {
            const searchResponse = await client.searchAndContents(query, {
              numResults: options.numResults || EXA_CONFIG.DEFAULT_NUM_RESULTS,
              type: options.searchType || "auto",
              text: true,
              // Only apply domain restrictions if explicitly provided
              // For marketplace searches, use the default list
              // For disposal searches, search all domains
              ...(options.includeDomains !== undefined
                ? { includeDomains: options.includeDomains }
                : {
                    includeDomains: [
                      ...EXA_CONFIG.JAPANESE_MARKETPLACE_DOMAINS,
                    ],
                  }),
              // Ensuring Japanese results through:
              // 1. Japanese keywords in queries (日本, 中古, etc.)
              // 2. .jp domain preferences in marketplace list
              // 3. Neural search for better Japanese understanding
              // Note: Exa API doesn't have explicit lang/region params yet
            });

            // Validate response
            if (!this.isValidExaResponse(searchResponse)) {
              console.warn("Invalid Exa response structure");
              return [];
            }

            // Process and validate results
            if (searchResponse.results) {
              return searchResponse.results
                .filter(this.isValidSearchResult)
                .map((result) => ({
                  title: result.title || "",
                  url: result.url,
                  snippet: this.extractSnippet(result.text),
                  text: result.text,
                  publishedDate: result.publishedDate,
                }));
            }
            return [];
          } catch (error) {
            searchErrors++;
            console.warn(`Failed to search for query "${query}":`, error);
            return [];
          }
        });

      // Execute searches in parallel for better performance
      const searchResults = await Promise.all(searchPromises);

      // Flatten and collect results
      for (const results of searchResults) {
        allResults.push(...results);
      }

      // Remove duplicates based on URL
      const uniqueResults = this.deduplicateResults(allResults);

      // Calculate estimated cost
      const estimatedCost =
        queries.length * EXA_CONFIG.ESTIMATED_COST_PER_SEARCH;

      // Generate context
      const context: ExaSearchContext = {
        query: sanitizedItemName,
        results: uniqueResults.slice(0, 10), // Limit to top 10 results
        summary: this.generateMarketSummary(uniqueResults),
        timestamp: new Date().toISOString(),
        searchStatus:
          searchErrors === queries.length
            ? "failed"
            : searchErrors > 0
              ? "partial"
              : "success",
        resultCount: uniqueResults.length,
        estimatedCost,
      };

      // Cache the results
      this.cache.set(cacheKey, {
        data: context,
        timestamp: Date.now(),
      });

      // Record metrics
      this.recordRequest(true, false, estimatedCost);

      return context;
    } catch (error) {
      console.error("Exa search failed:", error);
      this.recordRequest(false, false, 0);
      return null;
    }
  }

  /**
   * Build optimized search queries (reduced from 5 to 2 strategic queries)
   */
  private buildOptimizedQueries(
    itemName: string,
    options: Partial<ExaSearchOptions> = {},
  ): string[] {
    // For disposal/municipality searches, don't add marketplace terms
    const isDisposalSearch = options.includeDomains?.length === 0;

    if (isDisposalSearch) {
      // Return the item name as-is for disposal searches
      // The disposal-specific terms are already added by searchDisposalInfo
      return [itemName];
    }

    return [
      // Primary query: Japanese market search with price focus
      // Include Japanese language keywords to boost Japanese results
      `${itemName} 中古 価格 メルカリ ヤフオク 買取 日本`,

      // Secondary query: Direct marketplace search with Japanese context
      options.includeDomains?.length
        ? `${itemName} (site:mercari.com OR site:auctions.yahoo.co.jp OR site:.jp)`
        : `${itemName} 中古市場 日本 価格相場`,
    ].filter(Boolean);
  }

  /**
   * Extract a meaningful snippet from text content
   */
  private extractSnippet(text?: string, maxLength: number = 200): string {
    if (!text || typeof text !== "string") return "";

    // Try to find price mentions or key information
    const priceMatch = text.match(EXA_CONFIG.PRICE_REGEX);

    if (priceMatch && priceMatch.index !== undefined) {
      // Extract context around price mention
      const start = Math.max(0, priceMatch.index - 50);
      const end = Math.min(text.length, priceMatch.index + 150);
      return text.substring(start, end).trim();
    }

    // Otherwise return first part of text
    return text.substring(0, maxLength).trim();
  }

  /**
   * Remove duplicate results based on URL
   */
  private deduplicateResults(results: ExaSearchResult[]): ExaSearchResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      if (!result.url || seen.has(result.url)) {
        return false;
      }
      seen.add(result.url);
      return true;
    });
  }

  /**
   * Generate a market summary from search results
   */
  private generateMarketSummary(results: ExaSearchResult[]): string {
    if (results.length === 0) {
      return "市場データが見つかりませんでした";
    }

    // Extract price information from results
    const prices: number[] = [];
    const marketplaces = new Set<string>();

    results.forEach((result) => {
      // Extract marketplace from URL
      try {
        const urlObj = new URL(result.url);
        marketplaces.add(urlObj.hostname.replace("www.", ""));
      } catch {
        // Invalid URL, skip
      }

      // Extract prices from text
      if (result.text && typeof result.text === "string") {
        const priceMatches = result.text.matchAll(EXA_CONFIG.PRICE_REGEX);
        for (const match of priceMatches) {
          const priceStr = (match[1] || match[2] || "").replace(/,/g, "");
          const price = parseInt(priceStr);
          if (!isNaN(price) && price > 0 && price < 10000000) {
            prices.push(price);
          }
        }
      }
    });

    // Build summary with Japanese context
    let summary = `${results.length}件の商品が${marketplaces.size}つのマーケットプレイスで見つかりました`;

    if (prices.length > 0) {
      prices.sort((a, b) => a - b);
      const minPrice = prices[0];
      const maxPrice = prices[prices.length - 1];
      const medianPrice = prices[Math.floor(prices.length / 2)];

      summary += `。価格帯: ¥${minPrice.toLocaleString("ja-JP")} - ¥${maxPrice.toLocaleString("ja-JP")}`;
      if (prices.length > 2) {
        summary += `（中央値: ¥${medianPrice.toLocaleString("ja-JP")}）`;
      }
    }

    summary += `。取扱サイト: ${Array.from(marketplaces)
      .slice(0, 3)
      .join("、")}`;

    return summary;
  }

  /**
   * Format search context as a prompt enhancement for Gemini
   */
  formatForGeminiPrompt(context: ExaSearchContext): string {
    if (!context || context.results.length === 0) {
      return "";
    }

    let prompt = "\n\n最新の市場調査結果:\n";
    prompt += `検索日時: ${context.timestamp}\n`;
    prompt += `検索状態: ${
      context.searchStatus === "cached"
        ? "キャッシュ済み"
        : context.searchStatus === "success"
          ? "成功"
          : context.searchStatus === "partial"
            ? "部分的成功"
            : "失敗"
    }\n`;
    prompt += `概要: ${context.summary}\n\n`;

    // Include top results
    if (context.results.length > 0) {
      prompt += "関連する出品情報:\n";
      context.results.slice(0, 5).forEach((result, index) => {
        prompt += `${index + 1}. ${result.title}\n`;
        if (result.snippet) {
          prompt += `   ${result.snippet}\n`;
        }
        prompt += `   URL: ${result.url}\n\n`;
      });
    }

    return prompt;
  }

  /**
   * Format search results array for Gemini context
   */
  formatResultsForGemini(results: ExaSearchResult[]): string {
    if (!results || results.length === 0) {
      return "";
    }

    let prompt = "\n\n最新のウェブ検索結果:\n\n";
    results.forEach((result, index) => {
      prompt += `${index + 1}. ${result.title}\n`;
      if (result.snippet) {
        prompt += `   ${result.snippet}\n`;
      }
      prompt += `   URL: ${result.url}\n\n`;
    });

    return prompt;
  }

  /**
   * Check if Exa API is configured and available
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Get current metrics for monitoring
   */
  getMetrics(): ExaMetrics {
    this.checkDailyReset();
    return { ...this.metrics };
  }

  /**
   * Clear cache (for testing or manual reset)
   */
  clearCache(): void {
    this.cache.clear();
    console.log("Exa cache cleared");
  }
}

// Singleton instance
let exaClient: ExaClient | null = null;

/**
 * Get or create Exa client instance
 */
export function getExaClient(): ExaClient {
  if (!exaClient) {
    exaClient = new ExaClient();
  }
  return exaClient;
}

/**
 * Search for Japanese market information using Exa
 */
export async function searchJapaneseMarkets(
  itemName: string,
  options: Partial<ExaSearchOptions> = {},
): Promise<ExaSearchContext | null> {
  const client = getExaClient();
  return client.searchMarketInfo(itemName, options);
}

/**
 * Check if Exa Search is available
 */
export function isExaAvailable(): boolean {
  const client = getExaClient();
  return client.isAvailable();
}

/**
 * Search for Japanese market prices and listings
 */
export async function searchJapaneseMarket(
  itemName: string,
  category: string,
  options: {
    includeText?: boolean;
    maxResults?: number;
    recentOnly?: boolean;
  } = {},
): Promise<ExaSearchResult[]> {
  const client = getExaClient();
  // Ensure Japanese context by adding language hints
  const japaneseItemName = `${itemName} ${category ? category : ""} 日本`;
  const context = await client.searchMarketInfo(japaneseItemName, {
    enabled: true,
    numResults: Math.min(options.maxResults || 3, EXA_CONFIG.MAX_NUM_RESULTS),
    searchType: options.recentOnly ? "neural" : "auto",
    // Let it use default marketplace domains which are all Japanese
  });
  return context?.results || [];
}

/**
 * Search for disposal information based on municipality
 */
export async function searchDisposalInfo(
  itemName: string,
  category: string,
  municipalityCode: string,
): Promise<ExaSearchResult[]> {
  const client = getExaClient();
  // Include city name for better local results (e.g., "202100" -> "駒ヶ根市")
  // This helps Exa find region-specific disposal information
  const cityName =
    municipalityCode === "202100" ? "駒ヶ根市" : municipalityCode;
  // Add "日本" and use Japanese terms to ensure Japanese results
  const disposalQuery = `${itemName} ${category} 粗大ごみ 処分方法 ${cityName} 長野県 日本 自治体`;
  const context = await client.searchMarketInfo(disposalQuery, {
    enabled: true,
    numResults: 3, // Increased for better coverage of local info
    searchType: "neural", // Neural search better understands Japanese context
    // No domain restrictions but we could add .jp preference in future
  });
  return context?.results || [];
}

/**
 * Get current Exa metrics for monitoring
 */
export function getExaMetrics(): ExaMetrics {
  const client = getExaClient();
  return client.getMetrics();
}

// Export types
export type { ExaClient, ExaMetrics };
