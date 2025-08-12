// API Route for Gemini-powered image analysis
// Processes uploaded images and returns structured item metadata

import { NextRequest, NextResponse } from "next/server";
import { analyzeItemImage, testGeminiConnection } from "@/lib/gemini";
import { getExaMetrics } from "@/lib/exa";
import { logger } from "@/lib/logger";
import type { AnalyzeApiResponse } from "@/lib/types";

// Maximum file size for uploads (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Supported image MIME types (unified across the app)
const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/**
 * POST /api/analyze
 * Analyzes an uploaded image using Gemini AI and returns structured metadata
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<AnalyzeApiResponse>> {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    // Validate environment variables
    if (!process.env.GEMINI_API_KEY) {
      logger.error("GEMINI_API_KEY environment variable not configured");
      return NextResponse.json(
        {
          success: false,
          error: "API configuration error. Please check server configuration.",
        },
        { status: 500 },
      );
    }

    // EXA_API_KEY is only required if exaSearch is enabled
    if (formData.get("exaSearch") === "true" && !process.env.EXA_API_KEY) {
      logger.error(
        "EXA_API_KEY environment variable not configured for Exa search",
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Exa Search configuration error. Please check server configuration.",
        },
        { status: 500 },
      );
    }
    const imageFile = formData.get("image") as File;
    const precisionMode = formData.get("precisionMode") === "true";
    const municipalityCode = formData.get("municipalityCode") as string | null;
    const exaSearch = formData.get("exaSearch") === "true";

    // Validate required fields
    if (!imageFile) {
      return NextResponse.json(
        {
          success: false,
          error: "No image file provided. Please upload an image.",
        },
        { status: 400 },
      );
    }

    // Validate file type
    if (!SUPPORTED_MIME_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported image format: ${imageFile.type}. Supported formats: JPEG, PNG, WebP`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (imageFile.size > MAX_FILE_SIZE) {
      const sizeMB = Math.round(imageFile.size / (1024 * 1024));
      return NextResponse.json(
        {
          success: false,
          error: `Image too large: ${sizeMB}MB. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 400 },
      );
    }

    // Validate file is actually an image
    if (imageFile.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Empty file provided. Please upload a valid image.",
        },
        { status: 400 },
      );
    }

    // Convert image to base64 using Node.js Buffer (server-side)
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const base64Image = `data:${imageFile.type};base64,${base64}`;

    // Prepare analysis options
    const analysisOptions = {
      precisionMode,
      exaSearch,
      ...(municipalityCode && { municipalityCode: municipalityCode.trim() }),
    };

    // Analyze image with Gemini AI
    logger.info("Starting image analysis", {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      precisionMode,
      exaSearch,
      municipalityCode,
    });

    const analysisResult = await analyzeItemImage(base64Image, analysisOptions);

    // Log successful analysis
    logger.info("Analysis completed successfully", {
      fileName: imageFile.name,
      itemName: analysisResult.nameEnglishSpecific,
      category: analysisResult.category,
    });

    // Return structured response with Exa metadata
    const enhancedResult = analysisResult as typeof analysisResult & {
      exaSearchStatus?: string;
      exaResultCount?: number;
      exaEstimatedCost?: number;
    };

    return NextResponse.json(
      {
        success: true,
        data: analysisResult,
        exaSearchStatus: enhancedResult.exaSearchStatus,
        exaResultCount: enhancedResult.exaResultCount,
        exaEstimatedCost: enhancedResult.exaEstimatedCost,
      },
      { status: 200 },
    );
  } catch (error) {
    // Log detailed error for debugging
    logger.error("Image analysis API error", error);

    // Handle specific error types
    if (error instanceof Error) {
      // Check if it's already a user-friendly Japanese message from Gemini
      const message = error.message;
      if (
        message.includes("AI") ||
        message.includes("分析") ||
        message.includes("エラー")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: message,
          },
          { status: 503 },
        );
      }

      // Gemini API errors
      if (message.includes("API key")) {
        return NextResponse.json(
          {
            success: false,
            error: "AI設定にエラーがあります。管理者にお問い合わせください。",
          },
          { status: 500 },
        );
      }

      // Rate limiting errors
      if (message.includes("quota") || message.includes("rate")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "AI分析の利用制限に達しました。少し時間をおいてから再度お試しください。",
          },
          { status: 429 },
        );
      }

      // Image processing errors
      if (message.includes("base64") || message.includes("compression")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "画像の処理に失敗しました。別の画像または形式でお試しください。",
          },
          { status: 400 },
        );
      }

      // Network/timeout errors
      if (message.includes("network") || message.includes("timeout")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "ネットワークエラーが発生しました。接続を確認して再度お試しください。",
          },
          { status: 503 },
        );
      }

      // Analysis/parsing errors
      if (message.includes("analysis") || message.includes("parsing")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "画像を分析できませんでした。写真が不鮮明か、識別可能な商品が含まれていない可能性があります。",
          },
          { status: 422 },
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error:
          "画像分析中に予期しないエラーが発生しました。時間をおいてから再度お試しください。",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/analyze
 * Health check endpoint
 */
export async function GET(): Promise<NextResponse> {
  try {
    const isConfigured = Boolean(process.env.GEMINI_API_KEY);
    const geminiConnected = isConfigured ? await testGeminiConnection() : false;
    const exaConfigured = Boolean(process.env.EXA_API_KEY);
    const exaMetrics = exaConfigured ? getExaMetrics() : null;

    return NextResponse.json(
      {
        status: "ok",
        service: "Image Analysis API",
        configured: isConfigured,
        geminiConnected,
        exaConfigured,
        exaMetrics,
        supportedFormats: SUPPORTED_MIME_TYPES,
        maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("API health check failed", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Service unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

/**
 * OPTIONS /api/analyze
 * Handle preflight requests for CORS (restricted to same-origin for MVP)
 */
export async function OPTIONS(): Promise<NextResponse> {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Export route configuration
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
