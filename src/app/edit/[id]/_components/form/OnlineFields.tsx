import React from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import type { ItemFormInput } from "@/lib/schemas/item.schema";

interface OnlineFieldsProps {
  form: UseFormReturn<ItemFormInput>;
}

const OnlineFields: React.FC<OnlineFieldsProps> = ({ form }) => {
  const { setValue } = form;

  // Watch array fields for controlled inputs
  const marketplaces = useWatch({
    control: form.control,
    name: "marketplaces",
  });

  const searchQueries = useWatch({
    control: form.control,
    name: "searchQueries",
  });

  // Handle array input changes
  const handleArrayChange = (
    fieldName: "marketplaces" | "searchQueries",
    value: string,
  ) => {
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
    <>
      {/* Marketplaces - Controlled Input */}
      <div>
        <label className="block text-sm font-medium text-suzu-neutral-700 mb-1">
          推奨販売先
        </label>
        <input
          type="text"
          value={marketplaces?.join(", ") || ""}
          onChange={(e) => handleArrayChange("marketplaces", e.target.value)}
          className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-suzu-neutral-900 text-base touch-manipulation"
          placeholder="メルカリ, ヤフオク (カンマ区切り)"
        />
        <p className="mt-1 text-xs text-suzu-neutral-500">
          カンマで区切って複数入力できます
        </p>
      </div>

      {/* Search Queries - Controlled Input */}
      <div>
        <label className="block text-sm font-medium text-suzu-neutral-700 mb-1">
          検索キーワード
        </label>
        <input
          type="text"
          value={searchQueries?.join(", ") || ""}
          onChange={(e) => handleArrayChange("searchQueries", e.target.value)}
          className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-suzu-neutral-900 text-base touch-manipulation"
          placeholder="検索で使えるキーワード (カンマ区切り)"
        />
        <p className="mt-1 text-xs text-suzu-neutral-500">
          商品を検索する際に使えるキーワードをカンマで区切って入力
        </p>
      </div>
    </>
  );
};

export default OnlineFields;
