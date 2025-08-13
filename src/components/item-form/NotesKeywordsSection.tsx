import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import type { SuzuMemoItem } from "@/lib/types";
import type { ItemFormData } from "./types";

interface NotesKeywordsSectionProps {
  register: UseFormRegister<ItemFormData>;
  errors: FieldErrors<ItemFormData>;
  item?: SuzuMemoItem;
  handleArrayInput: (fieldName: keyof ItemFormData, value: string) => void;
}

const NotesKeywordsSection: React.FC<NotesKeywordsSectionProps> = ({
  register,
  errors,
  item,
  handleArrayInput,
}) => {
  return (
    <>
      {/* Enhanced Special Notes */}
      <div>
        <label className="block text-sm font-medium text-suzu-neutral-700 mb-1">
          特記事項
        </label>
        <textarea
          {...register("specialNotes")}
          rows={3}
          className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent resize-none text-suzu-neutral-900 text-base touch-manipulation"
          placeholder="注意事項や補足情報（例: 傷の場所、付属品の有無、特別な処分方法など）"
        />
        {errors.specialNotes && (
          <p className="mt-1 text-sm text-suzu-error">
            {errors.specialNotes.message}
          </p>
        )}
        <div className="mt-1 text-xs text-suzu-neutral-500">
          注意: 個人情報や住所などの機密情報は入力しないでください
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-suzu-neutral-700 mb-1">
          検索用キーワード
        </label>
        <input
          type="text"
          onChange={(e) => handleArrayInput("keywords", e.target.value)}
          defaultValue={item?.keywords?.join(", ") || ""}
          className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent text-suzu-neutral-900 text-base touch-manipulation"
          placeholder="内部検索用キーワード (カンマ区切り)"
        />
      </div>
    </>
  );
};

export default NotesKeywordsSection;
