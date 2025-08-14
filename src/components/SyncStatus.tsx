"use client";

import { useState, useEffect } from "react";
import { subscribeSyncState, triggerSync, SyncState } from "@/lib/sync-utils";

export default function SyncStatus({ className = "" }: { className?: string }) {
  const [syncState, setSyncState] = useState<SyncState>({
    status: "disconnected",
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Subscribe to sync state changes
    const unsubscribe = subscribeSyncState((state) => {
      setSyncState(state);
    });

    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    if (isManualSyncing || syncState.status === "disabled") return;

    setIsManualSyncing(true);
    try {
      await triggerSync();
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Don't show if Dexie Cloud is disabled
  if (syncState.status === "disabled") {
    return null;
  }

  const getStatusIcon = () => {
    switch (syncState.status) {
      case "connected":
        return (
          <svg
            className="w-4 h-4 text-suzu-success"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "syncing":
        return (
          <svg
            className="w-4 h-4 text-suzu-primary-600 animate-spin"
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
        );
      case "error":
        return (
          <svg
            className="w-4 h-4 text-suzu-error"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4 text-suzu-neutral-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const getStatusText = () => {
    switch (syncState.status) {
      case "connected":
        return "同期済み";
      case "syncing":
        return "同期中...";
      case "error":
        return "同期エラー";
      case "disconnected":
        return "オフライン";
      default:
        return "不明";
    }
  };

  const getStatusColor = () => {
    switch (syncState.status) {
      case "connected":
        return "text-suzu-success bg-suzu-success-50 border-suzu-success-200";
      case "syncing":
        return "text-suzu-primary-700 bg-suzu-primary-50 border-suzu-primary-200";
      case "error":
        return "text-suzu-error bg-suzu-error-50 border-suzu-error-200";
      default:
        return "text-suzu-neutral-600 bg-suzu-neutral-50 border-suzu-neutral-200";
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center px-3 py-1.5 rounded-lg border ${getStatusColor()} text-xs font-medium transition-all hover:shadow-sm`}
      >
        {getStatusIcon()}
        <span className="ml-1.5">{getStatusText()}</span>
      </button>

      {showDetails && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-suzu-brown-200 z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-suzu-neutral-900 mb-3">
              同期ステータス
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-suzu-neutral-600">状態:</span>
                <span className="font-medium">{getStatusText()}</span>
              </div>

              {syncState.lastSyncTime && (
                <div className="flex items-center justify-between">
                  <span className="text-suzu-neutral-600">最終同期:</span>
                  <span className="font-medium">
                    {new Date(syncState.lastSyncTime).toLocaleTimeString(
                      "ja-JP",
                    )}
                  </span>
                </div>
              )}

              {syncState.error && (
                <div className="mt-2 p-2 bg-suzu-error-50 rounded text-suzu-error text-xs">
                  {syncState.error}
                </div>
              )}
            </div>

            <button
              onClick={handleManualSync}
              disabled={isManualSyncing || syncState.status === "syncing"}
              className="mt-3 w-full px-3 py-2 bg-suzu-primary-500 text-white text-xs font-medium rounded-md hover:bg-suzu-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isManualSyncing ? "同期中..." : "手動で同期"}
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}
