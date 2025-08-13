"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PhotoCapture from "@/app/capture/_components/PhotoCapture";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import { saveTempCapture } from "@/lib/temp-store";
import { useCurrentRealmId } from "@/contexts/realm-context";
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
  exaSearch: boolean;
  capturedImageUrl: string | null;
}

export default function CapturePage() {
  const router = useRouter();
  const currentRealmId = useCurrentRealmId();

  const [state, setState] = useState<CapturePageState>({
    selectedMunicipality: "",
    showMunicipalitySelector: false,
    isAnalyzing: false,
    error: null,
    precisionMode: false,
    exaSearch: false,
    capturedImageUrl: null,
  });

  // Load saved municipality from localStorage
  useEffect(() => {
    const savedMunicipality = localStorage.getItem("suzumemo_municipality");
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
    localStorage.setItem("suzumemo_municipality", code);
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
    async (photo: Blob, thumbnail: Blob, quality: ImageQuality) => {
      const imageUrl = URL.createObjectURL(photo);
      setState((prev) => ({
        ...prev,
        isAnalyzing: true,
        error: null,
        capturedImageUrl: imageUrl,
      }));

      try {
        // Prepare form data for API - matching expected field names
        const formData = new FormData();
        formData.append("image", photo, "photo.jpg");
        formData.append("municipalityCode", state.selectedMunicipality);
        formData.append("precisionMode", state.precisionMode.toString());
        formData.append("exaSearch", state.exaSearch.toString());

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

        // Exa search status available but not logged in production
        // Status: result.exaSearchStatus, Results: result.exaResultCount

        // Store capture data in temporary database
        const tempId = await saveTempCapture({
          photo,
          thumbnail,
          quality,
          analysisData: result.data,
          municipalityCode: state.selectedMunicipality,
          realmId: currentRealmId,
        });

        // Navigate to edit page with temp ID
        router.push(`/edit/new?temp=${tempId}`);
      } catch (error) {
        console.error("Failed to analyze photo:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "写真の分析に失敗しました。もう一度お試しください。",
          isAnalyzing: false,
        }));
      } finally {
        // Clean up the image URL when done
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }
      }
    },
    [
      state.selectedMunicipality,
      state.precisionMode,
      state.exaSearch,
      router,
      currentRealmId,
    ],
  );

  // Handle error from PhotoCapture component
  const handleError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    setState((prev) => {
      // Clean up captured image URL when dismissing error
      if (prev.capturedImageUrl) {
        URL.revokeObjectURL(prev.capturedImageUrl);
      }
      return {
        ...prev,
        error: null,
        capturedImageUrl: null,
      };
    });
  }, []);

  const selectedMunicipalityInfo = MUNICIPALITIES.find(
    (m) => m.code === state.selectedMunicipality,
  );

  return (
    <div className="min-h-screen bg-suzu-cream">
      <div className="w-full max-w-none sm:max-w-2xl sm:mx-auto px-4 py-4 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-suzu-neutral-900 mb-3">
            商品を追加
          </h1>
          <p className="text-suzu-neutral-700 text-base leading-relaxed px-2">
            写真を撮影すると、自動で商品情報を分析します
          </p>
        </div>

        {/* Error Alert */}
        {state.error && (
          <div className="mb-6">
            <Alert
              variant="error"
              description={state.error}
              onClose={handleDismissError}
            />
          </div>
        )}

        {/* Municipality Info */}
        {selectedMunicipalityInfo && !state.showMunicipalitySelector && (
          <div className="mb-6 bg-suzu-primary-50 border border-suzu-primary-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-suzu-primary-400 mr-2"
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
                  <p className="text-sm font-medium text-suzu-primary-900">
                    設定済み地域:{" "}
                    {selectedMunicipalityInfo.fullName ||
                      selectedMunicipalityInfo.name}
                  </p>
                  <p className="text-xs text-suzu-primary-800">
                    処分費用の算出に使用されます
                  </p>
                </div>
              </div>
              <button
                onClick={handleChangeMunicipality}
                className="text-suzu-primary-700 hover:text-suzu-primary-800 text-sm font-medium"
              >
                変更
              </button>
            </div>
          </div>
        )}

        {/* Municipality Selector Modal */}
        <Modal
          isOpen={state.showMunicipalitySelector}
          onClose={() =>
            setState((prev) => ({ ...prev, showMunicipalitySelector: false }))
          }
          title="お住まいの地域を選択"
          size="md"
          preventCloseOnBackdrop={true}
        >
          <div className="space-y-4">
            <p className="text-sm text-suzu-neutral-700">
              処分費用の算出に必要です。後で変更可能です。
            </p>

            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {MUNICIPALITIES.map((municipality) => (
                  <button
                    key={municipality.code}
                    onClick={() => handleMunicipalitySelect(municipality.code)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-suzu-brown-200 hover:bg-suzu-cream hover:border-suzu-brown-300 transition-colors focus:outline-none focus:ring-2 focus:ring-suzu-primary-500 touch-manipulation"
                  >
                    <div className="font-medium text-suzu-neutral-900">
                      {municipality.fullName || municipality.name}
                    </div>
                    <div className="text-sm text-suzu-neutral-700">
                      自治体コード: {municipality.code}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-suzu-brown-200 bg-suzu-cream -m-6 mt-4">
              <p className="text-xs text-suzu-neutral-700">
                お住まいの地域が見つからない場合は、最寄りの大きな都市を選択してください。
              </p>
            </div>
          </div>
        </Modal>

        {/* Analysis Settings */}
        {!state.showMunicipalitySelector && (
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-suzu-neutral-800 mb-4">
              分析設定
            </h3>

            {/* Precision Mode Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-suzu-neutral-900">
                  精度優先モード
                </p>
                <p className="text-xs text-suzu-neutral-700 mt-1">
                  高度な推論モデルを使用してより詳細な分析を行います
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
                  state.precisionMode
                    ? "bg-suzu-primary-600"
                    : "bg-suzu-brown-200"
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

            {/* Exa Search Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-suzu-brown-100">
              <div>
                <p className="text-sm font-medium text-suzu-neutral-900">
                  Exa Search連携
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-suzu-success-100 text-suzu-success-800">
                    推奨
                  </span>
                </p>
                <p className="text-xs text-suzu-neutral-700 mt-1">
                  最新の日本市場情報をExa検索で取得し、より正確な価格分析を行います
                </p>
                {state.exaSearch && (
                  <div className="mt-2 p-2 bg-green-50 rounded-md">
                    <p className="text-xs text-suzu-success-700">
                      <strong>メリット:</strong> Exa
                      Searchは常に構造化された形式で応答するため、
                      安定した分析結果を提供します。
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    exaSearch: !prev.exaSearch,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  state.exaSearch ? "bg-suzu-success" : "bg-suzu-brown-200"
                }`}
                role="switch"
                aria-checked={state.exaSearch}
              >
                <span className="sr-only">Exa Search連携を切り替え</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    state.exaSearch ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Photo Capture */}
        {!state.showMunicipalitySelector && (
          <div className="bg-white rounded-lg shadow p-6">
            {!state.isAnalyzing && (
              <PhotoCapture
                onPhotoCapture={handlePhotoCapture}
                onError={handleError}
                disabled={state.isAnalyzing}
                className=""
              />
            )}

            {/* Captured Image During Analysis */}
            {state.isAnalyzing && state.capturedImageUrl && (
              <div className="relative">
                <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-suzu-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.capturedImageUrl}
                    alt="分析中の写真"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 max-w-sm mx-4">
                      <div className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-suzu-primary-600"
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
                          <p className="text-sm font-medium text-suzu-neutral-900">
                            AI分析中...
                          </p>
                          <p className="text-xs text-suzu-neutral-700">
                            {state.exaSearch
                              ? "最新の市場データを検索中"
                              : "商品情報を認識中"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        {!state.showMunicipalitySelector && (
          <div className="mt-6 bg-suzu-primary-50 rounded-lg p-5 border border-suzu-primary-200">
            <h3 className="text-base font-medium text-suzu-primary-900 mb-3">
              📷 撮影のポイント
            </h3>
            <ul className="text-sm text-suzu-primary-800 space-y-2">
              <li className="flex items-start">
                <span className="text-suzu-primary-700 mr-2">✓</span>
                <span>商品全体が画面に収まるように撮影しましょう</span>
              </li>
              <li className="flex items-start">
                <span className="text-suzu-primary-700 mr-2">✓</span>
                <span>
                  窓際や電気の下など、明るい場所で撮影するときれいに写ります
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-suzu-primary-700 mr-2">✓</span>
                <span>
                  メーカー名や型番がある場合は、それも写すとAIが正確に判別できます
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-suzu-primary-700 mr-2">✓</span>
                <span>
                  1回に1つの商品を撮影してください（複数同時は避けましょう）
                </span>
              </li>
            </ul>
            <div className="mt-3 p-3 bg-white rounded border border-suzu-primary-200">
              <p className="text-xs text-suzu-primary-800">
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
