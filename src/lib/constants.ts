/**
 * Centralized constants for the SuzuMemo application
 * Contains shared configuration for actions, categories, and conditions
 * to ensure consistency across components and single source of truth
 */

// ============================================
// LITERAL TYPES
// ============================================

export const ACTION = ["keep", "online", "thrift", "donate", "trash"] as const;
export type ActionType = (typeof ACTION)[number];

export const CONDITION = ["new", "like_new", "good", "fair", "poor"] as const;
export type ConditionType = (typeof CONDITION)[number];

export const CATEGORIES = [
  "家電",
  "家具",
  "衣類",
  "本・メディア",
  "雑貨",
  "その他",
] as const;
export type CategoryType = (typeof CATEGORIES)[number];

// ============================================
// ACTION CONFIGURATION
// ============================================

type ActionConfigItem = {
  value: ActionType;
  label: string;
  icon: string;
  description: string;
  color: string;
  lightColor: string;
  textColor: string;
  borderColor: string;
  actionLabel: string;
  actionDescription: string;
  actionColor: string;
};

type ActionConfigMap = {
  [K in ActionType]: Omit<ActionConfigItem, "value"> & { value: K };
};

/**
 * Complete action configuration with all styling variants
 * Used across dashboard-summary, items-table, and item-form components
 */
export const ACTION_CONFIG: ActionConfigMap = {
  keep: {
    value: "keep",
    label: "保管",
    icon: "🏠",
    description: "手元に残す品物",
    color: "bg-suzu-primary-500",
    lightColor: "bg-suzu-primary-100",
    textColor: "text-suzu-primary-800",
    borderColor: "border-suzu-primary-200",
    actionLabel: "保管する",
    actionDescription: "今後も使うので残す",
    actionColor:
      "bg-suzu-primary-100 text-suzu-primary-800 border-suzu-primary-200",
  },
  online: {
    value: "online",
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
    value: "thrift",
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
    value: "donate",
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
    value: "trash",
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
} as const satisfies ActionConfigMap;

// ============================================
// CONDITION CONFIGURATION
// ============================================

type ConditionOption = {
  value: ConditionType;
  label: string;
  description: string;
};

/**
 * Product condition options with elderly-friendly descriptions
 * Used in item-form for condition selection
 */
export const CONDITION_OPTIONS: readonly ConditionOption[] = [
  {
    value: "new",
    label: "新品",
    description: "購入後未使用、タグ付き",
  },
  {
    value: "like_new",
    label: "ほぼ新品",
    description: "数回しか使っていない",
  },
  {
    value: "good",
    label: "良い",
    description: "普通に使える、小さな傷程度",
  },
  {
    value: "fair",
    label: "普通",
    description: "使用感あり、傷や汚れあり",
  },
  {
    value: "poor",
    label: "難あり",
    description: "壊れている、修理が必要",
  },
] as const satisfies readonly ConditionOption[];

// ============================================
// DERIVED CONSTANTS & UTILITIES
// ============================================

/**
 * Action options formatted for form select components
 * Combines ACTION_CONFIG with form-specific properties
 */
export const ACTION_OPTIONS = ACTION.map((action) => {
  const config = ACTION_CONFIG[action];
  return {
    value: config.value,
    label: config.actionLabel,
    description: config.actionDescription,
    icon: config.icon,
    color: config.actionColor,
  };
});
