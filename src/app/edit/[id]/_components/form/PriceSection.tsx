import React from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import type { ItemFormInput } from "@/lib/schemas/item.schema";

interface PriceSectionProps {
  form: UseFormReturn<ItemFormInput>;
}

const PriceSection: React.FC<PriceSectionProps> = ({ form }) => {
  const {
    register,
    formState: { errors },
  } = form;

  // Use useWatch for selective watching - better performance
  const onlinePrice = useWatch({
    control: form.control,
    name: "onlineAuctionPriceJPY",
  });

  const thriftPrice = useWatch({
    control: form.control,
    name: "thriftShopPriceJPY",
  });

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
        {onlinePrice && (
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
                  type="number"
                  inputMode="numeric"
                  {...register("onlineAuctionPriceJPY.low", {
                    valueAsNumber: true,
                  })}
                  className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
                  placeholder="0"
                />
                {errors.onlineAuctionPriceJPY?.low && (
                  <p className="mt-1 text-xs text-suzu-error">
                    {errors.onlineAuctionPriceJPY.low.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-suzu-neutral-600 mb-1">
                  最高価格
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  {...register("onlineAuctionPriceJPY.high", {
                    valueAsNumber: true,
                  })}
                  className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
                  placeholder="0"
                />
                {errors.onlineAuctionPriceJPY?.high && (
                  <p className="mt-1 text-xs text-suzu-error">
                    {errors.onlineAuctionPriceJPY.high.message}
                  </p>
                )}
              </div>
            </div>

            {/* Online Price Confidence - Read-only from AI */}
            {onlinePrice?.confidence !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-700">AI信頼度</span>
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-green-800 mr-2">
                      {Math.round(onlinePrice.confidence * 100)}%
                    </span>
                    <div className="w-16 h-1 bg-green-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 transition-all duration-300"
                        style={{
                          width: `${onlinePrice.confidence * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-green-600">
                  {onlinePrice.confidence >= 0.8 ? (
                    <>🟢 高：市場データ豊富</>
                  ) : onlinePrice.confidence >= 0.5 ? (
                    <>🟡 中：一部不明</>
                  ) : (
                    <>🔴 低：データ不足</>
                  )}
                </div>
              </div>
            )}
            {/* Hidden input to maintain confidence value */}
            <input
              type="hidden"
              {...register("onlineAuctionPriceJPY.confidence", {
                valueAsNumber: true,
              })}
            />
          </div>
        )}

        {/* Thrift Shop Pricing */}
        {thriftPrice && (
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
                  type="number"
                  inputMode="numeric"
                  {...register("thriftShopPriceJPY.low", {
                    valueAsNumber: true,
                  })}
                  className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
                  placeholder="0"
                />
                {errors.thriftShopPriceJPY?.low && (
                  <p className="mt-1 text-xs text-suzu-error">
                    {errors.thriftShopPriceJPY.low.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-suzu-neutral-600 mb-1">
                  最高価格
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  {...register("thriftShopPriceJPY.high", {
                    valueAsNumber: true,
                  })}
                  className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
                  placeholder="0"
                />
                {errors.thriftShopPriceJPY?.high && (
                  <p className="mt-1 text-xs text-suzu-error">
                    {errors.thriftShopPriceJPY.high.message}
                  </p>
                )}
              </div>
            </div>

            {/* Thrift Price Confidence - Read-only from AI */}
            {thriftPrice?.confidence !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-yellow-700">AI信頼度</span>
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-yellow-800 mr-2">
                      {Math.round(thriftPrice.confidence * 100)}%
                    </span>
                    <div className="w-16 h-1 bg-yellow-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-600 transition-all duration-300"
                        style={{
                          width: `${thriftPrice.confidence * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-yellow-600">
                  {thriftPrice.confidence >= 0.8 ? (
                    <>🟢 高：市場データ豊富</>
                  ) : thriftPrice.confidence >= 0.5 ? (
                    <>🟡 中：一部不明</>
                  ) : (
                    <>🔴 低：データ不足</>
                  )}
                </div>
              </div>
            )}
            {/* Hidden input to maintain confidence value */}
            <input
              type="hidden"
              {...register("thriftShopPriceJPY.confidence", {
                valueAsNumber: true,
              })}
            />
          </div>
        )}
      </div>

      {/* Error messages for nested price validation */}
      {errors.onlineAuctionPriceJPY?.message && (
        <p className="mt-2 text-sm text-suzu-error">
          {errors.onlineAuctionPriceJPY.message}
        </p>
      )}
      {errors.thriftShopPriceJPY?.message && (
        <p className="mt-2 text-sm text-suzu-error">
          {errors.thriftShopPriceJPY.message}
        </p>
      )}
    </div>
  );
};

export default PriceSection;
