/**
 * Single source of truth for item form data structure and validation
 * This schema generates both TypeScript types and Zod validation
 */

import { z } from "zod";
import { ACTION, CONDITION } from "@/lib/constants";
import type { SuzuMemoItem } from "@/lib/types";

// Reusable price schema for both online and thrift shop pricing
const priceSchema = z
  .object({
    low: z.number().min(0, "最低価格は0以上である必要があります"),
    high: z.number().min(0, "最高価格は0以上である必要があります"),
    confidence: z
      .number()
      .min(0)
      .max(1, "信頼度は0から1の間である必要があります"),
  })
  .refine((data) => data.high >= data.low, {
    message: "最高価格は最低価格以上である必要があります",
    path: ["high"],
  });

// Main item form schema - validates all form inputs
export const itemFormSchema = z.object({
  // Blob fields (handled separately from other data)
  photo: z.instanceof(Blob).optional(),
  thumbnail: z.instanceof(Blob).optional(),

  // Name fields - all have defaults as empty strings
  nameJapaneseSpecific: z
    .string()
    .max(100, "日本語名（詳細）は100文字以内で入力してください")
    .default(""),
  nameEnglishSpecific: z
    .string()
    .max(100, "英語名（詳細）は100文字以内で入力してください")
    .default(""),
  nameJapaneseGeneric: z
    .string()
    .max(100, "日本語名（一般）は100文字以内で入力してください")
    .default(""),
  nameEnglishGeneric: z
    .string()
    .max(100, "英語名（一般）は100文字以内で入力してください")
    .default(""),

  // Required basic information
  description: z
    .string()
    .min(1, "説明は必須です")
    .max(1000, "説明は1000文字以内で入力してください"),
  category: z.string().min(1, "カテゴリーは必須です"),
  condition: z.enum(CONDITION).describe("商品状態を選択してください"),
  quantity: z
    .number()
    .int("数量は整数である必要があります")
    .min(1, "数量は1以上である必要があります")
    .max(999, "数量は999以下である必要があります")
    .default(1),

  // Price information - both are required objects
  onlineAuctionPriceJPY: priceSchema,
  thriftShopPriceJPY: priceSchema,

  // Action and rationale
  recommendedAction: z
    .enum(ACTION)
    .describe("推奨アクションを選択してください"),
  actionRationale: z
    .string()
    .min(1, "推奨理由は必須です")
    .max(500, "理由は500文字以内で入力してください"),

  // Array fields with defaults
  marketplaces: z.array(z.string()).default([]),
  searchQueries: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),

  // Optional/nullable fields
  specialNotes: z
    .string()
    .max(500, "特記事項は500文字以内で入力してください")
    .nullable()
    .default(null),
  disposalCostJPY: z
    .number()
    .min(0, "処分費用は0以上である必要があります")
    .nullable()
    .optional(),
  municipalityCode: z.string().optional().default(""),
});

// Derived type from schema - this is the form data type
export type ItemFormData = z.infer<typeof itemFormSchema>;

export type ItemFormInput = z.input<typeof itemFormSchema>;

// Default values for new items
export const getDefaultFormValues = (): ItemFormData => ({
  nameJapaneseSpecific: "",
  nameEnglishSpecific: "",
  nameJapaneseGeneric: "",
  nameEnglishGeneric: "",
  description: "",
  category: "",
  condition: "good",
  quantity: 1,
  onlineAuctionPriceJPY: {
    low: 0,
    high: 0,
    confidence: 0.5,
  },
  thriftShopPriceJPY: {
    low: 0,
    high: 0,
    confidence: 0.5,
  },
  recommendedAction: "keep",
  actionRationale: "",
  marketplaces: [],
  searchQueries: [],
  keywords: [],
  specialNotes: null,
  disposalCostJPY: null,
  municipalityCode: "",
});

// Transform SuzuMemoItem to form data for editing
export const itemToFormData = (item: SuzuMemoItem): ItemFormData => ({
  photo: item.photo,
  thumbnail: item.thumbnail,
  nameJapaneseSpecific: item.nameJapaneseSpecific || "",
  nameEnglishSpecific: item.nameEnglishSpecific || "",
  nameJapaneseGeneric: item.nameJapaneseGeneric || "",
  nameEnglishGeneric: item.nameEnglishGeneric || "",
  description: item.description,
  category: item.category,
  condition: item.condition,
  quantity: item.quantity || 1,
  onlineAuctionPriceJPY: item.onlineAuctionPriceJPY,
  thriftShopPriceJPY: item.thriftShopPriceJPY,
  recommendedAction: item.recommendedAction,
  actionRationale: item.actionRationale || "",
  marketplaces: item.marketplaces || [],
  searchQueries: item.searchQueries || [],
  keywords: item.keywords || [],
  specialNotes: item.specialNotes,
  disposalCostJPY: item.disposalCostJPY ?? null,
  municipalityCode: item.municipalityCode || "",
});

// Transform form data to SuzuMemoItem for saving (without id/timestamps)
export const formDataToItem = (
  data: ItemFormInput,
): Omit<SuzuMemoItem, "id" | "createdAt" | "updatedAt"> => ({
  ...data,
  quantity: data.quantity || 1,
  // Ensure required Blob fields
  photo: data.photo!,
  thumbnail: data.thumbnail!,
  // Convert empty strings to proper format
  nameJapaneseSpecific: data.nameJapaneseSpecific || "",
  nameEnglishSpecific: data.nameEnglishSpecific || "",
  nameJapaneseGeneric: data.nameJapaneseGeneric || "",
  nameEnglishGeneric: data.nameEnglishGeneric || "",
  // Ensure arrays are not undefined
  marketplaces: data.marketplaces || [],
  searchQueries: data.searchQueries || [],
  keywords: data.keywords || [],
  // Handle nullable fields
  disposalCostJPY: data.disposalCostJPY ?? undefined,
  specialNotes: data.specialNotes ?? null,
});

// Validation helper for partial updates
export const validatePartialUpdate = (data: Partial<ItemFormData>) => {
  return itemFormSchema.partial().safeParse(data);
};
