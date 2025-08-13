import React from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { CATEGORIES } from "@/lib/constants";
import type { ItemFormData } from "./types";

interface QuantityCategoryRowProps {
  control: Control<ItemFormData>;
  errors: FieldErrors<ItemFormData>;
}

const QuantityCategoryRow: React.FC<QuantityCategoryRowProps> = ({
  control,
  errors,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-suzu-neutral-700 mb-1">
          数量 <span className="text-suzu-error">*</span>
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
              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
              placeholder="1"
            />
          )}
        />
        {errors.quantity && (
          <p className="mt-1 text-sm text-suzu-error">
            {errors.quantity.message}
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-suzu-neutral-700 mb-1">
          カテゴリー <span className="text-suzu-error">*</span>
        </label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
            >
              <option value="">カテゴリーを選択</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          )}
        />
        {errors.category && (
          <p className="mt-1 text-sm text-suzu-error">
            {errors.category.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default QuantityCategoryRow;
