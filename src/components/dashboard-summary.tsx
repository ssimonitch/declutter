"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { calculateDashboardSummary } from "@/lib/db";
import type { DashboardSummary } from "@/lib/types";

interface DashboardSummaryProps {
  refreshTrigger?: number;
  onError?: (error: string) => void;
  className?: string;
}

// Action configuration for consistent styling
const actionConfig = {
  keep: {
    label: "保管",
    icon: "🏠",
    color: "bg-blue-500",
    lightColor: "bg-blue-100",
    textColor: "text-blue-800",
    description: "手元に残す品物",
  },
  online: {
    label: "オンライン販売",
    icon: "💰",
    color: "bg-green-500",
    lightColor: "bg-green-100",
    textColor: "text-green-800",
    description: "メルカリ・ヤフオク等で販売",
  },
  thrift: {
    label: "リサイクルショップ",
    icon: "🏪",
    color: "bg-yellow-500",
    lightColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    description: "実店舗で販売",
  },
  donate: {
    label: "寄付",
    icon: "❤️",
    color: "bg-purple-500",
    lightColor: "bg-purple-100",
    textColor: "text-purple-800",
    description: "NPO・福祉施設等に寄付",
  },
  trash: {
    label: "廃棄",
    icon: "🗑️",
    color: "bg-red-500",
    lightColor: "bg-red-100",
    textColor: "text-red-800",
    description: "ゴミとして処分",
  },
} as const;

export default function DashboardSummary({
  refreshTrigger = 0,
  onError,
  className = "",
}: DashboardSummaryProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await calculateDashboardSummary();
      setSummary(data);
    } catch (error) {
      console.error("Failed to load dashboard summary:", error);
      onError?.(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Load summary data
  useEffect(() => {
    loadSummary();
  }, [refreshTrigger, loadSummary]);

  // Calculate category chart data
  const categoryChartData = useMemo(() => {
    if (!summary) return [];

    const entries = Object.entries(summary.itemsByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Top 5 categories

    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    return entries.map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }, [summary]);

  // Calculate resale items count
  const resaleItemsCount = useMemo(() => {
    if (!summary) return 0;
    return summary.itemsByAction.online + summary.itemsByAction.thrift;
  }, [summary]);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-200 h-64 rounded-lg"></div>
            <div className="bg-gray-200 h-64 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-500 mb-4">
          ダッシュボードデータを読み込めませんでした
        </div>
        <button
          onClick={loadSummary}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {summary.totalItems}
          </div>
          <div className="text-sm text-gray-500">総商品数</div>
        </div>

        {/* Resale Value */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-lg font-bold text-green-600">
            ¥{summary.estimatedResaleValue.low.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">推定売上（最低）</div>
        </div>

        {/* Disposal Cost */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-lg font-bold text-red-600">
            ¥{summary.estimatedDisposalCost.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">処分費用</div>
        </div>

        {/* Confidence Score */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-lg font-bold text-blue-600">
            {Math.round(summary.estimatedResaleValue.averageConfidence * 100)}%
          </div>
          <div className="text-sm text-gray-500">平均信頼度</div>
        </div>
      </div>

      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            アクション別内訳
          </h3>
          <div className="space-y-4">
            {Object.entries(summary.itemsByAction).map(([action, count]) => {
              const config = actionConfig[action as keyof typeof actionConfig];
              const percentage =
                summary.totalItems > 0 ? (count / summary.totalItems) * 100 : 0;

              return (
                <div key={action} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div
                      className={`w-10 h-10 ${config.lightColor} rounded-lg flex items-center justify-center`}
                    >
                      <span className="text-lg">{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {config.label}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {config.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-500">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            カテゴリー別内訳
          </h3>
          {categoryChartData.length > 0 ? (
            <div className="space-y-3">
              {categoryChartData.map(({ category, count, percentage }) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">
                      {category}
                    </span>
                    <span className="text-gray-500">
                      {count}件 ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              カテゴリーデータがありません
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          財務サマリー
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Resale Value Range */}
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">推定売上範囲</div>
            <div className="text-xl font-bold text-green-600">
              ¥{summary.estimatedResaleValue.low.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">〜</div>
            <div className="text-xl font-bold text-green-600">
              ¥{summary.estimatedResaleValue.high.toLocaleString()}
            </div>
          </div>

          {/* Net Profit Estimate */}
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">推定純利益（最低）</div>
            <div className="text-xl font-bold text-blue-600">
              ¥
              {Math.max(
                0,
                summary.estimatedResaleValue.low -
                  summary.estimatedDisposalCost,
              ).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">売上 - 処分費用</div>
          </div>

          {/* Items for Sale */}
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">販売予定商品</div>
            <div className="text-xl font-bold text-purple-600">
              {resaleItemsCount}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              オンライン + リサイクル
            </div>
          </div>

          {/* Average Item Value */}
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">商品平均価格</div>
            <div className="text-xl font-bold text-orange-600">
              ¥
              {resaleItemsCount > 0
                ? Math.round(
                    (summary.estimatedResaleValue.low +
                      summary.estimatedResaleValue.high) /
                      2 /
                      resaleItemsCount,
                  ).toLocaleString()
                : "0"}
            </div>
            <div className="text-xs text-gray-400 mt-1">(中央値)</div>
          </div>
        </div>

        {/* Confidence Indicator */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              価格推定の信頼度
            </span>
            <span
              className={`text-sm font-semibold ${
                summary.estimatedResaleValue.averageConfidence >= 0.7
                  ? "text-green-600"
                  : summary.estimatedResaleValue.averageConfidence >= 0.4
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {Math.round(summary.estimatedResaleValue.averageConfidence * 100)}
              %
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                summary.estimatedResaleValue.averageConfidence >= 0.7
                  ? "bg-green-500"
                  : summary.estimatedResaleValue.averageConfidence >= 0.4
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{
                width: `${summary.estimatedResaleValue.averageConfidence * 100}%`,
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.estimatedResaleValue.averageConfidence >= 0.7
              ? "高い信頼度 - 価格推定は信頼できます"
              : summary.estimatedResaleValue.averageConfidence >= 0.4
                ? "中程度の信頼度 - 価格は目安として活用してください"
                : "低い信頼度 - 実際の価格と大きく異なる可能性があります"}
          </div>
        </div>
      </div>

      {/* Tips and Recommendations */}
      {summary.totalItems > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            💡 おすすめアクション
          </h3>
          <div className="space-y-2 text-sm">
            {summary.itemsByAction.online > 0 && (
              <div className="flex items-start space-x-2">
                <span className="text-blue-600">•</span>
                <span className="text-blue-800">
                  オンライン販売対象商品が{summary.itemsByAction.online}
                  件あります。メルカリやヤフオクでの出品を検討しましょう。
                </span>
              </div>
            )}
            {summary.itemsByAction.thrift > 0 && (
              <div className="flex items-start space-x-2">
                <span className="text-blue-600">•</span>
                <span className="text-blue-800">
                  リサイクルショップ対象商品が{summary.itemsByAction.thrift}
                  件あります。まとめて査定に出すと効率的です。
                </span>
              </div>
            )}
            {summary.estimatedDisposalCost > 0 && (
              <div className="flex items-start space-x-2">
                <span className="text-blue-600">•</span>
                <span className="text-blue-800">
                  処分費用が¥{summary.estimatedDisposalCost.toLocaleString()}
                  発生する予定です。自治体の回収日程を確認しておきましょう。
                </span>
              </div>
            )}
            {summary.estimatedResaleValue.averageConfidence < 0.5 && (
              <div className="flex items-start space-x-2">
                <span className="text-orange-600">•</span>
                <span className="text-orange-800">
                  価格推定の信頼度が低めです。実際の相場を調べて価格を再確認することをお勧めします。
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {summary.totalItems === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            まだ商品が登録されていません
          </h3>
          <p className="text-gray-500 mb-4">
            写真を撮影して商品を追加し、整理を始めましょう
          </p>
        </div>
      )}
    </div>
  );
}
