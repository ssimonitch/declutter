"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface CameraStreamProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  className?: string;
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

export default function CameraStream({
  onCapture,
  onClose,
  className = "",
}: CameraStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );

  // Get available camera devices
  const getCameraDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();

      const videoDevices = allDevices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`,
        }));

      setDevices(videoDevices);

      // Try to find iPhone/Continuity Camera first
      const iPhoneCamera = videoDevices.find(
        (device) =>
          device.label.toLowerCase().includes("iphone") ||
          device.label.toLowerCase().includes("continuity") ||
          device.label.toLowerCase().includes("ios"),
      );

      // Then try to find the back camera (for mobile)
      const backCamera = videoDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear"),
      );

      if (iPhoneCamera) {
        console.log("iPhone/Continuity Camera detected:", iPhoneCamera);
        setSelectedDeviceId(iPhoneCamera.deviceId);
      } else if (backCamera) {
        setSelectedDeviceId(backCamera.deviceId);
      } else if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }

      return videoDevices;
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
      return [];
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Clear video source first
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Build constraints with better compatibility
      let constraints: MediaStreamConstraints;

      if (selectedDeviceId) {
        // Try exact device first, with fallback
        constraints = {
          video: {
            deviceId: selectedDeviceId,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };
      } else {
        // Use facing mode for initial selection
        constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };
      }

      console.log("Using constraints:", constraints);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Set video source and wait for metadata to load
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video metadata to be loaded
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element not found"));
            return;
          }

          const video = videoRef.current;

          // If already have metadata, resolve immediately
          if (video.readyState >= 2) {
            resolve();
            return;
          }

          const handleLoadedMetadata = () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("error", handleError);
            resolve();
          };

          const handleError = () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("error", handleError);
            reject(new Error("Failed to load video metadata"));
          };

          video.addEventListener("loadedmetadata", handleLoadedMetadata);
          video.addEventListener("error", handleError);

          // Timeout after 5 seconds
          setTimeout(() => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("error", handleError);
            reject(new Error("Video metadata loading timeout"));
          }, 5000);
        });

        // Now safe to play
        await videoRef.current.play();
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Failed to start camera:", err);
      let errorMessage = "カメラへのアクセスに失敗しました。";

      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage =
            "カメラへのアクセスが拒否されました。ブラウザの設定からカメラへのアクセスを許可してください。";
        } else if (err.name === "NotFoundError") {
          errorMessage =
            "カメラが見つかりません。デバイスにカメラが接続されていることを確認してください。";
        } else if (err.name === "NotReadableError") {
          errorMessage = "カメラは他のアプリケーションで使用中です。";
        } else if (err.name === "AbortError") {
          // This is usually a race condition, try to recover
          errorMessage =
            "カメラの起動中にエラーが発生しました。再試行してください。";
        }
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  }, [selectedDeviceId, facingMode]);

  // Initialize camera on mount
  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      if (!mounted) return;

      // First request basic permission to enumerate devices properly
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        tempStream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        // User might deny on first attempt
        console.log("Initial permission request failed:", err);
      }

      if (!mounted) return;

      const availableDevices = await getCameraDevices();
      if (!mounted) return;

      if (availableDevices.length > 0) {
        await startCamera();
      } else {
        setError("利用可能なカメラが見つかりません。");
        setIsLoading(false);
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      initCamera();
    }, 100);

    // Cleanup on unmount
    return () => {
      mounted = false;
      clearTimeout(timer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle device change
  useEffect(() => {
    let mounted = true;

    const handleDeviceChange = async () => {
      if (selectedDeviceId && !isLoading && mounted) {
        await startCamera();
      }
    };

    handleDeviceChange();

    return () => {
      mounted = false;
    };
  }, [selectedDeviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and trigger callback
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
        }
      },
      "image/jpeg",
      0.95,
    );
  }, [onCapture]);

  // Switch between front and back camera (mobile)
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    startCamera();
  }, [startCamera]);

  return (
    <div
      className={`fixed inset-0 bg-black z-50 flex flex-col safe-area-inset ${className}`}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 z-10 safe-top">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-white p-3 hover:bg-white/20 rounded-full transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
            aria-label="閉じる"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Camera selector for desktop with multiple cameras */}
          {devices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-black/50 text-white px-3 py-2 rounded-lg text-base border border-white/30 touch-manipulation"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center relative">
        {error ? (
          <div className="text-center p-8">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-white mb-4">{error}</p>
            <button
              onClick={startCamera}
              className="bg-white text-black px-4 py-2 rounded-lg font-medium"
            >
              再試行
            </button>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                <div className="text-center">
                  <svg
                    className="animate-spin h-12 w-12 text-white mx-auto mb-4"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <p className="text-white">カメラを起動中...</p>
                </div>
              </div>
            )}

            {/* Video preview */}
            <video
              ref={videoRef}
              className="max-w-full max-h-full object-contain"
              playsInline
              autoPlay
              muted
            />

            {/* Viewfinder overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-72 h-72 sm:w-80 sm:h-80 max-w-[90vw] max-h-[50vh] border-2 border-white/50 rounded-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      {!error && !isLoading && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 sm:p-8 safe-bottom">
          <div className="flex items-center justify-center space-x-8 sm:space-x-12">
            {/* Switch camera button (primarily for mobile) */}
            {devices.length > 1 && (
              <button
                onClick={switchCamera}
                className="text-white p-4 hover:bg-white/20 rounded-full transition-colors min-h-[56px] min-w-[56px] touch-manipulation"
                aria-label="カメラを切り替え"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}

            {/* Capture button */}
            <button
              onClick={capturePhoto}
              className="bg-white hover:bg-gray-100 active:bg-gray-200 text-black w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-colors shadow-lg touch-manipulation"
              aria-label="撮影"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-black" />
            </button>

            {/* Placeholder for balance */}
            <div className="w-14 h-14" />
          </div>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
