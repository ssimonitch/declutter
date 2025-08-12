"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  compressImage,
  generateThumbnail,
  checkStorageQuota,
  validateImageFile,
  formatFileSize,
  isStorageQuotaExceeded,
  createBlobUrl,
  revokeBlobUrl,
} from "@/lib/image-utils";
import type { ImageQuality } from "@/lib/types";
import CameraStream from "./camera-stream";

interface PhotoCaptureProps {
  onPhotoCapture: (
    photo: Blob,
    thumbnail: Blob,
    quality: ImageQuality,
    originalFile?: File,
  ) => void;
  onError: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

interface CaptureState {
  isProcessing: boolean;
  originalFile: File | null;
  compressedBlob: Blob | null;
  thumbnailBlob: Blob | null;
  previewUrl: string | null;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  showCamera: boolean;
}

const initialState: CaptureState = {
  isProcessing: false,
  originalFile: null,
  compressedBlob: null,
  thumbnailBlob: null,
  previewUrl: null,
  originalSize: 0,
  compressedSize: 0,
  compressionRatio: 0,
  showCamera: false,
};

export default function PhotoCapture({
  onPhotoCapture,
  onError,
  className = "",
  disabled = false,
}: PhotoCaptureProps) {
  const [state, setState] = useState<CaptureState>(initialState);
  const [quality, setQuality] = useState<ImageQuality>("standard");
  const [storageWarning, setStorageWarning] = useState<{
    show: boolean;
    percentage: number;
    message: string;
  }>({
    show: false,
    percentage: 0,
    message: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check storage quota on component mount
  useEffect(() => {
    checkStorageStatus();
  }, []);

  // Clean up preview URL on unmount or state change
  useEffect(() => {
    return () => {
      if (state.previewUrl) {
        revokeBlobUrl(state.previewUrl);
      }
    };
  }, [state.previewUrl]);

  const checkStorageStatus = async () => {
    try {
      const quotaExceeded = await isStorageQuotaExceeded(80);
      if (quotaExceeded) {
        const quota = await checkStorageQuota();
        setStorageWarning({
          show: true,
          percentage: quota.percentage,
          message: `ストレージの使用率が${quota.percentage.toFixed(1)}%です。不要な項目の削除をご検討ください。`,
        });
      }
    } catch (error) {
      console.warn("Failed to check storage status:", error);
    }
  };

  const resetState = useCallback(() => {
    if (state.previewUrl) {
      revokeBlobUrl(state.previewUrl);
    }
    setState(initialState);
  }, [state.previewUrl]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file) return;

      // Reset previous state
      resetState();

      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        onError(validation.error || "無効な画像ファイルです");
        return;
      }

      setState((prev) => ({
        ...prev,
        isProcessing: true,
        originalFile: file,
        originalSize: file.size,
      }));

      try {
        // Estimate storage impact and check quota
        const currentQuota = await checkStorageQuota();

        if (currentQuota.percentage > 90) {
          onError(
            "ストレージの空き容量がほとんどありません。新しい項目を追加する前にいくつか削除してください。",
          );
          resetState();
          return;
        }

        // Create preview URL
        const previewUrl = createBlobUrl(file);

        // Compress image and generate thumbnail in parallel
        const [compressedBlob, thumbnailBlob] = await Promise.all([
          compressImage(file, quality),
          generateThumbnail(file),
        ]);

        const compressionRatio =
          ((file.size - compressedBlob.size) / file.size) * 100;

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          compressedBlob,
          thumbnailBlob,
          previewUrl,
          compressedSize: compressedBlob.size,
          compressionRatio,
        }));
      } catch (error) {
        console.error("Image processing failed:", error);
        onError(
          error instanceof Error ? error.message : "画像の処理に失敗しました",
        );
        resetState();
      }
    },
    [quality, onError, resetState],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleCapture = useCallback(() => {
    if (!state.compressedBlob || !state.thumbnailBlob || !state.originalFile) {
      onError("画像が処理されていません");
      return;
    }

    onPhotoCapture(
      state.compressedBlob,
      state.thumbnailBlob,
      quality,
      state.originalFile,
    );
    resetState();
  }, [
    state.compressedBlob,
    state.thumbnailBlob,
    state.originalFile,
    onPhotoCapture,
    resetState,
    onError,
    quality,
  ]);

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    setState((prev) => ({ ...prev, showCamera: true }));
  };

  const handleCameraCapture = async (blob: Blob) => {
    // Close camera
    setState((prev) => ({ ...prev, showCamera: false }));

    // Create a File object from the blob for processing
    const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
    await handleFileSelect(file);
  };

  const handleCameraClose = () => {
    setState((prev) => ({ ...prev, showCamera: false }));
  };

  const handleQualityChange = (newQuality: ImageQuality) => {
    setQuality(newQuality);
    // If there's an existing file, reprocess with new quality
    if (state.originalFile) {
      handleFileSelect(state.originalFile);
    }
  };

  return (
    <div className={`w-full max-w-none sm:max-w-md sm:mx-auto ${className}`}>
      {/* Storage Warning */}
      {storageWarning.show && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-orange-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-orange-700">
                {storageWarning.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quality Toggle */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">画質設定</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleQualityChange("standard")}
            disabled={disabled || state.isProcessing}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors min-h-[48px] touch-manipulation ${
              quality === "standard"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100"
            }`}
          >
            標準 (1MB)
          </button>
          <button
            onClick={() => handleQualityChange("lite")}
            disabled={disabled || state.isProcessing}
            className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors min-h-[48px] touch-manipulation ${
              quality === "lite"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100"
            }`}
          >
            軽量 (0.5MB)
          </button>
        </div>
      </div>

      {/* Main Capture Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
        {!state.previewUrl ? (
          // Upload Button - Inspired by Mercari design
          <div className="p-6 sm:p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              写真を撮影または選択
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              商品を撮影するか、ギャラリーから写真を選択してください
            </p>
            <div className="space-y-4">
              <button
                onClick={handleCameraClick}
                disabled={disabled || state.isProcessing}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-medium py-4 px-6 rounded-lg text-base transition-colors flex items-center justify-center min-h-[52px] touch-manipulation"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                カメラで撮影
              </button>
              <button
                onClick={handleFileInputClick}
                disabled={disabled || state.isProcessing}
                className="w-full bg-white hover:bg-gray-50 disabled:bg-gray-300 text-gray-700 font-medium py-4 px-6 rounded-lg text-base transition-colors border-2 border-gray-300 flex items-center justify-center min-h-[52px] touch-manipulation active:bg-gray-100"
              >
                {state.isProcessing ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    処理中...
                  </div>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    ギャラリーから選択
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          // Preview Area
          <div className="p-4">
            <div className="relative mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob URLs not supported by Next.js Image */}
              <img
                src={state.previewUrl}
                alt="Preview"
                className="w-full h-48 sm:h-64 object-cover rounded-lg"
              />
              {state.isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <div className="text-white text-center">
                    <svg
                      className="animate-spin mx-auto h-8 w-8 text-white mb-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="text-sm">圧縮中...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Compression Info */}
            {!state.isProcessing && state.compressedBlob && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-green-800 font-medium">圧縮完了</p>
                    <p className="text-green-600">
                      {formatFileSize(state.originalSize)} →{" "}
                      {formatFileSize(state.compressedSize)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-800 font-medium">
                      {state.compressionRatio.toFixed(1)}% 節約
                    </p>
                    <p className="text-green-600 text-xs">
                      {quality === "standard" ? "標準画質" : "軽量画質"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleCapture}
                disabled={
                  disabled || state.isProcessing || !state.compressedBlob
                }
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-4 px-6 rounded-lg text-base font-medium transition-colors min-h-[52px] touch-manipulation order-1 sm:order-2"
              >
                この写真を使う
              </button>
              <button
                onClick={resetState}
                disabled={disabled || state.isProcessing}
                className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white py-4 px-6 rounded-lg text-base font-medium transition-colors min-h-[52px] touch-manipulation order-2 sm:order-1"
              >
                やり直す
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || state.isProcessing}
      />

      {/* Help Text */}
      <div className="mt-4 text-center px-2">
        <p className="text-xs text-gray-500">
          対応形式: JPEG, PNG, WebP (最大10MB)
        </p>
      </div>

      {/* Camera Stream Modal */}
      {state.showCamera && (
        <CameraStream
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
        />
      )}
    </div>
  );
}
