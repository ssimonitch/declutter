"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import ItemForm from "@/components/item-form";
import Alert from "@/components/ui/Alert";
import { getItem } from "@/lib/db";
import { getTempCapture, deleteTempCapture } from "@/lib/temp-store";
import type { DeclutterItem } from "@/lib/types";

interface EditPageState {
  item: DeclutterItem | null;
  loading: boolean;
  error: string | null;
  isNewItem: boolean;
  tempId?: string;
}

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const itemId = params.id as string;
  const tempId = searchParams.get("temp");

  const [state, setState] = useState<EditPageState>({
    item: null,
    loading: true,
    error: null,
    isNewItem: itemId === "new",
  });

  // Load item data - use a flag to prevent double execution
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (hasLoaded) return;

    const loadItem = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        if (state.isNewItem && tempId) {
          // Load from temporary database (new item from capture)
          const tempData = await getTempCapture(tempId);
          if (!tempData) {
            throw new Error(
              "Temporary data not found. Please go back and capture the photo again.",
            );
          }

          // Create a DeclutterItem with id="new" for new items
          // ItemForm will recognize this and call addItem instead of updateItem
          const newItem: DeclutterItem = {
            id: "new", // Special ID that ItemForm recognizes as create mode
            realmId: tempData.realmId || undefined, // Preserve realm ID from capture
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            photo: tempData.photo,
            thumbnail: tempData.thumbnail,
            municipalityCode: tempData.municipalityCode,

            // Name fields from Gemini analysis
            nameJapaneseSpecific:
              tempData.analysisData?.nameJapaneseSpecific || "",
            nameEnglishSpecific:
              tempData.analysisData?.nameEnglishSpecific || "",
            nameJapaneseGeneric:
              tempData.analysisData?.nameJapaneseGeneric || "",
            nameEnglishGeneric: tempData.analysisData?.nameEnglishGeneric || "",

            description: tempData.analysisData?.description || "",
            category: tempData.analysisData?.category || "その他",
            condition: tempData.analysisData?.condition || "good",
            quantity: 1, // Default quantity for new items

            // Price fields
            onlineAuctionPriceJPY: tempData.analysisData
              ?.onlineAuctionPriceJPY || {
              low: 0,
              high: 0,
              confidence: 0.5,
            },
            thriftShopPriceJPY: tempData.analysisData?.thriftShopPriceJPY || {
              low: 0,
              high: 0,
              confidence: 0.5,
            },

            recommendedAction:
              tempData.analysisData?.recommendedAction || "keep",
            actionRationale: tempData.analysisData?.actionRationale || "",
            marketplaces: tempData.analysisData?.marketplaces || [],
            searchQueries: tempData.analysisData?.searchQueries || [],
            specialNotes: tempData.analysisData?.specialNotes || null,
            keywords: tempData.analysisData?.keywords || [],

            // Disposal cost field
            disposalCostJPY: tempData.analysisData?.disposalCostJPY,
          };

          setState((prev) => ({
            ...prev,
            item: newItem,
            loading: false,
            tempId: tempId, // Store temp ID for cleanup after save
          }));
        } else if (!state.isNewItem) {
          // Load existing item from database
          const item = await getItem(itemId);
          if (!item) {
            throw new Error("Item not found");
          }

          setState((prev) => ({
            ...prev,
            item,
            loading: false,
          }));
        } else {
          // New item without temp data - shouldn't happen in normal flow
          setState((prev) => ({
            ...prev,
            error: "新しい商品を追加するには、写真の撮影から始めてください。",
            loading: false,
          }));
        }
      } catch (error) {
        console.error("Failed to load item:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "商品データの読み込みに失敗しました",
          loading: false,
        }));
      }
    };

    loadItem();
    setHasLoaded(true);
  }, [itemId, tempId, state.isNewItem, hasLoaded]);

  // Handle form save
  const handleSave = useCallback(async () => {
    // Clean up temporary storage after successful save
    if (state.tempId) {
      try {
        await deleteTempCapture(state.tempId);
      } catch (error) {
        console.warn("Failed to clean up temporary capture:", error);
        // Don't throw - save was successful, cleanup failure is not critical
      }
    }
    router.push("/dashboard");
  }, [router, state.tempId]);

  // Handle form cancel
  const handleCancel = useCallback(() => {
    if (state.isNewItem) {
      router.push("/capture");
    } else {
      router.push("/dashboard");
    }
  }, [router, state.isNewItem]);

  // Handle form error
  const handleError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  // Handle back button
  const handleBack = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-gray-600">商品データを読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error && !state.item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                エラーが発生しました
              </h3>
              <p className="text-gray-600 mb-6">{state.error}</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ダッシュボードに戻る
                </button>
                <button
                  onClick={() => router.push("/capture")}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  写真を撮り直す
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              戻る
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {state.isNewItem ? "商品情報を確認・編集" : "商品情報を編集"}
              </h1>
              <p className="text-gray-600">
                {state.isNewItem
                  ? "AIが分析した結果を確認し、必要に応じて修正してください"
                  : "商品の詳細情報を編集できます"}
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert (for form errors) */}
        {state.error && state.item && (
          <div className="mb-6">
            <Alert
              variant="error"
              description={state.error}
              onClose={() => setState((prev) => ({ ...prev, error: null }))}
            />
          </div>
        )}

        {/* AI Analysis Notice for new items */}
        {state.isNewItem && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-5">
            <div className="flex items-start">
              <svg
                className="h-6 w-6 text-green-500 mr-3 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-base font-medium text-green-900 mb-2">
                  AIが商品情報を分析しました
                </p>
                <p className="text-sm text-green-800 leading-relaxed">
                  写真から自動で認識した情報を表示しています。
                  <br />
                  間違いがある場合は、直接入力して修正できます。
                </p>
                <div className="mt-3 p-3 bg-white rounded border border-green-100">
                  <p className="text-xs text-green-700">
                    🔍
                    確認ポイント：商品名、価格帯、おすすめアクションが正しいかご確認ください
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Item Form */}
        {state.item && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <ItemForm
                item={state.item}
                onSave={handleSave}
                onCancel={handleCancel}
                onError={handleError}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
