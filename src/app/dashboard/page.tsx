"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardSummary from "@/components/dashboard-summary";
import ItemsTable from "@/components/items-table";
import FamilySharing from "@/components/family-sharing";
import Alert from "@/components/ui/Alert";
import { listItems } from "@/lib/db";
import { generateCSVContent, createCSVBlob, downloadCSV } from "@/utils/export";
import { useCurrentRealmId } from "@/contexts/realm-context";
import type { DeclutterItem } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const currentRealmId = useCurrentRealmId();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Refresh data when items are modified
  // const handleDataChange = useCallback(() => {
  //   setRefreshTrigger((prev) => prev + 1);
  // }, []);

  // Handle CSV export
  const handleExportCSV = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      // Fetch all items from database for current realm
      const items = await listItems(currentRealmId);

      if (items.length === 0) {
        setError("エクスポートする商品がありません");
        return;
      }

      // Generate CSV content using the utils function
      const csvContent = generateCSVContent(items);

      // Create blob with UTF-8 BOM for Excel compatibility
      const blob = createCSVBlob(csvContent);

      // Generate filename with realm info
      const realmSuffix = currentRealmId ? `_${currentRealmId}` : "_private";
      const filename = `declutter_items${realmSuffix}_${new Date().toISOString().split("T")[0]}.csv`;
      downloadCSV(blob, filename);
    } catch (err) {
      console.error("Failed to export CSV:", err);
      setError(
        err instanceof Error ? err.message : "CSVエクスポートに失敗しました",
      );
    } finally {
      setIsExporting(false);
    }
  }, [currentRealmId, isExporting]);

  // Handle item row click - navigate to edit page
  const handleItemClick = useCallback(
    (item: DeclutterItem) => {
      router.push(`/edit/${item.id}`);
    },
    [router],
  );

  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none lg:max-w-7xl lg:mx-auto px-4 py-4 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
            <div className="mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                ダッシュボード
              </h1>
              <p className="text-gray-600 mt-1">
                登録した商品の概要と詳細を確認できます
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/capture")}
                className="inline-flex items-center justify-center px-6 py-4 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors min-h-[52px] touch-manipulation"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                新しいアイテムを追加
              </button>

              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="inline-flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[52px] touch-manipulation"
              >
                {isExporting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                    エクスポート中...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    CSV出力
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6">
            <Alert
              variant="error"
              description={error}
              onClose={handleDismissError}
            />
          </div>
        )}

        {/* Family Sharing */}
        <FamilySharing
          className="mb-8"
          onRealmChange={() => setRefreshTrigger((v) => v + 1)}
        />

        {/* Dashboard Summary */}
        <DashboardSummary
          refreshTrigger={refreshTrigger}
          onError={setError}
          className="mb-8"
        />

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">登録商品一覧</h2>
            <p className="text-sm text-gray-600 mt-1">
              商品をクリックして詳細を編集できます
            </p>
          </div>
          <div className="p-6">
            <ItemsTable
              refreshTrigger={refreshTrigger}
              onRowClick={handleItemClick}
              className=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}
