import React from "react";
import { Button, Modal } from "@/components/ui";
import type { SuzuMemoItem } from "@/lib/types";

interface FormActionsProps {
  item?: SuzuMemoItem;
  isValid: boolean;
  isSubmitting: boolean;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const FormActions: React.FC<FormActionsProps> = ({
  item,
  isValid,
  isSubmitting,
  isDeleting,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onCancel,
  onDelete,
}) => {
  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-col gap-4 pt-6 border-t border-suzu-neutral-200">
        {/* Save Button - Make primary action most prominent */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          disabled={!isValid || isSubmitting || isDeleting}
          className="w-full"
        >
          {isSubmitting
            ? item
              ? "更新中..."
              : "保存中..."
            : item && item.id !== "new"
              ? "更新"
              : "保存"}
        </Button>

        {/* Secondary actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Cancel Button */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onCancel}
            disabled={isSubmitting || isDeleting}
            className="flex-1"
          >
            キャンセル
          </Button>

          {/* Delete Button - Only show for existing items */}
          {item && (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting || isDeleting}
              className="flex-1"
            >
              削除
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="削除の確認"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-suzu-neutral-500">
            この商品「{item?.nameEnglishSpecific}
            」を削除しますか？この操作は取り消せません。
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={onDelete}
              disabled={isDeleting}
              isLoading={isDeleting}
              className="flex-1"
            >
              {isDeleting ? "削除中..." : "削除"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default FormActions;
