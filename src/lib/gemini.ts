// Gemini API client configuration for Declutter App MVP
// Handles AI-powered image analysis with Japanese market context

import {
  GoogleGenerativeAI,
  ObjectSchema,
  SchemaType,
} from "@google/generative-ai";
import type { DeclutterItem } from "./types";

// Model configuration
const DEFAULT_MODEL = "gemini-2.0-flash-latest";
const PRECISION_MODEL = "gemini-2.0-flash";

// Japanese market system prompt for item analysis
const JAPANESE_SYSTEM_PROMPT = `あなたは日本の中古市場に詳しいアシスタントです。入力画像から商品の詳細を分析し、以下の情報を提供してください：

1. 商品名（日本語と英語）
2. 商品の説明
3. カテゴリー（家電、家具、衣類、本・メディア、雑貨、その他）
4. 状態（新品同様/良好/可/要修理など）
5. 日本での中古相場（円、税込）と確信度（0-1）
6. 推奨処分方法：
   - keep: 保管（思い出の品、まだ使用中、価値がある）
   - online: メルカリ、ヤフオク等で販売（1500円以上の価値があり、発送可能なもの）
   - thrift: リサイクルショップへ（大型、低価値だが使用可能）
   - donate: 寄付（自治体施設、NPO等。状態良好だが売却困難）
   - trash: 廃棄または粗大ごみ（壊れている、需要なし）
7. 推奨理由（なぜその処分方法を選んだか）
8. 検索キーワード（メルカリやヤフオクで使える具体的な検索語）
9. 粗大ごみの場合、概算処分費用（自治体により300円〜3000円程度）

日本の主要な中古品取扱店を考慮してください：
- メルカリ（一般的な品物）
- ヤフオク（コレクターズアイテム）
- 2nd STREET（衣類、家具、家電）
- BOOK OFF（本、メディア、小型家電）
- HARD OFF（電化製品、楽器）

家電リサイクル法対象品（エアコン、テレビ、冷蔵庫、洗濯機）や危険物については特記事項に記載してください。`;

// Structured output schema matching DeclutterItem interface
const RESPONSE_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: {
      type: SchemaType.STRING,
      description: "Item name in English",
    },
    nameJapanese: {
      type: SchemaType.STRING,
      description: "Item name in Japanese",
      nullable: true,
    },
    description: {
      type: SchemaType.STRING,
      description: "Detailed item description",
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
    estimatedPriceJPY: {
      type: SchemaType.OBJECT,
      properties: {
        low: {
          type: SchemaType.NUMBER,
          description: "Lower bound of estimated price in JPY",
        },
        high: {
          type: SchemaType.NUMBER,
          description: "Upper bound of estimated price in JPY",
        },
        confidence: {
          type: SchemaType.NUMBER,
          description: "Confidence level in price estimation (0-1)",
        },
      },
      required: ["low", "high", "confidence"],
    },
    recommendedAction: {
      type: SchemaType.STRING,
      enum: ["keep", "trash", "thrift", "online", "donate"],
      description: "Recommended disposal/handling action",
      format: "enum",
    },
    actionRationale: {
      type: SchemaType.STRING,
      description: "Explanation for the recommended action",
      nullable: true,
    },
    marketplaces: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description:
        "Suggested marketplaces for selling (e.g., Mercari, Yahoo Auctions)",
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
        "Special considerations (recycling laws, hazardous materials, etc.)",
    },
    keywords: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description: "Internal search keywords for the item",
    },
    disposalFeeJPY: {
      type: SchemaType.NUMBER,
      description: "Estimated disposal fee for oversized items in JPY",
      nullable: true,
    },
    municipalityCode: {
      type: SchemaType.STRING,
      description: "Municipality code for location-specific disposal info",
      nullable: true,
    },
  },
  required: [
    "name",
    "description",
    "category",
    "condition",
    "estimatedPriceJPY",
    "recommendedAction",
    "marketplaces",
    "searchQueries",
    "specialNotes",
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

// Analysis options
interface AnalysisOptions {
  precisionMode?: boolean;
  municipalityCode?: string;
}

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
  ): Promise<AnalysisResult> {
    try {
      // Select model based on precision mode
      const modelName = options.precisionMode
        ? PRECISION_MODEL
        : this.config.model;
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: this.config.generationConfig,
        systemInstruction: this.buildSystemPrompt(options),
      });

      // Prepare image data
      const imagePart = {
        inlineData: {
          data: imageBase64.split(",")[1], // Remove data:image/...;base64, prefix
          mimeType: this.extractMimeType(imageBase64),
        },
      };

      // Generate content with structured output
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "画像を分析して、指定されたJSON形式で商品情報を返してください。",
              },
              imagePart,
            ],
          },
        ],
        generationConfig: {
          ...this.config.generationConfig,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      // Parse and validate the JSON response
      const parsedData = this.parseAndValidateResponse(text);

      // Add municipality code if provided
      if (options.municipalityCode) {
        parsedData.municipalityCode = options.municipalityCode;
      }

      return parsedData;
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
   * Builds the system prompt with optional municipality context
   */
  private buildSystemPrompt(options: AnalysisOptions): string {
    let prompt = JAPANESE_SYSTEM_PROMPT;

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
      const data = JSON.parse(jsonText);

      // Basic validation of required fields
      const requiredFields = [
        "name",
        "description",
        "category",
        "condition",
        "estimatedPriceJPY",
        "recommendedAction",
        "marketplaces",
        "searchQueries",
        "specialNotes",
        "keywords",
      ];

      for (const field of requiredFields) {
        if (!(field in data)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate estimatedPriceJPY structure
      if (
        !data.estimatedPriceJPY ||
        typeof data.estimatedPriceJPY.low !== "number" ||
        typeof data.estimatedPriceJPY.high !== "number" ||
        typeof data.estimatedPriceJPY.confidence !== "number"
      ) {
        throw new Error("Invalid estimatedPriceJPY structure");
      }

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

      // Ensure strings
      data.name = String(data.name || "Unknown Item");
      data.description = String(data.description || "");
      data.category = String(data.category || "その他");
      data.specialNotes = String(data.specialNotes || "");

      return data as AnalysisResult;
    } catch (error) {
      console.error("Response parsing failed:", error);
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
): Promise<AnalysisResult> {
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
    standard: 0.01, // USD for Flash-Lite
    precision: 0.03, // USD for Flash
  },
} as const;
