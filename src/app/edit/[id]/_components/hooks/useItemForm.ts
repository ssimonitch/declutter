import { useCallback } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  itemFormSchema,
  itemToFormData,
  formDataToItem,
  getDefaultFormValues,
  ItemFormInput,
} from "@/lib/schemas/item.schema";
import { addItem, updateItem } from "@/lib/db";
import type { SuzuMemoItem } from "@/lib/types";

interface UseItemFormProps {
  item?: SuzuMemoItem;
  currentRealmId?: string;
  onSuccess: (id: string) => void;
  onError: (error: string) => void;
}

interface UseItemFormReturn {
  form: UseFormReturn<ItemFormInput>;
  onSubmit: (data: ItemFormInput) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Custom hook to manage item form state and submission
 * Encapsulates all form logic in a reusable hook
 */
export const useItemForm = ({
  item,
  currentRealmId,
  onSuccess,
  onError,
}: UseItemFormProps): UseItemFormReturn => {
  // Initialize form with proper typing
  const form = useForm<ItemFormInput>({
    resolver: zodResolver(itemFormSchema),
    mode: "onBlur", // Better performance than onChange
    defaultValues: item ? itemToFormData(item) : getDefaultFormValues(),
  });

  const { formState } = form;
  const isSubmitting = formState.isSubmitting;

  // Handle form submission
  const onSubmit = useCallback(
    async (data: ItemFormInput) => {
      try {
        // Ensure we have photo and thumbnail from the item if not in form data
        const finalData = {
          ...data,
          photo: data.photo || item?.photo,
          thumbnail: data.thumbnail || item?.thumbnail,
        };

        // Validate required photo/thumbnail
        if (!finalData.photo || !finalData.thumbnail) {
          throw new Error(
            "写真データが見つかりません。もう一度写真を撮影してください。",
          );
        }

        let itemId: string;

        if (item && item.id !== "new") {
          // Update existing item
          await updateItem(item.id, formDataToItem(finalData));
          itemId = item.id;
        } else {
          // Create new item
          itemId = await addItem(formDataToItem(finalData), currentRealmId);
        }

        onSuccess(itemId);
      } catch (error) {
        console.error("Failed to save item:", error);
        onError(error instanceof Error ? error.message : "Failed to save item");
      }
    },
    [item, currentRealmId, onSuccess, onError],
  );

  return {
    form,
    onSubmit,
    isSubmitting,
  };
};
