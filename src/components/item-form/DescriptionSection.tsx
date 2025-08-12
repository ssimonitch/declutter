import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import type { ItemFormData } from "./types";

interface DescriptionSectionProps {
  register: UseFormRegister<ItemFormData>;
  errors: FieldErrors<ItemFormData>;
}

const DescriptionSection: React.FC<DescriptionSectionProps> = ({
  register,
  errors,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        商品説明 <span className="text-red-500">*</span>
      </label>
      <textarea
        {...register("description")}
        rows={4}
        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 text-base touch-manipulation"
        placeholder="商品の詳細な説明を入力"
      />
      {errors.description && (
        <p className="mt-1 text-sm text-red-600">
          {errors.description.message}
        </p>
      )}
    </div>
  );
};

export default DescriptionSection;
