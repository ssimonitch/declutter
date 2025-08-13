import React from "react";
import type { SuzuMemoItem } from "@/lib/types";
import type { ItemFormData } from "./types";

interface OnlineFieldsProps {
  item?: SuzuMemoItem;
  handleArrayInput: (fieldName: keyof ItemFormData, value: string) => void;
}

const OnlineFields: React.FC<OnlineFieldsProps> = ({
  item,
  handleArrayInput,
}) => {
  return (
    <>
      {/* Marketplaces */}
      <div>
        <label className="block text-sm font-medium text-suzu-neutral-700 mb-1">
          推奨販売先
        </label>
        <input
          type="text"
          onChange={(e) => handleArrayInput("marketplaces", e.target.value)}
          defaultValue={item?.marketplaces?.join(", ") || ""}
          className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-suzu-neutral-900 text-base touch-manipulation"
          placeholder="メルカリ, ヤフオク (カンマ区切り)"
        />
      </div>

      {/* Search Queries */}
      <div>
        <label className="block text-sm font-medium text-suzu-neutral-700 mb-1">
          検索キーワード
        </label>
        <input
          type="text"
          onChange={(e) => handleArrayInput("searchQueries", e.target.value)}
          defaultValue={item?.searchQueries?.join(", ") || ""}
          className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-suzu-neutral-900 text-base touch-manipulation"
          placeholder="検索で使えるキーワード (カンマ区切り)"
        />
      </div>
    </>
  );
};

export default OnlineFields;
