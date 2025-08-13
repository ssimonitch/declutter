// API Route for Gemini-powered image analysis
// Processes uploaded images and returns structured item metadata

import { NextRequest, NextResponse } from "next/server";
import { analyzeItemImage, testGeminiConnection } from "@/lib/gemini";
import { getExaMetrics } from "@/lib/exa";
import { logger } from "@/lib/logger";
import {
  categorizeError,
  ConfigurationError,
  ValidationError,
} from "@/lib/errors";
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
      const error = new ConfigurationError(
        "AI設定にエラーがあります。管理者にお問い合わせください。",
      );
      logger.error("GEMINI_API_KEY environment variable not configured");
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.statusCode },
      );
    }

    // EXA_API_KEY is only required if exaSearch is enabled
    if (formData.get("exaSearch") === "true" && !process.env.EXA_API_KEY) {
      const error = new ConfigurationError(
        "Exa検索の設定にエラーがあります。管理者にお問い合わせください。",
      );
      logger.error(
        "EXA_API_KEY environment variable not configured for Exa search",
      );
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.statusCode },
      );
    }
    const imageFile = formData.get("image") as File;
    const precisionMode = formData.get("precisionMode") === "true";
    const municipalityCode = formData.get("municipalityCode") as string | null;
    const exaSearch = formData.get("exaSearch") === "true";

    // Validate required fields
    if (!imageFile) {
      const error = new ValidationError(
        "画像ファイルが選択されていません。画像をアップロードしてください。",
      );
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.statusCode },
      );
    }

    // Validate file type
    if (!SUPPORTED_MIME_TYPES.includes(imageFile.type)) {
      const error = new ValidationError(
        `サポートされていない画像形式です: ${imageFile.type}。対応形式: JPEG, PNG, WebP`,
      );
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.statusCode },
      );
    }

    // Validate file size
    if (imageFile.size > MAX_FILE_SIZE) {
      const sizeMB = Math.round(imageFile.size / (1024 * 1024));
      const error = new ValidationError(
        `画像サイズが大きすぎます: ${sizeMB}MB。最大サイズ: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.statusCode },
      );
    }

    // Validate file is actually an image
    if (imageFile.size === 0) {
      const error = new ValidationError(
        "空のファイルです。有効な画像をアップロードしてください。",
      );
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.statusCode },
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

    // Categorize the error using our structured error system
    const appError = categorizeError(error);

    // Return the appropriate error response
    return NextResponse.json(
      {
        success: false,
        error: appError.message,
        code: appError.code, // Include error code for debugging
      },
      { status: appError.statusCode },
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
