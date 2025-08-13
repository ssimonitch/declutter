import React from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { ACTION_OPTIONS } from "@/lib/constants";
import type { ItemFormInput } from "@/lib/schemas/item.schema";

interface ActionSelectorProps {
  form: UseFormReturn<ItemFormInput>;
}

const ActionSelector: React.FC<ActionSelectorProps> = ({ form }) => {
  const {
    control,
    formState: { errors },
  } = form;
  return (
    <div>
      <label className="block text-sm font-medium text-suzu-neutral-700 mb-2">
        推奨アクション <span className="text-suzu-error">*</span>
      </label>
      <Controller
        name="recommendedAction"
        control={control}
        render={({ field }) => (
          <div className="grid grid-cols-1 gap-3">
            {ACTION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors min-h-[60px] ${
                  field.value === option.value
                    ? `border-blue-500 ${option.color}`
                    : "border-suzu-neutral-200 hover:border-suzu-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  {...field}
                  value={option.value}
                  className="sr-only"
                />
                <div className="text-2xl mr-3">{option.icon}</div>
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
      {errors.recommendedAction && (
        <p className="mt-1 text-sm text-suzu-error">
          {errors.recommendedAction.message}
        </p>
      )}
    </div>
  );
};

export default ActionSelector;
