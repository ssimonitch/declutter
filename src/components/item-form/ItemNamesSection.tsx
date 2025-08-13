import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import type { ItemFormData } from "./types";

interface ItemNamesSectionProps {
  register: UseFormRegister<ItemFormData>;
  errors: FieldErrors<ItemFormData>;
}

const ItemNamesSection: React.FC<ItemNamesSectionProps> = ({
  register,
  errors,
}) => {
  return (
    <div className="bg-suzu-primary-50 border border-suzu-primary-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-suzu-primary-900 mb-3">
        商品名情報
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Specific Names */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-suzu-primary-800 uppercase tracking-wider">
            詳細名（ブランド・型番含む）
          </h4>
          <div>
            <label className="block text-sm font-medium text-suzu-neutral-800 mb-1">
              日本語（詳細）
            </label>
            <input
              {...register("nameJapaneseSpecific")}
              type="text"
              className="w-full px-3 py-2 border border-suzu-brown-300 rounded-lg focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent text-suzu-neutral-900 font-medium"
              placeholder="例: ソニー ワイヤレスヘッドホン WH-1000XM4"
            />
            {errors.nameJapaneseSpecific && (
              <p className="mt-1 text-sm text-suzu-error">
                {errors.nameJapaneseSpecific.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-suzu-neutral-800 mb-1">
              英語（詳細）
            </label>
            <input
              {...register("nameEnglishSpecific")}
              type="text"
              className="w-full px-3 py-2 border border-suzu-brown-300 rounded-lg focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent text-suzu-neutral-900 font-medium"
              placeholder="例: Sony Wireless Headphones WH-1000XM4"
            />
            {errors.nameEnglishSpecific && (
              <p className="mt-1 text-sm text-suzu-error">
                {errors.nameEnglishSpecific.message}
              </p>
            )}
          </div>
        </div>

        {/* Generic Names */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-suzu-primary-800 uppercase tracking-wider">
            一般名（カテゴリー）
          </h4>
          <div>
            <label className="block text-sm font-medium text-suzu-neutral-800 mb-1">
              日本語（一般）
            </label>
            <input
              {...register("nameJapaneseGeneric")}
              type="text"
              className="w-full px-3 py-2 border border-suzu-brown-300 rounded-lg focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent text-suzu-neutral-900 font-medium"
              placeholder="例: ワイヤレスヘッドホン"
            />
            {errors.nameJapaneseGeneric && (
              <p className="mt-1 text-sm text-suzu-error">
                {errors.nameJapaneseGeneric.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-suzu-neutral-800 mb-1">
              英語（一般）
            </label>
            <input
              {...register("nameEnglishGeneric")}
              type="text"
              className="w-full px-3 py-2 border border-suzu-brown-300 rounded-lg focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent text-suzu-neutral-900 font-medium"
              placeholder="例: Wireless Headphones"
            />
            {errors.nameEnglishGeneric && (
              <p className="mt-1 text-sm text-suzu-error">
                {errors.nameEnglishGeneric.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemNamesSection;
