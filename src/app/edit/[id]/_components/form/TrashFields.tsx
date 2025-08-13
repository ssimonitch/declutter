import React from "react";
import { UseFormReturn } from "react-hook-form";
import type { ItemFormInput } from "@/lib/schemas/item.schema";

interface TrashFieldsProps {
  form: UseFormReturn<ItemFormInput>;
}

const TrashFields: React.FC<TrashFieldsProps> = ({ form }) => {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-red-900 mb-3 flex items-center">
        🗑️ 処分費用情報
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-suzu-neutral-700 mb-1">
            処分費用 (JPY)
          </label>
          <input
            {...register("disposalCostJPY", {
              valueAsNumber: true,
              setValueAs: (v) => (v === "" || isNaN(v) ? null : Number(v)),
            })}
            type="number"
            min="0"
            step="100"
            className="w-full px-3 py-3 border border-suzu-neutral-300 rounded-lg focus:ring-2 focus:ring-suzu-error focus:border-transparent text-suzu-neutral-900 font-medium text-base touch-manipulation"
            placeholder="粗大ごみ処分費用（分からない場合は空欄）"
          />
          {errors.disposalCostJPY && (
            <p className="mt-1 text-sm text-suzu-error">
              {errors.disposalCostJPY.message}
            </p>
          )}
        </div>

        <div className="text-xs text-suzu-error bg-white rounded p-2 border border-red-200">
          💡 ヒント: 自治体のウェブサイトで「粗大ごみ
          手数料」を検索すると料金が確認できます
        </div>
      </div>
    </div>
  );
};

export default TrashFields;
