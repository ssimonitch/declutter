// Shared types for item form subcomponents
export interface PriceData {
  low: number;
  high: number;
  confidence: number;
}

export interface ItemFormData {
  photo?: Blob;
  thumbnail?: Blob;

  // Name fields
  nameJapaneseSpecific?: string;
  nameEnglishSpecific?: string;
  nameJapaneseGeneric?: string;
  nameEnglishGeneric?: string;

  description: string;
  category: string;
  condition: "new" | "like_new" | "good" | "fair" | "poor";
  quantity: number;

  // Price fields
  onlineAuctionPriceJPY?: PriceData;
  thriftShopPriceJPY?: PriceData;

  recommendedAction: "keep" | "trash" | "thrift" | "online" | "donate";
  actionRationale: string;
  marketplaces: string[];
  searchQueries: string[];
  specialNotes: string | null;
  keywords: string[];

  // Disposal cost field
  disposalCostJPY?: number | null;
  municipalityCode?: string;
}
