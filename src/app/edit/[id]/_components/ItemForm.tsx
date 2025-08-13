"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addItem, updateItem, deleteItem } from "@/lib/db";
import { createBlobUrl, revokeBlobUrl } from "@/lib/image-utils";
import { ACTION_ENUM, CONDITION_ENUM } from "@/lib/constants";
import type { SuzuMemoItem } from "@/lib/types";
import { useCurrentRealmId } from "@/contexts/realm-context";
import {
  ItemNamesSection,
  DescriptionSection,
  QuantityCategoryRow,
  ConditionSelector,
  PriceSection,
  ActionSelector,
  OnlineFields,
  TrashFields,
  NotesKeywordsSection,
  FormActions,
} from "@/components/form";

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
  condition: z.enum(CONDITION_ENUM).describe("商品状態を選択してください"),
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
    .enum(ACTION_ENUM)
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

type InferredItemFormData = z.infer<typeof itemFormSchema>;

interface ItemFormProps {
  item?: SuzuMemoItem;
  onSave: (id: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
  className?: string;
}

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

  // Get current realm ID from context
  const currentRealmId = useCurrentRealmId();

  // Form setup with react-hook-form and Zod
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<InferredItemFormData>({
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

  const onSubmit = async (data: InferredItemFormData) => {
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
          finalData as Omit<SuzuMemoItem, "id" | "createdAt" | "updatedAt">,
          currentRealmId,
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
    (fieldName: keyof InferredItemFormData, value: string) => {
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
            <label className="block text-sm font-medium text-suzu-neutral-800">
              商品写真
            </label>
            <div className="w-full h-48 rounded-lg overflow-hidden bg-suzu-cream">
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
        <ItemNamesSection register={register} errors={errors} />

        {/* Description */}
        <DescriptionSection register={register} errors={errors} />

        {/* Quantity and Category Row */}
        <QuantityCategoryRow control={control} errors={errors} />

        {/* Condition */}
        <ConditionSelector control={control} errors={errors} />

        {/* Price Information */}
        <PriceSection setValue={setValue} watch={watch} register={register} />

        {/* Recommended Action */}
        <ActionSelector control={control} errors={errors} />

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
            <div className="bg-suzu-cream rounded-lg p-3 border border-suzu-brown-200">
              <p className="text-sm text-suzu-neutral-800 leading-relaxed">
                {watchedRationale || "推奨理由を取得中..."}
              </p>
            </div>
          </div>
          {/* Hidden input to maintain form validation */}
          <input type="hidden" {...register("actionRationale")} />
          {errors.actionRationale && (
            <p className="mt-1 text-sm text-suzu-error">
              {errors.actionRationale.message}
            </p>
          )}
        </div>

        {/* Conditional Fields Based on Action */}
        {watchedAction === "online" && (
          <OnlineFields item={item} handleArrayInput={handleArrayInput} />
        )}

        {watchedAction === "trash" && (
          <TrashFields control={control} errors={errors} />
        )}

        {/* Notes and Keywords */}
        <NotesKeywordsSection
          register={register}
          errors={errors}
          item={item}
          handleArrayInput={handleArrayInput}
        />

        {/* Form Actions */}
        <FormActions
          item={item}
          isValid={isValid}
          isSubmitting={isSubmitting}
          isDeleting={isDeleting}
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
          onCancel={onCancel}
          onDelete={handleDelete}
        />
      </form>
    </div>
  );
}
