"use client";

import { useEffect, useState } from "react";
import { initializeDatabase } from "@/lib/db";
import { initializeTempStorage } from "@/lib/temp-store";

export default function DatabaseInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize both main database and temporary storage
    Promise.all([initializeDatabase(), initializeTempStorage()])
      .then(() => {
        setIsReady(true);
      })
      .catch((err) => {
        console.error("Failed to initialize databases:", err);
        setError(err.message || "Failed to initialize databases");
        // Still mark as ready to allow the app to render
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-suzu-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-suzu-primary-500 mx-auto mb-4"></div>
          <p className="text-suzu-neutral-600">データベースを初期化中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-suzu-cream flex items-center justify-center">
        <div className="bg-suzu-neutral-50 rounded-lg border border-suzu-neutral-300 shadow-lg p-8 max-w-md">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-suzu-error mb-4"
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
            <h3 className="text-lg font-medium text-suzu-neutral-800 mb-2">
              データベースエラー
            </h3>
            <p className="text-sm text-suzu-neutral-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-suzu-error text-white rounded-lg hover:bg-red-600"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
