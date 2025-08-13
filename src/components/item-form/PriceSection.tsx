import React, { useCallback } from "react";
import {
  UseFormSetValue,
  UseFormWatch,
  UseFormRegister,
} from "react-hook-form";
import type { ItemFormData } from "./types";

interface PriceSectionProps {
  setValue: UseFormSetValue<ItemFormData>;
  watch: UseFormWatch<ItemFormData>;
  register: UseFormRegister<ItemFormData>;
}

const PriceSection: React.FC<PriceSectionProps> = ({
  setValue,
  watch,
  register,
}) => {
  const watchedOnlinePrice = watch("onlineAuctionPriceJPY");
  const watchedThriftPrice = watch("thriftShopPriceJPY");

  // Helper function to update nested price objects
  const updatePriceField = useCallback(
    (
      priceType: "onlineAuctionPriceJPY" | "thriftShopPriceJPY",
      field: "low" | "high",
      value: number,
    ) => {
      const currentPrice = watch(priceType) || {
        low: 0,
        high: 0,
        confidence: 0.5,
      };
      setValue(
        priceType,
        {
          ...currentPrice,
          [field]: value,
        },
        {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        },
      );
    },
    [setValue, watch],
  );

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-green-900 flex items-center">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            />
          </svg>
          市場別価格情報
        </h3>
        <div className="bg-white rounded-lg p-2 border border-green-300 text-xs">
          <div className="text-green-800 font-medium mb-1">信頼度レベル</div>
          <div className="space-y-0.5">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-600 rounded-full mr-1.5"></span>
              <span className="text-green-700">
                高 (80-100%): 市場データ豊富
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1.5"></span>
              <span className="text-yellow-700">中 (50-79%): 一部不明</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-suzu-error rounded-full mr-1.5"></span>
              <span className="text-suzu-error">低 (0-49%): データ不足</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Online Auction Pricing */}
        {watchedOnlinePrice && (
          <div className="bg-white rounded-lg p-4 border border-green-300">
            <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
              💰 オンライン販売価格（メルカリ・ヤフオク等）
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-suzu-neutral-600 mb-1">
                  最低価格
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={watchedOnlinePrice?.low ?? ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    updatePriceField(
                      "onlineAuctionPriceJPY",
                      "low",
                      value ? parseInt(value) : 0,
                    );
                  }}
                  className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-suzu-neutral-600 mb-1">
                  最高価格
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={watchedOnlinePrice?.high ?? ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    updatePriceField(
                      "onlineAuctionPriceJPY",
                      "high",
                      value ? parseInt(value) : 0,
                    );
                  }}
                  className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
                  placeholder="0"
                />
              </div>
            </div>
            {/* Online Price Confidence */}
            {watchedOnlinePrice?.confidence !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-700">AI信頼度</span>
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-green-800 mr-2">
                      {Math.round(watchedOnlinePrice.confidence * 100)}%
                    </span>
                    <div className="w-16 h-1 bg-green-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 transition-all duration-300"
                        style={{
                          width: `${watchedOnlinePrice.confidence * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-green-600">
                  {watchedOnlinePrice.confidence >= 0.8 ? (
                    <>🟢 高：市場データ豊富</>
                  ) : watchedOnlinePrice.confidence >= 0.5 ? (
                    <>🟡 中：一部不明</>
                  ) : (
                    <>🔴 低：データ不足</>
                  )}
                </div>
              </div>
            )}
            <input
              type="hidden"
              {...register("onlineAuctionPriceJPY.confidence")}
            />
          </div>
        )}

        {/* Thrift Shop Pricing */}
        {watchedThriftPrice && (
          <div className="bg-white rounded-lg p-4 border border-yellow-300">
            <h4 className="text-sm font-semibold text-yellow-800 mb-3 flex items-center">
              🏪 リサイクルショップ価格
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-suzu-neutral-600 mb-1">
                  最低価格
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={watchedThriftPrice?.low ?? ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    updatePriceField(
                      "thriftShopPriceJPY",
                      "low",
                      value ? parseInt(value) : 0,
                    );
                  }}
                  className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-suzu-neutral-600 mb-1">
                  最高価格
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={watchedThriftPrice?.high ?? ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    updatePriceField(
                      "thriftShopPriceJPY",
                      "high",
                      value ? parseInt(value) : 0,
                    );
                  }}
                  className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
                  placeholder="0"
                />
              </div>
            </div>
            {/* Thrift Price Confidence */}
            {watchedThriftPrice?.confidence !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-yellow-700">AI信頼度</span>
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-yellow-800 mr-2">
                      {Math.round(watchedThriftPrice.confidence * 100)}%
                    </span>
                    <div className="w-16 h-1 bg-yellow-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-600 transition-all duration-300"
                        style={{
                          width: `${watchedThriftPrice.confidence * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-yellow-600">
                  {watchedThriftPrice.confidence >= 0.8 ? (
                    <>🟢 高：市場データ豊富</>
                  ) : watchedThriftPrice.confidence >= 0.5 ? (
                    <>🟡 中：一部不明</>
                  ) : (
                    <>🔴 低：データ不足</>
                  )}
                </div>
              </div>
            )}
            {watchedThriftPrice?.confidence !== undefined && (
              <input
                type="hidden"
                {...register("thriftShopPriceJPY.confidence")}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceSection;
