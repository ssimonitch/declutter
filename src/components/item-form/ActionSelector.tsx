import React from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { ACTION_OPTIONS } from "@/lib/constants";
import type { ItemFormData } from "./types";

interface ActionSelectorProps {
  control: Control<ItemFormData>;
  errors: FieldErrors<ItemFormData>;
}

const ActionSelector: React.FC<ActionSelectorProps> = ({ control, errors }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        推奨アクション <span className="text-red-500">*</span>
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
                    : "border-gray-200 hover:border-gray-300"
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
                  <div className="font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      />
      {errors.recommendedAction && (
        <p className="mt-1 text-sm text-red-600">
          {errors.recommendedAction.message}
        </p>
      )}
    </div>
  );
};

export default ActionSelector;
