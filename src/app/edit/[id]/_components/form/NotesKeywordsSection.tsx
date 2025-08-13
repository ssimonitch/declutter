import React from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import type { ItemFormInput } from "@/lib/schemas/item.schema";

interface NotesKeywordsSectionProps {
  form: UseFormReturn<ItemFormInput>;
}

const NotesKeywordsSection: React.FC<NotesKeywordsSectionProps> = ({
  form,
}) => {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  // Watch keywords field for controlled input
  const keywords = useWatch({
    control: form.control,
    name: "keywords",
  });

  // Handle keywords array change
  const handleKeywordsChange = (value: string) => {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setValue("keywords", items, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

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

      {/* Keywords - Controlled Input */}
      <div>
        <label className="block text-sm font-medium text-suzu-neutral-700 mb-1">
          検索用キーワード
        </label>
        <input
          type="text"
          value={keywords?.join(", ") || ""}
          onChange={(e) => handleKeywordsChange(e.target.value)}
          className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent text-suzu-neutral-900 text-base touch-manipulation"
          placeholder="内部検索用キーワード (カンマ区切り)"
        />
        {errors.keywords && (
          <p className="mt-1 text-sm text-suzu-error">
            {errors.keywords.message}
          </p>
        )}
      </div>
    </>
  );
};

export default NotesKeywordsSection;
