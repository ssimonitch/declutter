"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addItem, updateItem, deleteItem } from "@/lib/db";
import { createBlobUrl, revokeBlobUrl } from "@/lib/image-utils";
import type { DeclutterItem } from "@/lib/types";

// Zod schema for form validation
const itemFormSchema = z.object({
  photo: z.instanceof(Blob).optional(),
  thumbnail: z.instanceof(Blob).optional(),

  // Name fields
  nameJapaneseSpecific: z
    .string()
    .max(100, "日本語名（詳細）は100文字以内で入力してください")
    .optional(),
  nameEnglishSpecific: z
    .string()
    .max(100, "英語名（詳細）は100文字以内で入力してください")
    .optional(),
  nameJapaneseGeneric: z
    .string()
    .max(100, "日本語名（一般）は100文字以内で入力してください")
    .optional(),
  nameEnglishGeneric: z
    .string()
    .max(100, "英語名（一般）は100文字以内で入力してください")
    .optional(),

  description: z
    .string()
    .min(1, "説明は必須です")
    .max(1000, "説明は1000文字以内で入力してください"),
  category: z.string().min(1, "カテゴリーは必須です"),
  condition: z
    .enum(["new", "like_new", "good", "fair", "poor"] as const)
    .describe("商品状態を選択してください"),
  quantity: z
    .number()
    .min(1, "数量は1以上である必要があります")
    .max(999, "数量は999以下である必要があります")
    .int("数量は整数である必要があります"),

  // Price fields
  onlineAuctionPriceJPY: z
    .object({
      low: z.number().min(0, "最低価格は0以上である必要があります"),
      high: z.number().min(0, "最高価格は0以上である必要があります"),
      confidence: z
        .number()
        .min(0)
        .max(1, "信頼度は0から1の間である必要があります"),
    })
    .refine((data) => data.high >= data.low, {
      message: "最高価格は最低価格以上である必要があります",
      path: ["high"],
    })
    .optional(),
  thriftShopPriceJPY: z
    .object({
      low: z.number().min(0, "最低価格は0以上である必要があります"),
      high: z.number().min(0, "最高価格は0以上である必要があります"),
      confidence: z
        .number()
        .min(0)
        .max(1, "信頼度は0から1の間である必要があります"),
    })
    .refine((data) => data.high >= data.low, {
      message: "最高価格は最低価格以上である必要があります",
      path: ["high"],
    })
    .optional(),

  recommendedAction: z
    .enum(["keep", "trash", "thrift", "online", "donate"] as const)
    .describe("推奨アクションを選択してください"),
  actionRationale: z
    .string()
    .min(1, "推奨理由は必須です")
    .max(500, "理由は500文字以内で入力してください"),
  marketplaces: z.array(z.string()).default([]),
  searchQueries: z.array(z.string()).default([]),
  specialNotes: z
    .string()
    .max(500, "特記事項は500文字以内で入力してください")
    .nullable()
    .default(null),
  keywords: z.array(z.string()).default([]),

  // Disposal cost field
  disposalCostJPY: z
    .number()
    .min(0, "処分費用は0以上である必要があります")
    .nullable()
    .optional(),
  municipalityCode: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

interface ItemFormProps {
  item?: DeclutterItem;
  onSave: (id: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
  className?: string;
}

// 商品状態の選択肢（高齢者にも分かりやすく）
const conditionOptions = [
  { value: "new", label: "新品", description: "購入後未使用、タグ付き" },
  { value: "like_new", label: "ほぼ新品", description: "数回しか使っていない" },
  { value: "good", label: "良い", description: "普通に使える、小さな傷程度" },
  { value: "fair", label: "普通", description: "使用感あり、傷や汚れあり" },
  { value: "poor", label: "難あり", description: "壊れている、修理が必要" },
] as const;

// おすすめアクションの選択肢
const actionOptions = [
  {
    value: "keep",
    label: "保管する",
    description: "今後も使うので残す",
    icon: "🏠",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    value: "online",
    label: "フリマで売る",
    description: "メルカリやヤフオクで販売",
    icon: "💰",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  {
    value: "thrift",
    label: "リサイクル店へ",
    description: "近くのお店に持ち込み",
    icon: "🏪",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  {
    value: "donate",
    label: "寄付する",
    description: "困っている人に役立てる",
    icon: "❤️",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    value: "trash",
    label: "処分する",
    description: "ごみとして捨てる",
    icon: "🗑️",
    color: "bg-red-100 text-red-800 border-red-200",
  },
] as const;

// Common categories - matching Gemini's output format
const categoryOptions = [
  "家電",
  "家具",
  "衣類",
  "本・メディア",
  "雑貨",
  "その他",
];

export default function ItemForm({
  item,
  onSave,
  onCancel,
  onError,
  className = "",
}: ItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form setup with react-hook-form and Zod
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ItemFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(itemFormSchema) as any,
    mode: "onChange", // Enable validation on change for better UX
    defaultValues: item
      ? {
          photo: item.photo,
          thumbnail: item.thumbnail,
          // Name fields
          nameJapaneseSpecific: item.nameJapaneseSpecific || "",
          nameEnglishSpecific: item.nameEnglishSpecific || "",
          nameJapaneseGeneric: item.nameJapaneseGeneric || "",
          nameEnglishGeneric: item.nameEnglishGeneric || "",
          description: item.description,
          category: item.category,
          condition: item.condition,
          quantity: item.quantity || 1,
          // Price fields
          onlineAuctionPriceJPY: item.onlineAuctionPriceJPY,
          thriftShopPriceJPY: item.thriftShopPriceJPY,
          recommendedAction: item.recommendedAction,
          actionRationale: item.actionRationale || "",
          marketplaces: item.marketplaces,
          searchQueries: item.searchQueries,
          specialNotes: item.specialNotes,
          keywords: item.keywords,
          disposalCostJPY: item.disposalCostJPY,
          municipalityCode: item.municipalityCode,
        }
      : undefined,
  });

  // Watch form values for conditional rendering
  const watchedAction = watch("recommendedAction");
  const watchedRationale = watch("actionRationale");
  const watchedOnlinePrice = watch("onlineAuctionPriceJPY");
  const watchedThriftPrice = watch("thriftShopPriceJPY");

  // Debug logging for form validity
  useEffect(() => {
    console.log("Form validation state:", {
      isValid,
      errors,
      hasItem: !!item,
      itemId: item?.id,
    });
  }, [isValid, errors, item]);

  // Setup preview URL for photo
  useEffect(() => {
    const watchedPhoto = watch("photo");
    if (watchedPhoto && watchedPhoto instanceof Blob) {
      const url = createBlobUrl(watchedPhoto);
      setPreviewUrl(url);
      return () => {
        revokeBlobUrl(url);
      };
    }
  }, [watch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        revokeBlobUrl(previewUrl);
      }
    };
  }, [previewUrl]);

  const onSubmit = async (data: ItemFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      let itemId: string;

      // Ensure we have photo and thumbnail from the item if they're not in the form data
      const finalData = {
        ...data,
        photo: data.photo || item?.photo,
        thumbnail: data.thumbnail || item?.thumbnail,
        disposalCostJPY: data.disposalCostJPY || undefined, // Convert null to undefined
      };

      // Validate that we have required photo/thumbnail
      if (!finalData.photo || !finalData.thumbnail) {
        throw new Error(
          "写真データが見つかりません。もう一度写真を撮影してください。",
        );
      }

      if (item && item.id !== "new") {
        // Update existing item (id exists and is not "new")
        await updateItem(item.id, finalData);
        itemId = item.id;
      } else {
        // Create new item (no item or id is "new")
        // Cast is safe because we validated photo/thumbnail exist above
        itemId = await addItem(
          finalData as Omit<DeclutterItem, "id" | "createdAt" | "updatedAt">,
        );
      }

      onSave(itemId);
    } catch (error) {
      console.error("Failed to save item:", error);
      onError(error instanceof Error ? error.message : "Failed to save item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteItem(item.id);
      setShowDeleteConfirm(false);
      onSave(item.id); // Navigate away after successful deletion
    } catch (error) {
      console.error("Failed to delete item:", error);
      onError(error instanceof Error ? error.message : "Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function to format array inputs
  const handleArrayInput = useCallback(
    (fieldName: keyof ItemFormData, value: string) => {
      const items = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue(fieldName, items as any, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [setValue],
  );

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Photo Preview */}
        {previewUrl && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              商品写真
            </label>
            <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob URLs not supported by Next.js Image */}
              <img
                src={previewUrl}
                alt="商品写真"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Name Fields */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-3">商品名情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Specific Names */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-blue-800 uppercase tracking-wider">
                詳細名（ブランド・型番含む）
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  日本語（詳細）
                </label>
                <input
                  {...register("nameJapaneseSpecific")}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
                  placeholder="例: ソニー ワイヤレスヘッドホン WH-1000XM4"
                />
                {errors.nameJapaneseSpecific && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.nameJapaneseSpecific.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  英語（詳細）
                </label>
                <input
                  {...register("nameEnglishSpecific")}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
                  placeholder="例: Sony Wireless Headphones WH-1000XM4"
                />
                {errors.nameEnglishSpecific && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.nameEnglishSpecific.message}
                  </p>
                )}
              </div>
            </div>

            {/* Generic Names */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-blue-800 uppercase tracking-wider">
                一般名（カテゴリー）
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  日本語（一般）
                </label>
                <input
                  {...register("nameJapaneseGeneric")}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
                  placeholder="例: ワイヤレスヘッドホン"
                />
                {errors.nameJapaneseGeneric && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.nameJapaneseGeneric.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  英語（一般）
                </label>
                <input
                  {...register("nameEnglishGeneric")}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
                  placeholder="例: Wireless Headphones"
                />
                {errors.nameEnglishGeneric && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.nameEnglishGeneric.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            商品説明 <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register("description")}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
            placeholder="商品の詳細な説明を入力"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Quantity and Category Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              数量 <span className="text-red-500">*</span>
            </label>
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min="1"
                  max="999"
                  step="1"
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
                  placeholder="1"
                />
              )}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">
                {errors.quantity.message}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリー <span className="text-red-500">*</span>
            </label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
                >
                  <option value="">カテゴリーを選択</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">
                {errors.category.message}
              </p>
            )}
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            商品状態 <span className="text-red-500">*</span>
          </label>
          <Controller
            name="condition"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {conditionOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      field.value === option.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      {...field}
                      value={option.value}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          />
          {errors.condition && (
            <p className="mt-1 text-sm text-red-600">
              {errors.condition.message}
            </p>
          )}
        </div>

        {/* Price Information */}
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
              <div className="text-green-800 font-medium mb-1">
                信頼度レベル
              </div>
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
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                  <span className="text-red-700">低 (0-49%): データ不足</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Online Auction Pricing */}
            {(watchedOnlinePrice || watchedAction === "online") && (
              <div className="bg-white rounded-lg p-4 border border-green-300">
                <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                  💰 オンライン販売価格（メルカリ・ヤフオク等）
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      最低価格
                    </label>
                    <Controller
                      name="onlineAuctionPriceJPY.low"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="0"
                          step="100"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 font-medium text-sm"
                          placeholder="0"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      最高価格
                    </label>
                    <Controller
                      name="onlineAuctionPriceJPY.high"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="0"
                          step="100"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 font-medium text-sm"
                          placeholder="0"
                        />
                      )}
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
            {(watchedThriftPrice || watchedAction === "thrift") && (
              <div className="bg-white rounded-lg p-4 border border-yellow-300">
                <h4 className="text-sm font-semibold text-yellow-800 mb-3 flex items-center">
                  🏪 リサイクルショップ価格
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      最低価格
                    </label>
                    <Controller
                      name="thriftShopPriceJPY.low"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="0"
                          step="100"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 font-medium text-sm"
                          placeholder="0"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      最高価格
                    </label>
                    <Controller
                      name="thriftShopPriceJPY.high"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="0"
                          step="100"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 font-medium text-sm"
                          placeholder="0"
                        />
                      )}
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
                <input
                  type="hidden"
                  {...register("thriftShopPriceJPY.confidence")}
                />
              </div>
            )}
          </div>
        </div>

        {/* Recommended Action */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            推奨アクション <span className="text-red-500">*</span>
          </label>
          <Controller
            name="recommendedAction"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {actionOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      field.value === option.value
                        ? `border-blue-500 ${option.color}`
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      {...field}
                      value={option.value}
                      className="sr-only"
                    />
                    <div className="text-2xl mr-3">{option.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          />
          {errors.recommendedAction && (
            <p className="mt-1 text-sm text-red-600">
              {errors.recommendedAction.message}
            </p>
          )}
        </div>

        {/* Action Rationale - AI Generated (Readonly) */}
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start mb-2">
              <svg
                className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  AIが分析した推奨理由
                </h3>
                <p className="text-xs text-blue-700">
                  この理由は商品の写真と情報を基にAIが生成しました
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-sm text-gray-800 leading-relaxed">
                {watchedRationale || "推奨理由を取得中..."}
              </p>
            </div>
          </div>
          {/* Hidden input to maintain form validation */}
          <input type="hidden" {...register("actionRationale")} />
          {errors.actionRationale && (
            <p className="mt-1 text-sm text-red-600">
              {errors.actionRationale.message}
            </p>
          )}
        </div>

        {/* Marketplaces - Only show for online sales */}
        {watchedAction === "online" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              推奨販売先
            </label>
            <input
              type="text"
              onChange={(e) => handleArrayInput("marketplaces", e.target.value)}
              defaultValue={item?.marketplaces?.join(", ") || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="メルカリ, ヤフオク (カンマ区切り)"
            />
          </div>
        )}

        {/* Search Queries - Only show for online sales */}
        {watchedAction === "online" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              検索キーワード
            </label>
            <input
              type="text"
              onChange={(e) =>
                handleArrayInput("searchQueries", e.target.value)
              }
              defaultValue={item?.searchQueries?.join(", ") || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="検索で使えるキーワード (カンマ区切り)"
            />
          </div>
        )}

        {/* Disposal Cost - Only show for trash */}
        {watchedAction === "trash" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-900 mb-3 flex items-center">
              🗑️ 処分費用情報
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  処分費用 (JPY)
                </label>
                <Controller
                  name="disposalCostJPY"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      min="0"
                      step="100"
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value
                          ? parseInt(e.target.value)
                          : null;
                        field.onChange(value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 font-medium"
                      placeholder="粗大ごみ処分費用（分からない場合は空欄）"
                    />
                  )}
                />
                {errors.disposalCostJPY && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.disposalCostJPY.message}
                  </p>
                )}
              </div>

              <div className="text-xs text-red-700 bg-white rounded p-2 border border-red-200">
                💡 ヒント: 自治体のウェブサイトで「粗大ごみ
                手数料」を検索すると料金が確認できます
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Special Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            特記事項
          </label>
          <textarea
            {...register("specialNotes")}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
            placeholder="注意事項や補足情報（例: 傷の場所、付属品の有無、特別な処分方法など）"
          />
          {errors.specialNotes && (
            <p className="mt-1 text-sm text-red-600">
              {errors.specialNotes.message}
            </p>
          )}
          <div className="mt-1 text-xs text-gray-500">
            注意: 個人情報や住所などの機密情報は入力しないでください
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            検索用キーワード
          </label>
          <input
            type="text"
            onChange={(e) => handleArrayInput("keywords", e.target.value)}
            defaultValue={item?.keywords?.join(", ") || ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="内部検索用キーワード (カンマ区切り)"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || isDeleting}
            className="flex-1 sm:flex-none sm:order-1 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            キャンセル
          </button>

          {/* Delete Button - Only show for existing items */}
          {item && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting || isDeleting}
              className="flex-1 sm:flex-none sm:order-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              削除
            </button>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={!isValid || isSubmitting || isDeleting}
            className="flex-1 sm:order-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                {item ? "更新中..." : "保存中..."}
              </div>
            ) : item && item.id !== "new" ? (
              "更新"
            ) : (
              "保存"
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              削除の確認
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              この商品「{item?.nameEnglishSpecific}
              」を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "削除中..." : "削除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
