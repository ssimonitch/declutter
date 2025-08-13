import React from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { CONDITION_OPTIONS } from "@/lib/constants";
import type { ItemFormData } from "./types";

interface ConditionSelectorProps {
  control: Control<ItemFormData>;
  errors: FieldErrors<ItemFormData>;
}

const ConditionSelector: React.FC<ConditionSelectorProps> = ({
  control,
  errors,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-suzu-neutral-700 mb-2">
        商品状態 <span className="text-suzu-error">*</span>
      </label>
      <Controller
        name="condition"
        control={control}
        render={({ field }) => (
          <div className="grid grid-cols-1 gap-3">
            {CONDITION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors min-h-[60px] ${
                  field.value === option.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-suzu-neutral-200 hover:border-suzu-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  {...field}
                  value={option.value}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="font-medium text-suzu-neutral-900">
                    {option.label}
                  </div>
                  <div className="text-sm text-suzu-neutral-500">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      />
      {errors.condition && (
        <p className="mt-1 text-sm text-suzu-error">
          {errors.condition.message}
        </p>
      )}
    </div>
  );
};

export default ConditionSelector;
