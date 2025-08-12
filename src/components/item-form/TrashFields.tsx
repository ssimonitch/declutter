import React from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import type { ItemFormData } from "./types";

interface TrashFieldsProps {
  control: Control<ItemFormData>;
  errors: FieldErrors<ItemFormData>;
}

const TrashFields: React.FC<TrashFieldsProps> = ({ control, errors }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-red-900 mb-3 flex items-center">
        🗑️ 処分費用情報
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            処分費用 (JPY)
          </label>
          <Controller
            name="disposalCostJPY"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="number"
                min="0"
                step="100"
                value={field.value || ""}
                onChange={(e) => {
                  const value = e.target.value
                    ? parseInt(e.target.value)
                    : null;
                  field.onChange(value);
                }}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 font-medium text-base touch-manipulation"
                placeholder="粗大ごみ処分費用（分からない場合は空欄）"
              />
            )}
          />
          {errors.disposalCostJPY && (
            <p className="mt-1 text-sm text-red-600">
              {errors.disposalCostJPY.message}
            </p>
          )}
        </div>

        <div className="text-xs text-red-700 bg-white rounded p-2 border border-red-200">
          💡 ヒント: 自治体のウェブサイトで「粗大ごみ
          手数料」を検索すると料金が確認できます
        </div>
      </div>
    </div>
  );
};

export default TrashFields;
