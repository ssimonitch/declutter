/**
 * Centralized constants for the SuzuMemo application
 * Contains shared configuration for actions, categories, and conditions
 * to ensure consistency across components and single source of truth
 */

import type { SuzuMemoItem } from "./types";

// ============================================
// ACTION CONFIGURATION
// ============================================

/**
 * Complete action configuration with all styling variants
 * Used across dashboard-summary, items-table, and item-form components
 */
export const ACTION_CONFIG = {
  keep: {
    // Basic info
    value: "keep" as const,
    label: "保管",
    icon: "🏠",
    description: "手元に残す品物",

    // Color variations for different contexts
    color: "bg-suzu-primary-500", // Solid background
    lightColor: "bg-suzu-primary-100", // Light background
    textColor: "text-suzu-primary-800", // Dark text on light background
    borderColor: "border-suzu-primary-200", // Border color

    // Action-specific variants
    actionLabel: "保管する",
    actionDescription: "今後も使うので残す",
    actionColor:
      "bg-suzu-primary-100 text-suzu-primary-800 border-suzu-primary-200",
  },
  online: {
    value: "online" as const,
    label: "オンライン販売",
    icon: "💰",
    description: "メルカリ・ヤフオク等で販売",

    color: "bg-suzu-success",
    lightColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-200",

    actionLabel: "フリマで売る",
    actionDescription: "メルカリやヤフオクで販売",
    actionColor: "bg-green-100 text-green-800 border-green-200",
  },
  thrift: {
    value: "thrift" as const,
    label: "リサイクル",
    icon: "🏪",
    description: "実店舗で販売",

    color: "bg-suzu-warning",
    lightColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-200",

    actionLabel: "リサイクル店へ",
    actionDescription: "近くのお店に持ち込み",
    actionColor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  donate: {
    value: "donate" as const,
    label: "寄付",
    icon: "❤️",
    description: "NPO・福祉施設等に寄付",

    color: "bg-suzu-blush-dark",
    lightColor: "bg-purple-100",
    textColor: "text-purple-800",
    borderColor: "border-purple-200",

    actionLabel: "寄付する",
    actionDescription: "困っている人に役立てる",
    actionColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  trash: {
    value: "trash" as const,
    label: "廃棄",
    icon: "🗑️",
    description: "ゴミとして処分",

    color: "bg-suzu-error",
    lightColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-200",

    actionLabel: "処分する",
    actionDescription: "ごみとして捨てる",
    actionColor: "bg-red-100 text-red-800 border-red-200",
  },
} as const;

// Type-safe action keys
export type ActionType = keyof typeof ACTION_CONFIG;

// Validate action type at runtime
export function isValidActionType(action: string): action is ActionType {
  return action in ACTION_CONFIG;
}

// Get action config with type safety
export function getActionConfig(action: ActionType) {
  return ACTION_CONFIG[action];
}

// ============================================
// CATEGORY OPTIONS
// ============================================

/**
 * Standard product categories matching Gemini AI output format
 * Used in item-form and filter components
 */
export const CATEGORIES = [
  "家電",
  "家具",
  "衣類",
  "本・メディア",
  "雑貨",
  "その他",
] as const;

// Type-safe category
export type CategoryType = (typeof CATEGORIES)[number];

// Validate category type at runtime
export function isValidCategory(category: string): category is CategoryType {
  return CATEGORIES.includes(category as CategoryType);
}

// ============================================
// CONDITION OPTIONS
// ============================================

/**
 * Product condition options with elderly-friendly descriptions
 * Used in item-form for condition selection
 */
export const CONDITION_OPTIONS = [
  {
    value: "new" as const,
    label: "新品",
    description: "購入後未使用、タグ付き",
  },
  {
    value: "like_new" as const,
    label: "ほぼ新品",
    description: "数回しか使っていない",
  },
  {
    value: "good" as const,
    label: "良い",
    description: "普通に使える、小さな傷程度",
  },
  {
    value: "fair" as const,
    label: "普通",
    description: "使用感あり、傷や汚れあり",
  },
  {
    value: "poor" as const,
    label: "難あり",
    description: "壊れている、修理が必要",
  },
] as const;

// Type-safe condition values
export type ConditionType = (typeof CONDITION_OPTIONS)[number]["value"];

// Extract condition values for validation
export const CONDITION_VALUES = CONDITION_OPTIONS.map((option) => option.value);

// Validate condition type at runtime
export function isValidCondition(
  condition: string,
): condition is ConditionType {
  return CONDITION_VALUES.includes(condition as ConditionType);
}

// Get condition option by value
export function getConditionOption(condition: ConditionType) {
  return CONDITION_OPTIONS.find((option) => option.value === condition);
}

// ============================================
// DERIVED CONSTANTS & UTILITIES
// ============================================

/**
 * Action options formatted for form select components
 * Combines ACTION_CONFIG with form-specific properties
 */
export const ACTION_OPTIONS = Object.values(ACTION_CONFIG).map((config) => ({
  value: config.value,
  label: config.actionLabel,
  description: config.actionDescription,
  icon: config.icon,
  color: config.actionColor,
}));

/**
 * Get all action types as array
 */
export const ACTION_TYPES = Object.keys(ACTION_CONFIG) as ActionType[];

/**
 * Get readable action label for display
 */
export function getActionLabel(
  action: ActionType,
  context: "table" | "form" | "summary" = "table",
): string {
  const config = ACTION_CONFIG[action];
  switch (context) {
    case "form":
      return config.actionLabel;
    case "table":
    case "summary":
    default:
      return config.label;
  }
}

/**
 * Get action icon with label for display
 */
export function getActionDisplay(
  action: ActionType,
  context: "table" | "form" | "summary" = "table",
): string {
  const config = ACTION_CONFIG[action];
  const label = getActionLabel(action, context);
  return `${config.icon} ${label}`;
}

/**
 * Calculate action statistics from items array
 */
export function calculateActionStats(items: SuzuMemoItem[]) {
  const stats = Object.fromEntries(
    ACTION_TYPES.map((action) => [action, 0]),
  ) as Record<ActionType, number>;

  items.forEach((item) => {
    if (isValidActionType(item.recommendedAction)) {
      stats[item.recommendedAction]++;
    }
  });

  return stats;
}

/**
 * Calculate category statistics from items array
 */
export function calculateCategoryStats(items: SuzuMemoItem[]) {
  const stats = new Map<string, number>();

  items.forEach((item) => {
    const count = stats.get(item.category) || 0;
    stats.set(item.category, count + 1);
  });

  return stats;
}

// ============================================
// VALIDATION SCHEMAS (for Zod integration)
// ============================================

/**
 * Action enum for Zod schema validation
 */
export const ACTION_ENUM = [
  "keep",
  "online",
  "thrift",
  "donate",
  "trash",
] as const;

/**
 * Condition enum for Zod schema validation
 */
export const CONDITION_ENUM = [
  "new",
  "like_new",
  "good",
  "fair",
  "poor",
] as const;

/**
 * Category enum for Zod schema validation
 */
export const CATEGORY_ENUM = [
  "家電",
  "家具",
  "衣類",
  "本・メディア",
  "雑貨",
  "その他",
] as const;
