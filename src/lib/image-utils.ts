// Image Processing Utilities for Declutter App MVP
// Handles image compression, thumbnails, storage management, and blob utilities

import imageCompression from "browser-image-compression";
import type { ImageQuality, StorageQuota } from "./types";

// Supported image MIME types (unified across the app)
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// Maximum file size limits (in MB)
const MAX_ORIGINAL_SIZE_MB = 10;

/**
 * Compresses an image file based on quality setting
 *
 * @param file - Input image file
 * @param quality - Compression quality: 'standard' (1MB, 1920px) or 'lite' (0.5MB, 1280px)
 * @returns Promise<Blob> - Compressed image blob
 */
export async function compressImage(
  file: File,
  quality: ImageQuality = "standard",
): Promise<Blob> {
  try {
    // Validate file before compression
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid image file");
    }

    const options = {
      maxSizeMB: quality === "lite" ? 0.5 : 1,
      maxWidthOrHeight: quality === "lite" ? 1280 : 1920,
      useWebWorker: true,
      fileType: file.type,
      // Maintain aspect ratio
      maintainAspectRatio: true,
      // For JPEG, set quality
      ...(file.type === "image/jpeg" && {
        initialQuality: quality === "lite" ? 0.7 : 0.8,
      }),
    };

    return await imageCompression(file, options);
  } catch (error) {
    console.error("Image compression failed:", error);
    throw new Error(
      `Failed to compress image: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generates a small thumbnail for list views
 *
 * @param file - Input image file
 * @returns Promise<Blob> - Thumbnail blob (max 50KB, 200x200px)
 */
export async function generateThumbnail(file: File): Promise<Blob> {
  try {
    // Validate file before thumbnail generation
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid image file");
    }

    const options = {
      maxSizeMB: 0.05, // 50KB
      maxWidthOrHeight: 200,
      useWebWorker: true,
      fileType: file.type,
      maintainAspectRatio: true,
      // Higher compression for thumbnails
      ...(file.type === "image/jpeg" && {
        initialQuality: 0.6,
      }),
    };

    return await imageCompression(file, options);
  } catch (error) {
    console.error("Thumbnail generation failed:", error);
    throw new Error(
      `Failed to generate thumbnail: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Checks browser storage quota and usage
 *
 * @returns Promise<StorageQuota> - Storage information in bytes and percentage
 */
export async function checkStorageQuota(): Promise<StorageQuota> {
  try {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const available = estimate.quota || 0;
      const used = estimate.usage || 0;
      const percentage = available > 0 ? (used / available) * 100 : 0;

      return {
        available,
        used,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      };
    }

    // Fallback for unsupported browsers
    return { available: 0, used: 0, percentage: 0 };
  } catch (error) {
    console.warn("Storage quota check failed:", error);
    return { available: 0, used: 0, percentage: 0 };
  }
}

/**
 * Creates a blob URL for displaying blob content
 *
 * @param blob - Blob to create URL for
 * @returns string - Object URL
 */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revokes a blob URL to prevent memory leaks
 *
 * @param url - Object URL to revoke
 */
export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Creates a blob URL with automatic cleanup after timeout
 *
 * @param blob - Blob to create URL for
 * @param timeoutMs - Cleanup timeout in milliseconds (default: 5 minutes)
 * @returns Object with url and cleanup function
 */
export function createBlobUrlWithCleanup(
  blob: Blob,
  timeoutMs: number = 5 * 60 * 1000, // 5 minutes default
): { url: string; cleanup: () => void } {
  const url = createBlobUrl(blob);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let cleaned = false;

  const cleanup = () => {
    if (!cleaned) {
      revokeBlobUrl(url);
      if (timeoutId) clearTimeout(timeoutId);
      cleaned = true;
    }
  };

  // Auto-cleanup after timeout
  if (timeoutMs > 0) {
    timeoutId = setTimeout(cleanup, timeoutMs);
  }

  return { url, cleanup };
}

/**
 * Validates image file type and size
 *
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check if file exists
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  // Check file type
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(", ")}`,
    };
  }

  // Check file size (convert to MB)
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_ORIGINAL_SIZE_MB) {
    return {
      valid: false,
      error: `File too large: ${formatFileSize(file.size)}. Maximum size: ${MAX_ORIGINAL_SIZE_MB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Gets image dimensions without loading the full image
 *
 * @param file - Image file to analyze
 * @returns Promise<{width: number; height: number}> - Image dimensions
 */
export async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      reject(new Error(validation.error));
      return;
    }

    const img = new Image();
    const url = createBlobUrl(file);

    img.onload = () => {
      revokeBlobUrl(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      revokeBlobUrl(url);
      reject(new Error("Failed to load image for dimension analysis"));
    };

    img.src = url;
  });
}

/**
 * Converts blob to base64 string for API transmission
 *
 * @param blob - Blob to convert
 * @returns Promise<string> - Base64 encoded string
 */
export async function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };

    reader.onerror = () => {
      reject(new Error("FileReader error during base64 conversion"));
    };

    reader.readAsDataURL(blob);
  });
}

/**
 * Formats file size in bytes to human-readable string
 *
 * @param bytes - Size in bytes
 * @returns string - Formatted size (e.g., "1.5 MB", "500 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Checks if storage quota exceeds the specified threshold
 *
 * @param threshold - Threshold percentage (default: 80%)
 * @returns Promise<boolean> - True if quota exceeded
 */
export async function isStorageQuotaExceeded(
  threshold: number = 80,
): Promise<boolean> {
  try {
    const quota = await checkStorageQuota();
    return quota.percentage >= threshold;
  } catch (error) {
    console.warn("Storage quota check failed:", error);
    return false; // Assume not exceeded if check fails
  }
}

/**
 * Calculates estimated storage impact of adding an image
 *
 * @param originalFile - Original image file
 * @param quality - Compression quality to use
 * @returns Promise<{compressed: number; thumbnail: number; total: number}> - Storage impact in bytes
 */
export async function estimateStorageImpact(
  originalFile: File,
  quality: ImageQuality = "standard",
): Promise<{ compressed: number; thumbnail: number; total: number }> {
  try {
    // This is an estimation based on typical compression ratios
    const originalSize = originalFile.size;

    // Estimate compressed size based on quality settings
    const maxCompressedMB = quality === "lite" ? 0.5 : 1;
    const estimatedCompressed = Math.min(
      originalSize,
      maxCompressedMB * 1024 * 1024,
    );

    // Thumbnail is typically much smaller
    const estimatedThumbnail = Math.min(originalSize * 0.1, 0.05 * 1024 * 1024); // 50KB max

    return {
      compressed: estimatedCompressed,
      thumbnail: estimatedThumbnail,
      total: estimatedCompressed + estimatedThumbnail,
    };
  } catch (error) {
    console.error("Storage impact estimation failed:", error);
    // Return conservative estimates
    return {
      compressed: originalFile.size,
      thumbnail: 50 * 1024, // 50KB
      total: originalFile.size + 50 * 1024,
    };
  }
}

/**
 * Creates a safe filename from user input
 *
 * @param name - Original name
 * @param extension - File extension (with dot)
 * @returns string - Sanitized filename
 */
export function createSafeFilename(
  name: string,
  extension: string = "",
): string {
  // Remove/replace unsafe characters
  const safe = name
    .replace(/[^\w\s-]/g, "") // Remove special chars except spaces and hyphens
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
    .toLowerCase();

  // Ensure minimum length
  const filename = safe || "image";

  return filename + extension;
}

// Export utility constants for external use
export const IMAGE_UTILS_CONSTANTS = {
  SUPPORTED_TYPES: SUPPORTED_IMAGE_TYPES,
  MAX_ORIGINAL_SIZE_MB,
  STANDARD_MAX_SIZE_MB: 1,
  LITE_MAX_SIZE_MB: 0.5,
  THUMBNAIL_MAX_SIZE_MB: 0.05,
  STANDARD_MAX_DIMENSION: 1920,
  LITE_MAX_DIMENSION: 1280,
  THUMBNAIL_MAX_DIMENSION: 200,
  DEFAULT_CLEANUP_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
} as const;
