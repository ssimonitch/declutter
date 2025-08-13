import React from "react";
import { UseFormReturn } from "react-hook-form";
import type { ItemFormInput } from "@/lib/schemas/item.schema";

interface DescriptionSectionProps {
  form: UseFormReturn<ItemFormInput>;
}

const DescriptionSection: React.FC<DescriptionSectionProps> = ({ form }) => {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div>
      <label className="block text-sm font-medium text-suzu-neutral-800 mb-1">
        商品説明 <span className="text-suzu-error">*</span>
      </label>
      <textarea
        {...register("description")}
        rows={4}
        className="w-full px-3 py-3 border border-suzu-brown-300 rounded-lg focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent resize-none text-suzu-neutral-900 text-base touch-manipulation"
        placeholder="商品の詳細な説明を入力"
      />
      {errors.description && (
        <p className="mt-1 text-sm text-suzu-error">
          {errors.description.message}
        </p>
      )}
    </div>
  );
};

export default DescriptionSection;
