"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PhotoCapture from "@/components/photo-capture";
import type { ImageQuality } from "@/lib/types";

// 日本の主要自治体（処分情報付き）
const MUNICIPALITIES = [
  {
    code: "202100",
    name: "駒ヶ根市",
    prefecture: "長野県",
    fullName: "長野県駒ヶ根市",
  },
];

interface CapturePageState {
  selectedMunicipality: string;
  showMunicipalitySelector: boolean;
  isAnalyzing: boolean;
  error: string | null;
  precisionMode: boolean;
}

export default function CapturePage() {
  const router = useRouter();
  const [state, setState] = useState<CapturePageState>({
    selectedMunicipality: "",
    showMunicipalitySelector: false,
    isAnalyzing: false,
    error: null,
    precisionMode: false,
  });

  // Load saved municipality from localStorage
  useEffect(() => {
    const savedMunicipality = localStorage.getItem("declutter_municipality");
    if (savedMunicipality) {
      setState((prev) => ({
        ...prev,
        selectedMunicipality: savedMunicipality,
      }));
    } else {
      setState((prev) => ({ ...prev, showMunicipalitySelector: true }));
    }
  }, []);

  // Handle municipality selection
  const handleMunicipalitySelect = useCallback((code: string) => {
    localStorage.setItem("declutter_municipality", code);
    setState((prev) => ({
      ...prev,
      selectedMunicipality: code,
      showMunicipalitySelector: false,
    }));
  }, []);

  // Handle municipality change request
  const handleChangeMunicipality = useCallback(() => {
    setState((prev) => ({ ...prev, showMunicipalitySelector: true }));
  }, []);

  // Handle photo capture and analysis
  const handlePhotoCapture = useCallback(
    async (
      photo: Blob,
      thumbnail: Blob,
      quality: ImageQuality,
      _originalFile?: File,
    ) => {
      setState((prev) => ({ ...prev, isAnalyzing: true, error: null }));

      try {
        // Prepare form data for API - matching expected field names
        const formData = new FormData();
        formData.append("image", photo, "photo.jpg");
        formData.append("municipalityCode", state.selectedMunicipality);
        formData.append("precisionMode", state.precisionMode.toString());

        // Call analyze API
        const response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "分析に失敗しました");
        }

        // Store photo and thumbnail for the edit page
        const tempPhotoData = {
          photo: photo,
          thumbnail: thumbnail,
          quality: quality,
          analysisData: result.data,
          municipalityCode: state.selectedMunicipality,
        };

        // Store in sessionStorage to pass to edit page
        // We'll create a temporary ID for navigation
        const tempId = `temp_${Date.now()}`;
        sessionStorage.setItem(
          `declutter_temp_${tempId}`,
          JSON.stringify({
            ...tempPhotoData,
            // Convert blobs to base64 for storage
            photoData: await blobToBase64(photo),
            thumbnailData: await blobToBase64(thumbnail),
          }),
        );

        // Navigate to edit page
        router.push(`/edit/new?temp=${tempId}`);
      } catch (error) {
        console.error("Failed to analyze photo:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "写真の分析に失敗しました。もう一度お試しください。",
        }));
      } finally {
        setState((prev) => ({ ...prev, isAnalyzing: false }));
      }
    },
    [state.selectedMunicipality, state.precisionMode, router],
  );

  // Handle error from PhotoCapture component
  const handleError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const selectedMunicipalityInfo = MUNICIPALITIES.find(
    (m) => m.code === state.selectedMunicipality,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">商品を追加</h1>
          <p className="text-gray-600">
            写真を撮影すると、自動で商品情報を分析します
          </p>
        </div>

        {/* Error Alert */}
        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-red-400 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-red-800">{state.error}</span>
              </div>
              <button
                onClick={handleDismissError}
                className="text-red-400 hover:text-red-600 ml-4"
              >
                <svg
                  className="h-4 w-4"
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
            </div>
          </div>
        )}

        {/* Municipality Info */}
        {selectedMunicipalityInfo && !state.showMunicipalitySelector && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-blue-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    設定済み地域:{" "}
                    {selectedMunicipalityInfo.fullName ||
                      selectedMunicipalityInfo.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    処分費用の算出に使用されます
                  </p>
                </div>
              </div>
              <button
                onClick={handleChangeMunicipality}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                変更
              </button>
            </div>
          </div>
        )}

        {/* Municipality Selector Modal */}
        {state.showMunicipalitySelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  お住まいの地域を選択
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  処分費用の算出に必要です。後で変更可能です。
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 space-y-2">
                  {MUNICIPALITIES.map((municipality) => (
                    <button
                      key={municipality.code}
                      onClick={() =>
                        handleMunicipalitySelect(municipality.code)
                      }
                      className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        {municipality.fullName || municipality.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        自治体コード: {municipality.code}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">
                  お住まいの地域が見つからない場合は、最寄りの大きな都市を選択してください。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Precision Mode Toggle */}
        {!state.showMunicipalitySelector && (
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">分析設定</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  精度優先モード
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  より正確な分析結果を得られますが、分析に時間がかかります
                </p>
              </div>
              <button
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    precisionMode: !prev.precisionMode,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  state.precisionMode ? "bg-blue-600" : "bg-gray-200"
                }`}
                role="switch"
                aria-checked={state.precisionMode}
              >
                <span className="sr-only">精度優先モードを切り替え</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    state.precisionMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Photo Capture */}
        {!state.showMunicipalitySelector && (
          <div className="bg-white rounded-lg shadow p-6">
            <PhotoCapture
              onPhotoCapture={handlePhotoCapture}
              onError={handleError}
              disabled={state.isAnalyzing}
              className=""
            />

            {/* Analysis Loading State */}
            {state.isAnalyzing && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600"
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
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      AI分析中...
                    </p>
                    <p className="text-xs text-blue-700">
                      商品情報を自動で認識しています
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        {!state.showMunicipalitySelector && (
          <div className="mt-6 bg-blue-50 rounded-lg p-5 border border-blue-200">
            <h3 className="text-base font-medium text-blue-900 mb-3">
              📷 撮影のポイント
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>商品全体が画面に収まるように撮影しましょう</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>
                  窓際や電気の下など、明るい場所で撮影するときれいに写ります
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>
                  メーカー名や型番がある場合は、それも写すとAIが正確に判別できます
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>
                  1回に1つの商品を撮影してください（複数同時は避けましょう）
                </span>
              </li>
            </ul>
            <div className="mt-3 p-3 bg-white rounded border border-blue-100">
              <p className="text-xs text-blue-700">
                💡
                ヒント：スマートフォンを横向きにすると、より広い範囲が撮影できます
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
