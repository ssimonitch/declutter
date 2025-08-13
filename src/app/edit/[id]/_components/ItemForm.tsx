"use client";

import React, { useState } from "react";
import { useWatch } from "react-hook-form";
import { deleteItem } from "@/lib/db";
import { useItemForm } from "./hooks/useItemForm";
import { useBlobPreview } from "./hooks/useBlobPreview";
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
} from "./form";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get current realm ID from context
  const currentRealmId = useCurrentRealmId();

  // Use the custom hook for form management
  const { form, onSubmit, isSubmitting } = useItemForm({
    item,
    currentRealmId: currentRealmId || undefined,
    onSuccess: onSave,
    onError,
  });

  const { handleSubmit, control, formState } = form;
  const { isValid } = formState;

  // Use selective watching for conditional rendering
  const watchedAction = useWatch({
    control,
    name: "recommendedAction",
  });

  const watchedRationale = useWatch({
    control,
    name: "actionRationale",
  });

  const watchedPhoto = useWatch({
    control,
    name: "photo",
  });

  // Use the blob preview hook for photo URL management
  const previewUrl = useBlobPreview(watchedPhoto || item?.photo);

  // Handle item deletion
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
        <ItemNamesSection form={form} />

        {/* Description */}
        <DescriptionSection form={form} />

        {/* Quantity and Category Row */}
        <QuantityCategoryRow form={form} />

        {/* Condition */}
        <ConditionSelector form={form} />

        {/* Price Information */}
        <PriceSection form={form} />

        {/* Recommended Action */}
        <ActionSelector form={form} />

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
          <input type="hidden" {...form.register("actionRationale")} />
          {form.formState.errors.actionRationale && (
            <p className="mt-1 text-sm text-suzu-error">
              {form.formState.errors.actionRationale.message}
            </p>
          )}
        </div>

        {/* Conditional Fields Based on Action */}
        {watchedAction === "online" && <OnlineFields form={form} />}

        {watchedAction === "trash" && <TrashFields form={form} />}

        {/* Notes and Keywords */}
        <NotesKeywordsSection form={form} />

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
