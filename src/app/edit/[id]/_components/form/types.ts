// Re-export types from the schema for backward compatibility
// All types are now derived from the single source of truth schema
export type { ItemFormData } from "@/lib/schemas/item.schema";

// Helper type for price data structure
export interface PriceData {
  low: number;
  high: number;
  confidence: number;
}
