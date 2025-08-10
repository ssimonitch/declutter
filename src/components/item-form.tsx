"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addItem, updateItem, deleteItem } from "@/lib/db";
import { createBlobUrl, revokeBlobUrl } from "@/lib/image-utils";
import type { DeclutterItem } from "@/lib/types";

// Zod schema for form validation
const itemFormSchema = z.object({
  photo: z
    .instanceof(Blob)
    .refine((blob) => blob.size > 0, "Photo is required"),
  thumbnail: z
    .instanceof(Blob)
    .refine((blob) => blob.size > 0, "Thumbnail is required"),
  name: z
    .string()
    .min(1, "商品名は必須です")
    .max(100, "商品名は100文字以内で入力してください"),
  nameJapanese: z
    .string()
    .max(100, "日本語名は100文字以内で入力してください")
    .optional(),
  description: z
    .string()
    .min(1, "説明は必須です")
    .max(1000, "説明は1000文字以内で入力してください"),
  category: z.string().min(1, "カテゴリーは必須です"),
  condition: z
    .enum(["new", "like_new", "good", "fair", "poor"] as const)
    .describe("商品状態を選択してください"),
  estimatedPriceJPY: z
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
    }),
  recommendedAction: z
    .enum(["keep", "trash", "thrift", "online", "donate"] as const)
    .describe("推奨アクションを選択してください"),
  actionRationale: z
    .string()
    .max(500, "理由は500文字以内で入力してください")
    .optional(),
  marketplaces: z.array(z.string()).default([]),
  searchQueries: z.array(z.string()).default([]),
  specialNotes: z
    .string()
    .max(500, "特記事項は500文字以内で入力してください")
    .default(""),
  keywords: z.array(z.string()).default([]),
  disposalFeeJPY: z
    .number()
    .min(0, "処分費用は0以上である必要があります")
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

// Condition options with Japanese labels
const conditionOptions = [
  { value: "new", label: "新品", description: "未使用・新品" },
  { value: "like_new", label: "新品同様", description: "ほぼ未使用" },
  { value: "good", label: "良好", description: "軽い使用感あり" },
  { value: "fair", label: "可", description: "使用感や軽微なキズあり" },
  { value: "poor", label: "要修理", description: "故障や大きなダメージあり" },
] as const;

// Action options with Japanese labels and icons
const actionOptions = [
  {
    value: "keep",
    label: "保管",
    description: "手元に残す",
    icon: "🏠",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    value: "online",
    label: "オンライン販売",
    description: "メルカリ・ヤフオク等",
    icon: "💰",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  {
    value: "thrift",
    label: "リサイクルショップ",
    description: "実店舗で販売",
    icon: "🏪",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  {
    value: "donate",
    label: "寄付",
    description: "NPO・福祉施設等",
    icon: "❤️",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    value: "trash",
    label: "廃棄",
    description: "ゴミとして処分",
    icon: "🗑️",
    color: "bg-red-100 text-red-800 border-red-200",
  },
] as const;

// Common categories
const categoryOptions = [
  "家電",
  "家具",
  "衣類・アクセサリー",
  "本・雑誌・メディア",
  "雑貨・生活用品",
  "食器・キッチン用品",
  "おもちゃ・ゲーム",
  "スポーツ・アウトドア",
  "コレクション",
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
    defaultValues: item
      ? {
          photo: item.photo,
          thumbnail: item.thumbnail,
          name: item.name,
          nameJapanese: item.nameJapanese || "",
          description: item.description,
          category: item.category,
          condition: item.condition,
          estimatedPriceJPY: item.estimatedPriceJPY,
          recommendedAction: item.recommendedAction,
          actionRationale: item.actionRationale || "",
          marketplaces: item.marketplaces,
          searchQueries: item.searchQueries,
          specialNotes: item.specialNotes,
          keywords: item.keywords,
          disposalFeeJPY: item.disposalFeeJPY,
          municipalityCode: item.municipalityCode,
        }
      : undefined,
    mode: "onChange",
  });

  // Watch form values for conditional rendering
  const watchedAction = watch("recommendedAction");
  const watchedPhoto = watch("photo");

  // Setup preview URL for photo
  useEffect(() => {
    if (watchedPhoto && watchedPhoto instanceof Blob) {
      const url = createBlobUrl(watchedPhoto);
      setPreviewUrl(url);
      return () => {
        revokeBlobUrl(url);
      };
    }
  }, [watchedPhoto]);

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

      if (item) {
        // Update existing item
        await updateItem(item.id, data);
        itemId = item.id;
      } else {
        // Create new item
        itemId = await addItem(data);
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
  const handleArrayInput = (fieldName: keyof ItemFormData, value: string) => {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setValue(fieldName, items, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

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
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              商品名 <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name")}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="商品名を入力"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日本語名
            </label>
            <input
              {...register("nameJapanese")}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="日本語での商品名（任意）"
            />
            {errors.nameJapanese && (
              <p className="mt-1 text-sm text-red-600">
                {errors.nameJapanese.message}
              </p>
            )}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="商品の詳細な説明を入力"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">
              {errors.description.message}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            推定価格帯 (JPY)
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                最低価格
              </label>
              <Controller
                name="estimatedPriceJPY.low"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                最高価格
              </label>
              <Controller
                name="estimatedPriceJPY.high"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">信頼度</label>
              <Controller
                name="estimatedPriceJPY.confidence"
                control={control}
                render={({ field }) => (
                  <div className="space-y-1">
                    <input
                      {...field}
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-center text-gray-500">
                      {Math.round((field.value || 0) * 100)}%
                    </div>
                  </div>
                )}
              />
            </div>
          </div>
          {(errors.estimatedPriceJPY?.low ||
            errors.estimatedPriceJPY?.high ||
            errors.estimatedPriceJPY?.confidence) && (
            <p className="mt-1 text-sm text-red-600">
              {errors.estimatedPriceJPY?.low?.message ||
                errors.estimatedPriceJPY?.high?.message ||
                errors.estimatedPriceJPY?.confidence?.message}
            </p>
          )}
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

        {/* Action Rationale */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            推奨理由
          </label>
          <textarea
            {...register("actionRationale")}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="なぜこのアクションを推奨するかの理由"
          />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="検索で使えるキーワード (カンマ区切り)"
            />
          </div>
        )}

        {/* Disposal Fee - Only show for trash */}
        {watchedAction === "trash" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              処分費用 (JPY)
            </label>
            <Controller
              name="disposalFeeJPY"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min="0"
                  step="100"
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value) || undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="粗大ごみ処分費用"
                />
              )}
            />
            {errors.disposalFeeJPY && (
              <p className="mt-1 text-sm text-red-600">
                {errors.disposalFeeJPY.message}
              </p>
            )}
          </div>
        )}

        {/* Special Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            特記事項
          </label>
          <textarea
            {...register("specialNotes")}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="注意事項や補足情報"
          />
          {errors.specialNotes && (
            <p className="mt-1 text-sm text-red-600">
              {errors.specialNotes.message}
            </p>
          )}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            ) : item ? (
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
              この商品「{item?.name}」を削除しますか？この操作は取り消せません。
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
