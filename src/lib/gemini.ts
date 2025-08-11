// Gemini API client configuration for Declutter App MVP
// Handles AI-powered image analysis with Japanese market context
// IMPORTANT: Only use Gemini 2.0 family models or newer - NEVER downgrade to older versions

import {
  GoogleGenerativeAI,
  ObjectSchema,
  SchemaType,
} from "@google/generative-ai";
import type { DeclutterItem } from "./types";
import { searchJapaneseMarket, searchDisposalInfo, getExaClient } from "./exa";

// Model configuration - ONLY use 2.0 family models, 2.5 preferred
// see: https://ai.google.dev/gemini-api/docs/models
const DEFAULT_MODEL = "gemini-2.5-flash";
const PRECISION_MODEL = "gemini-2.5-pro";

// Enhanced Japanese market system prompt for item analysis with conservative pricing approach
const JAPANESE_SYSTEM_PROMPT = `あなたは日本の中古市場に詳しく、保守的な価格評価を行う専門家です。画像から商品を分析し、以下の詳細な情報を構造化して提供してください：

## 商品名の提供（4種類必須）
1. nameJapaneseSpecific: ブランド名・型番・詳細を含む具体的な日本語商品名
   例：「ルイ・ヴィトン モノグラム ショルダーバッグ」「Apple iPhone 14 Pro 128GB」
2. nameEnglishSpecific: ブランド名・型番・詳細を含む具体的な英語商品名
   例："Louis Vuitton Monogram Shoulder Bag", "Apple iPhone 14 Pro 128GB"
3. nameJapaneseGeneric: ブランドを除いた一般的な日本語商品名
   例：「ショルダーバッグ」「スマートフォン」
4. nameEnglishGeneric: ブランドを除いた一般的な英語商品名
   例："Shoulder Bag", "Smartphone"

## 商品説明（重要：3文以内）
商品の外観・特徴を3文以内で簡潔に記述してください。色、サイズ感、目立つ特徴のみに焦点を当て、詳細すぎる説明は避けてください。

## カテゴリーと状態
- カテゴリー：家電、家具、衣類、本・メディア、雑貨、その他
- 状態：new, like_new, good, fair, poor のいずれか

## 価格推定（保守的な評価原則）
**重要：価格は控えめに評価し、過小評価を恐れないこと**

### 価格を大幅に下げる要因：
- 商品状態がfairまたはpoor（使用感、汚れ、傷等）
- 市場に同種商品が多数出品中（供給過多）
- 発送が困難・重い・大きい（送料負担大）
- 需要が低い・流行が過ぎた・季節外れ
- 年式が古い・型落ち・機能が劣る

### ゼロ円～極低価格を付ける基準：
- 明らかな破損・汚損がある商品
- 一般的でありふれた日用品（100円ショップ品等）
- 古い家電・旧型デバイス（需要なし）
- 個人の嗜好に依存する装飾品
- 送料が商品価値を上回る軽微な商品
- 市場に大量出品されている商品

### 価格算出考慮事項：
1. **onlineAuctionPriceJPY**: メルカリ・ヤフオク価格
   - メルカリ手数料：10%
   - 送料：300-1000円（商品により）
   - 梱包材費：100-300円
   - 実際の手取り額 = 売価 × 0.9 - 送料 - 梱包費
   - **市場価格から30-50%減額した保守的価格を設定**

2. **thriftShopPriceJPY**: 実店舗買取価格
   - 店舗買取は通常オンライン価格の30-50%
   - 状態不良品は更に大幅減額（20-70%減）
   - 人気のない商品は買取拒否（0円）もある

### 信頼度スコア（confidence）の基準：
- **高信頼度（0.8-1.0）**：明確な市場データが存在、人気商品
- **中信頼度（0.5-0.7）**：類似品データから推定、一般的商品
- **低信頼度（0.0-0.4）**：推測に頼る、ニッチ商品、状態不明

## 推奨処分方法（現実的な判断）
- **keep**: 思い出の品、現在使用中、高価値品（5000円以上）
- **online**: オンライン販売（1500円以上かつ発送容易、需要確実）
- **thrift**: 店舗持込（大型品、手軽処分希望、まだ価値あり）
- **donate**: 寄付（状態良好だが商業価値500円未満）
- **trash**: 廃棄（破損品、需要なし、処分コスト未満）

**判断基準**：
- 売却予想時間が3ヶ月以上 → thrift/donate推奨
- 梱包・発送が困難 → thrift推奨  
- 実質手取り1000円未満 → donate/trash推奨

## 処分費用（disposalCostJPY）
粗大ごみの場合の概算処分費用（300円〜3000円程度）。該当しない場合はnull。

## 特記事項（specialNotes）
家電リサイクル法対象品（エアコン、テレビ、冷蔵庫、洗濯機）や危険物のみ記載。
特に重要な情報がない場合はnullを返してください。無理に情報を作らないこと。

## 日本の主要中古市場を考慮
- **オンライン**：メルカリ（一般品、手数料10%）、ヤフオク（コレクター品、手数料8.8-10%）
- **実店舗**：2nd STREET（衣類・家具）、BOOK OFF（本・メディア）、HARD OFF（電化製品・楽器）

## 最終確認事項
- 価格は市場相場より低めに設定（過大評価を避ける）
- 状態が良好でも需要が低い商品は大幅減額
- 送料・手数料を十分考慮した実質的価値で評価
- 不明な場合は0円または極低価格を恐れずに設定
- 楽観的予測より現実的・保守的判断を優先

分析は現実性と保守性を最優先とし、売り手の期待より市場の厳しさを反映してください。`;

// Enhanced structured output schema with new response structure
const RESPONSE_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    // New specific name fields with brand and details
    nameJapaneseSpecific: {
      type: SchemaType.STRING,
      description:
        "Specific Japanese name with brand and details (e.g., ルイ・ヴィトン モノグラム ショルダーバッグ)",
    },
    nameEnglishSpecific: {
      type: SchemaType.STRING,
      description:
        "Specific English name with brand and details (e.g., Louis Vuitton Monogram Shoulder Bag)",
    },
    // New generic name fields without brand
    nameJapaneseGeneric: {
      type: SchemaType.STRING,
      description:
        "Generic Japanese name without brand (e.g., ショルダーバッグ)",
    },
    nameEnglishGeneric: {
      type: SchemaType.STRING,
      description: "Generic English name without brand (e.g., Shoulder Bag)",
    },
    description: {
      type: SchemaType.STRING,
      description:
        "Concise item description (maximum 3 sentences describing appearance)",
    },
    category: {
      type: SchemaType.STRING,
      description:
        "Product category (家電、家具、衣類、本・メディア、雑貨、その他)",
    },
    condition: {
      type: SchemaType.STRING,
      enum: ["new", "like_new", "good", "fair", "poor"],
      description: "Item condition assessment",
      format: "enum",
    },
    // Separate price estimations for different markets
    onlineAuctionPriceJPY: {
      type: SchemaType.OBJECT,
      properties: {
        low: {
          type: SchemaType.NUMBER,
          description:
            "Lower bound of online marketplace price in JPY (Mercari, Yahoo Auctions)",
        },
        high: {
          type: SchemaType.NUMBER,
          description: "Upper bound of online marketplace price in JPY",
        },
        confidence: {
          type: SchemaType.NUMBER,
          description: "Confidence level in online price estimation (0-1)",
        },
      },
      required: ["low", "high", "confidence"],
    },
    thriftShopPriceJPY: {
      type: SchemaType.OBJECT,
      properties: {
        low: {
          type: SchemaType.NUMBER,
          description:
            "Lower bound of thrift shop price in JPY (2nd STREET, BOOK OFF, etc.)",
        },
        high: {
          type: SchemaType.NUMBER,
          description: "Upper bound of thrift shop price in JPY",
        },
        confidence: {
          type: SchemaType.NUMBER,
          description: "Confidence level in thrift shop price estimation (0-1)",
        },
      },
      required: ["low", "high", "confidence"],
    },
    // Renamed disposal cost field
    disposalCostJPY: {
      type: SchemaType.NUMBER,
      description:
        "Estimated disposal cost for oversized items in JPY (null if not applicable)",
      nullable: true,
    },
    recommendedAction: {
      type: SchemaType.STRING,
      enum: ["keep", "trash", "thrift", "online", "donate"],
      description:
        "Recommended disposal/handling action considering both price and ease of disposal",
      format: "enum",
    },
    actionRationale: {
      type: SchemaType.STRING,
      description:
        "Clear explanation for the recommended action including price vs convenience factors",
    },
    marketplaces: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description:
        "Suggested marketplaces for selling (e.g., Mercari, Yahoo Auctions, 2nd STREET)",
    },
    searchQueries: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description: "Suggested search keywords for marketplaces",
    },
    specialNotes: {
      type: SchemaType.STRING,
      description:
        "Special considerations for recycling laws, hazardous materials, etc. Return null if nothing important to note.",
      nullable: true,
    },
    keywords: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description: "Internal search keywords for the item",
    },
    municipalityCode: {
      type: SchemaType.STRING,
      description: "Municipality code for location-specific disposal info",
      nullable: true,
    },
  },
  required: [
    "nameJapaneseSpecific",
    "nameEnglishSpecific",
    "nameJapaneseGeneric",
    "nameEnglishGeneric",
    "description",
    "category",
    "condition",
    "onlineAuctionPriceJPY",
    "thriftShopPriceJPY",
    "recommendedAction",
    "actionRationale",
    "marketplaces",
    "searchQueries",
    "keywords",
  ],
};

// Gemini client configuration
interface GeminiConfig {
  apiKey: string;
  model?: string;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

// Analysis options with enhanced error reporting
interface AnalysisOptions {
  precisionMode?: boolean;
  municipalityCode?: string;
  exaSearch?: boolean;
  itemNameHint?: string; // Hint for Exa search from initial analysis
}

// Enhanced analysis result with search metadata
export type EnhancedAnalysisResult = AnalysisResult & {
  exaSearchStatus?: "success" | "partial" | "failed" | "disabled" | "cached";
  exaResultCount?: number;
  exaEstimatedCost?: number;
};

// Analysis result type
type AnalysisResult = Omit<
  DeclutterItem,
  "id" | "createdAt" | "updatedAt" | "photo" | "thumbnail"
>;

class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private readonly config: Required<GeminiConfig>;

  constructor(config: GeminiConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.config = {
      apiKey: config.apiKey,
      model: config.model || DEFAULT_MODEL,
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent, factual responses
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        ...config.generationConfig,
      },
    };
  }

  /**
   * Analyzes an image and returns structured item metadata
   */
  async analyzeImage(
    imageBase64: string,
    options: AnalysisOptions = {},
  ): Promise<EnhancedAnalysisResult> {
    try {
      // Select model based on features needed
      // Both standard and precision models support web grounding in 2.0 family
      const modelName = options.precisionMode
        ? PRECISION_MODEL
        : this.config.model;

      if (options.exaSearch) {
        console.log("Exa Search enabled with model:", modelName);
      }

      // Perform Exa search if enabled
      let webSearchContext = "";
      if (options.exaSearch) {
        try {
          // Initial quick analysis to get basic item info for search
          const quickModel = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 200,
            },
          });

          const quickAnalysis = await quickModel.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: "この画像の商品名と商品カテゴリーを簡潔に日本語で答えてください。形式: 商品名: xxx, カテゴリー: xxx",
                  },
                  {
                    inlineData: {
                      data: imageBase64.split(",")[1],
                      mimeType: this.extractMimeType(imageBase64),
                    },
                  },
                ],
              },
            ],
          });

          const quickText = quickAnalysis.response.text();
          const itemNameMatch = quickText.match(/商品名:?\s*([^,\n]+)/);
          const categoryMatch = quickText.match(/カテゴリー:?\s*([^,\n]+)/);

          const itemName = itemNameMatch ? itemNameMatch[1].trim() : "商品";
          const category = categoryMatch ? categoryMatch[1].trim() : "";

          console.log("Quick analysis for Exa search:", { itemName, category });

          // Search for market information with relaxed parameters for MVP
          const marketResults = await searchJapaneseMarket(itemName, category, {
            includeText: true,
            maxResults: 5, // Balanced for cost vs coverage
            recentOnly: false, // Include all results for better coverage
          });

          // Search for disposal information if we have municipality
          const disposalResults = options.municipalityCode
            ? await searchDisposalInfo(
                itemName,
                category,
                options.municipalityCode,
              )
            : [];

          // Format results for Gemini context
          const exaClient = getExaClient();
          webSearchContext = exaClient.formatResultsForGemini([
            ...marketResults,
            ...disposalResults,
          ]);

          console.log("Exa search completed:", {
            marketResults: marketResults.length,
            disposalResults: disposalResults.length,
            contextLength: webSearchContext.length,
          });
        } catch (error) {
          console.error(
            "Exa search failed, continuing without web data:",
            error,
          );
          webSearchContext =
            "ウェブ検索エラー: 最新の市場情報の取得に失敗しました。既知の情報で分析を続行します。";
        }
      }

      // Configure model with structured output (always enabled now)
      const modelConfig: Parameters<typeof this.genAI.getGenerativeModel>[0] = {
        model: modelName,
        generationConfig: {
          ...this.config.generationConfig,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
        systemInstruction: this.buildSystemPrompt(options, webSearchContext),
      };

      const model = this.genAI.getGenerativeModel(modelConfig);

      // Prepare image data
      const imagePart = {
        inlineData: {
          data: imageBase64.split(",")[1], // Remove data:image/...;base64, prefix
          mimeType: this.extractMimeType(imageBase64),
        },
      };

      // Generate content with structured output
      const generateOnce = async () => {
        const prompt =
          "画像を分析して、指定されたJSON形式で商品情報を返してください。";

        return model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt,
                },
                imagePart,
              ],
            },
          ],
        });
      };

      const maxAttempts = 3;
      let attempt = 0;
      let lastError: unknown = null;
      let result: Awaited<ReturnType<typeof generateOnce>> | null = null;
      while (attempt < maxAttempts) {
        try {
          result = await generateOnce();
          break;
        } catch (err) {
          lastError = err;
          const message = err instanceof Error ? err.message.toLowerCase() : "";
          // Retry on transient/rate/timeout conditions
          const shouldRetry =
            message.includes("quota") ||
            message.includes("rate") ||
            message.includes("timeout") ||
            message.includes("temporar");
          if (!shouldRetry) break;
          const backoffMs = 250 * Math.pow(2, attempt); // 250ms, 500ms, 1000ms
          await new Promise((r) => setTimeout(r, backoffMs));
          attempt += 1;
        }
      }
      if (!result) {
        throw lastError instanceof Error
          ? lastError
          : new Error("Gemini request failed");
      }

      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      // Debug logging for response
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "Raw Gemini response (first 500 chars):",
          text.substring(0, 500),
        );
        console.log("Response length:", text.length);
        console.log("Exa search mode:", options.exaSearch);
      }

      // Parse and validate the JSON response
      // With Exa search, we always get structured JSON responses
      const parsedData = this.parseAndValidateResponse(text);

      // Add municipality code if provided
      if (options.municipalityCode) {
        parsedData.municipalityCode = options.municipalityCode;
      }

      // Create enhanced result with Exa metadata
      const enhancedResult: EnhancedAnalysisResult = {
        ...parsedData,
        exaSearchStatus: options.exaSearch
          ? webSearchContext && webSearchContext.includes("ウェブ検索エラー")
            ? "failed"
            : "success"
          : "disabled",
        exaResultCount: options.exaSearch
          ? webSearchContext
            ? webSearchContext
                .split("\n")
                .filter((line) => line.startsWith("-")).length
            : 0
          : undefined,
        exaEstimatedCost: options.exaSearch
          ? GEMINI_CONSTANTS.ESTIMATED_COST_PER_ANALYSIS.exaSearch
          : options.precisionMode
            ? GEMINI_CONSTANTS.ESTIMATED_COST_PER_ANALYSIS.precision
            : GEMINI_CONSTANTS.ESTIMATED_COST_PER_ANALYSIS.standard,
      };

      return enhancedResult;
    } catch (error) {
      console.error("Gemini API analysis failed:", error);

      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Image analysis failed: ${error.message}`);
      }
      throw new Error("Image analysis failed: Unknown error");
    }
  }

  /**
   * Builds the system prompt with optional municipality and web search context
   */
  private buildSystemPrompt(
    options: AnalysisOptions,
    webSearchContext?: string,
  ): string {
    let prompt = JAPANESE_SYSTEM_PROMPT;

    // Add web search context if available
    if (webSearchContext && webSearchContext.trim()) {
      prompt += `\n\n${webSearchContext}\n\n上記のウェブ検索結果を参考に、最新の市場価格と処分情報を考慮して分析してください。`;
    }

    // Add municipality-specific context if provided
    if (options.municipalityCode) {
      prompt += `\n\n現在の自治体コード: ${options.municipalityCode}\nこの自治体の粗大ごみ処分規則を考慮してください。`;
    }

    return prompt;
  }

  /**
   * Extracts MIME type from base64 data URL
   */
  private extractMimeType(base64: string): string {
    const match = base64.match(/^data:([^;]+);base64,/);
    return match ? match[1] : "image/jpeg";
  }

  /**
   * Parses and validates the JSON response from Gemini
   */
  private parseAndValidateResponse(jsonText: string): AnalysisResult {
    try {
      // Clean up the response text (sometimes Gemini adds markdown code blocks)
      let cleanedText = jsonText.trim();

      // Remove markdown code block markers if present
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.substring(7);
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.substring(3);
      }

      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }

      cleanedText = cleanedText.trim();

      const data = JSON.parse(cleanedText);

      // Validate new required fields
      const newRequiredFields = [
        "nameJapaneseSpecific",
        "nameEnglishSpecific",
        "nameJapaneseGeneric",
        "nameEnglishGeneric",
        "description",
        "category",
        "condition",
        "onlineAuctionPriceJPY",
        "thriftShopPriceJPY",
        "recommendedAction",
        "actionRationale",
        "marketplaces",
        "searchQueries",
        "keywords",
      ];

      for (const field of newRequiredFields) {
        if (!(field in data)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate new price structures
      interface PriceStructure {
        low: number;
        high: number;
        confidence: number;
      }

      const validatePriceStructure = (priceObj: unknown, fieldName: string) => {
        if (!priceObj || typeof priceObj !== "object" || priceObj === null) {
          throw new Error(`Invalid ${fieldName} structure`);
        }

        const price = priceObj as Partial<PriceStructure>;
        if (
          typeof price.low !== "number" ||
          typeof price.high !== "number" ||
          typeof price.confidence !== "number"
        ) {
          throw new Error(`Invalid ${fieldName} structure`);
        }
      };

      validatePriceStructure(
        data.onlineAuctionPriceJPY,
        "onlineAuctionPriceJPY",
      );
      validatePriceStructure(data.thriftShopPriceJPY, "thriftShopPriceJPY");

      // Validate enums
      const validConditions = ["new", "like_new", "good", "fair", "poor"];
      if (!validConditions.includes(data.condition)) {
        console.warn(
          `Invalid condition: ${data.condition}, defaulting to 'good'`,
        );
        data.condition = "good";
      }

      const validActions = ["keep", "trash", "thrift", "online", "donate"];
      if (!validActions.includes(data.recommendedAction)) {
        console.warn(
          `Invalid recommended action: ${data.recommendedAction}, defaulting to 'keep'`,
        );
        data.recommendedAction = "keep";
      }

      // Ensure arrays are arrays
      data.marketplaces = Array.isArray(data.marketplaces)
        ? data.marketplaces
        : [];
      data.searchQueries = Array.isArray(data.searchQueries)
        ? data.searchQueries
        : [];
      data.keywords = Array.isArray(data.keywords) ? data.keywords : [];

      // Ensure strings with new field validation
      data.nameJapaneseSpecific = String(data.nameJapaneseSpecific || "");
      data.nameEnglishSpecific = String(data.nameEnglishSpecific || "");
      data.nameJapaneseGeneric = String(data.nameJapaneseGeneric || "");
      data.nameEnglishGeneric = String(data.nameEnglishGeneric || "");
      data.description = String(data.description || "");
      data.category = String(data.category || "その他");
      data.actionRationale = String(data.actionRationale || "");
      // specialNotes can be null, so only convert if it's not null
      if (data.specialNotes !== null) {
        data.specialNotes = String(data.specialNotes || "");
      }

      return data as AnalysisResult;
    } catch (error) {
      console.error("Response parsing failed:", error);
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to parse JSON:", jsonText.substring(0, 200));
      }
      throw new Error(
        `Invalid response format: ${error instanceof Error ? error.message : "Unknown parsing error"}`,
      );
    }
  }

  /**
   * Tests the API connection and configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.config.model,
      });

      const result = await model.generateContent("Hello, are you working?");
      const response = result.response;

      return Boolean(response.text());
    } catch (error) {
      console.error("Gemini connection test failed:", error);
      return false;
    }
  }

  /**
   * Gets the current model configuration
   */
  getConfig(): Readonly<Required<GeminiConfig>> {
    return { ...this.config };
  }
}

// Singleton instance factory
let geminiClient: GeminiClient | null = null;

/**
 * Gets or creates the Gemini client instance
 */
export function getGeminiClient(): GeminiClient {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  if (!geminiClient) {
    geminiClient = new GeminiClient({ apiKey });
  }

  return geminiClient;
}

/**
 * Helper function for image analysis
 */
export async function analyzeItemImage(
  imageBase64: string,
  options: AnalysisOptions = {},
): Promise<EnhancedAnalysisResult> {
  const client = getGeminiClient();
  return client.analyzeImage(imageBase64, options);
}

/**
 * Helper function to test API connectivity
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const client = getGeminiClient();
    return client.testConnection();
  } catch (error) {
    console.error("Failed to test Gemini connection:", error);
    return false;
  }
}

// Export types for external use
export type { AnalysisOptions, AnalysisResult, GeminiConfig };

// Export constants
export const GEMINI_CONSTANTS = {
  DEFAULT_MODEL,
  PRECISION_MODEL,
  SUPPORTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  MAX_IMAGE_SIZE_MB: 10,
  ESTIMATED_COST_PER_ANALYSIS: {
    standard: 0.001, // gemini-2.5-flash: Very cost-effective
    precision: 0.003, // gemini-2.5-pro: Higher for advanced reasoning
    exaSearch: 0.006, // Exa search: $0.005 per search + Gemini processing
  },
} as const;
