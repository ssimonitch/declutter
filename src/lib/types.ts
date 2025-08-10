// Core data types for Declutter App MVP

export interface DeclutterItem {
  id: string; // UUID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  photo: Blob; // Compressed image
  thumbnail: Blob; // Small preview for lists
  name: string;
  nameJapanese?: string;
  description: string;
  category: string;
  condition: "new" | "like_new" | "good" | "fair" | "poor";
  estimatedPriceJPY: {
    low: number;
    high: number;
    confidence: number; // 0-1 scale
  };
  recommendedAction: "keep" | "trash" | "thrift" | "online" | "donate";
  actionRationale?: string; // Why this action was recommended
  marketplaces: string[]; // ["Mercari", "Yahoo Auctions", etc.]
  searchQueries: string[]; // Suggested search terms for marketplaces
  specialNotes: string;
  keywords: string[]; // For internal search
  disposalFeeJPY?: number; // For oversized items (粗大ごみ)
  municipalityCode?: string; // For location-specific disposal info
}

// Database interface that extends DeclutterItem for Dexie
export type DeclutterItemDB = DeclutterItem;

// Dashboard summary calculations interface
export interface DashboardSummary {
  totalItems: number;
  itemsByAction: {
    keep: number;
    online: number;
    thrift: number;
    donate: number;
    trash: number;
  };
  itemsByCategory: Record<string, number>;
  estimatedResaleValue: {
    low: number;
    high: number;
    averageConfidence: number;
  };
  estimatedDisposalCost: number;
}

// API response types
export interface AnalyzeApiResponse {
  success: boolean;
  data?: Omit<
    DeclutterItem,
    "id" | "createdAt" | "updatedAt" | "photo" | "thumbnail"
  >;
  error?: string;
}

// Utility types for form handling
export type DeclutterItemFormData = Omit<
  DeclutterItem,
  "id" | "createdAt" | "updatedAt"
>;

// Blob utility functions
export function getBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

// Municipality data structure for disposal information
export interface Municipality {
  name: string;
  sodaiGomiUrl?: string; // Link to oversized waste disposal info
  kadenRecycleUrl?: string; // Link to appliance recycling info
}

// Storage quota information
export interface StorageQuota {
  available: number;
  used: number;
  percentage: number;
}

// Image compression quality options
export type ImageQuality = "standard" | "lite";

// Export data types
export type ExportFormat = "csv";

export interface ExportOptions {
  format: ExportFormat;
  includeImages: boolean;
  selectedIds?: string[];
}
