// API Route for Gemini-powered image analysis
// Processes uploaded images and returns structured item metadata

import { NextRequest, NextResponse } from "next/server";
import { analyzeItemImage, testGeminiConnection } from "@/lib/gemini";
import { getExaMetrics } from "@/lib/exa";
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

const isProduction = process.env.NODE_ENV === "production";

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
      console.error("GEMINI_API_KEY environment variable not configured");
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
      console.error("EXA_API_KEY environment variable not configured");
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
    if (!isProduction) {
      console.log(
        `Analyzing image: ${imageFile.name} (${imageFile.size} bytes) with precision mode: ${precisionMode}, Exa search: ${exaSearch}`,
      );
    }

    const analysisResult = await analyzeItemImage(base64Image, analysisOptions);

    // Log successful analysis
    if (!isProduction) {
      console.log(
        `Analysis completed for ${imageFile.name}: ${analysisResult.nameEnglishSpecific} (${analysisResult.category})`,
      );
    }

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
    console.error("Image analysis API error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle specific error types
    if (error instanceof Error) {
      // Gemini API errors
      if (error.message.includes("API key")) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication failed. Please check API configuration.",
          },
          { status: 500 },
        );
      }

      // Rate limiting errors
      if (error.message.includes("quota") || error.message.includes("rate")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Service temporarily unavailable due to high demand. Please try again in a few moments.",
          },
          { status: 429 },
        );
      }

      // Image processing errors
      if (
        error.message.includes("base64") ||
        error.message.includes("compression")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to process image. Please try a different image or format.",
          },
          { status: 400 },
        );
      }

      // Network/timeout errors
      if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Network error occurred. Please check your connection and try again.",
          },
          { status: 503 },
        );
      }

      // Analysis/parsing errors
      if (
        error.message.includes("analysis") ||
        error.message.includes("parsing")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to analyze image. The image might be unclear or not contain identifiable items.",
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
          "An unexpected error occurred during image analysis. Please try again.",
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
    console.error("API health check failed:", error);
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
