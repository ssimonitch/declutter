// Database & Storage Layer for Declutter App MVP
// Dexie IndexedDB wrapper with CRUD operations and utility functions

import Dexie, { Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import { DeclutterItem, DeclutterItemDB, DashboardSummary } from "./types";

// Dexie Database Class
export class DeclutterDatabase extends Dexie {
  items!: Table<DeclutterItemDB>;

  constructor() {
    super("DeclutterDB");
    // Version 1 - Initial schema
    this.version(1).stores({
      // Define table with indexes for efficient querying
      items: "id, createdAt, updatedAt, recommendedAction, category, name",
    });

    // Version 2 - Add compound indexes for better performance
    this.version(2).stores({
      items:
        "id, createdAt, updatedAt, recommendedAction, category, name, [recommendedAction+updatedAt], [category+updatedAt]",
    });
  }
}

// Lazy database initialization for SSR safety
let dbInstance: DeclutterDatabase | null = null;

/**
 * Get database instance with lazy initialization.
 * Only initializes in browser environment to prevent SSR issues.
 */
export function getDb(): DeclutterDatabase {
  if (!dbInstance) {
    if (typeof window === "undefined") {
      throw new Error("DeclutterDatabase must be used in the browser");
    }
    dbInstance = new DeclutterDatabase();
  }
  return dbInstance;
}

// CRUD Operations

/**
 * Add new item with generated UUID and timestamps
 */
export async function addItem(
  item: Omit<DeclutterItem, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  try {
    const now = new Date().toISOString();
    const newItem: DeclutterItem = {
      ...item,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    await getDb().items.add(newItem);
    return newItem.id;
  } catch (error) {
    console.error("Error adding item:", error);
    throw new Error("Failed to add item to database");
  }
}

/**
 * Update existing item with new updatedAt timestamp
 */
export async function updateItem(
  id: string,
  updates: Partial<DeclutterItem>,
): Promise<void> {
  try {
    // Sanitize updates to prevent overwriting immutable fields
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      id: _ignoreId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt: _ignoreCreatedAt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updatedAt: _ignoreUpdatedAt,
      ...safeUpdates
    } = updates;

    const updateData = {
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    };

    const updated = await getDb().items.update(id, updateData);
    if (updated === 0) {
      throw new Error("Item not found");
    }
  } catch (error) {
    console.error("Error updating item:", error);
    throw new Error("Failed to update item");
  }
}

/**
 * Delete item by ID
 */
export async function deleteItem(id: string): Promise<void> {
  try {
    await getDb().items.delete(id);
  } catch (error) {
    console.error("Error deleting item:", error);
    throw new Error("Failed to delete item");
  }
}

/**
 * Get single item by ID
 */
export async function getItem(id: string): Promise<DeclutterItem | undefined> {
  try {
    return await getDb().items.get(id);
  } catch (error) {
    console.error("Error getting item:", error);
    throw new Error("Failed to retrieve item");
  }
}

/**
 * Get all items sorted by updatedAt (newest first)
 */
export async function listItems(): Promise<DeclutterItem[]> {
  try {
    return await getDb().items.orderBy("updatedAt").reverse().toArray();
  } catch (error) {
    console.error("Error listing items:", error);
    throw new Error("Failed to retrieve items");
  }
}

/**
 * Search items by name, description, keywords
 */
export async function searchItems(query: string): Promise<DeclutterItem[]> {
  try {
    if (!query.trim()) {
      return await listItems();
    }

    const lowerQuery = query.toLowerCase();

    const results = await getDb()
      .items.filter((item) => {
        const searchableText = [
          item.name,
          item.nameJapanese || "",
          item.description,
          item.specialNotes,
          ...item.keywords,
          ...item.searchQueries,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(lowerQuery);
      })
      .sortBy("updatedAt");

    return results.reverse();
  } catch (error) {
    console.error("Error searching items:", error);
    throw new Error("Failed to search items");
  }
}

/**
 * Filter items by recommendedAction
 */
export async function filterItemsByAction(
  action: string,
): Promise<DeclutterItem[]> {
  try {
    const results = await getDb()
      .items.where("recommendedAction")
      .equals(action)
      .sortBy("updatedAt");

    return results.reverse();
  } catch (error) {
    console.error("Error filtering items by action:", error);
    throw new Error("Failed to filter items by action");
  }
}

/**
 * Filter items by category
 */
export async function filterItemsByCategory(
  category: string,
): Promise<DeclutterItem[]> {
  try {
    const results = await getDb()
      .items.where("category")
      .equals(category)
      .sortBy("updatedAt");

    return results.reverse();
  } catch (error) {
    console.error("Error filtering items by category:", error);
    throw new Error("Failed to filter items by category");
  }
}

/**
 * Clear all items (for testing/reset)
 */
export async function clearAllItems(): Promise<void> {
  try {
    await getDb().items.clear();
  } catch (error) {
    console.error("Error clearing all items:", error);
    throw new Error("Failed to clear all items");
  }
}

// Utility Functions

/**
 * Get database statistics and storage usage estimate
 */
export async function getDatabaseStats(): Promise<{
  itemCount: number;
  storageEstimateBytes: number;
  storageEstimateMB: number;
  quotaBytes?: number;
  quotaMB?: number;
  usageBytes?: number;
  usageMB?: number;
}> {
  try {
    const itemCount = await getDb().items.count();

    // Get browser storage quota and usage if available
    let quotaBytes: number | undefined;
    let usageBytes: number | undefined;

    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        quotaBytes = estimate.quota;
        usageBytes = estimate.usage;
      } catch (storageError) {
        console.warn("Failed to get storage estimate:", storageError);
      }
    }

    // Estimate storage usage by calculating average blob sizes
    // This is an approximation since we can't directly measure IndexedDB size
    const sampleItems = await getDb().items.limit(10).toArray();
    let avgBlobSize = 0;

    if (sampleItems.length > 0) {
      const totalBlobSize = sampleItems.reduce((total, item) => {
        return total + item.photo.size + item.thumbnail.size;
      }, 0);
      avgBlobSize = totalBlobSize / sampleItems.length;
    }

    const storageEstimateBytes = itemCount * avgBlobSize;
    const storageEstimateMB = storageEstimateBytes / (1024 * 1024);

    return {
      itemCount,
      storageEstimateBytes,
      storageEstimateMB: Math.round(storageEstimateMB * 100) / 100,
      quotaBytes,
      quotaMB: quotaBytes
        ? Math.round((quotaBytes / (1024 * 1024)) * 100) / 100
        : undefined,
      usageBytes,
      usageMB: usageBytes
        ? Math.round((usageBytes / (1024 * 1024)) * 100) / 100
        : undefined,
    };
  } catch (error) {
    console.error("Error getting database stats:", error);
    return {
      itemCount: 0,
      storageEstimateBytes: 0,
      storageEstimateMB: 0,
    };
  }
}

/**
 * Prepare items for CSV export (exclude Blob fields and format for CSV)
 */
export async function exportItemsForCSV(): Promise<
  Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    nameJapanese?: string;
    description: string;
    category: string;
    condition: string;
    estimatedPriceRange: string;
    priceConfidence: string;
    recommendedAction: string;
    actionRationale?: string;
    marketplaces: string;
    searchQueries: string;
    specialNotes: string;
    keywords: string;
    disposalFee: string;
    municipalityCode?: string;
  }>
> {
  try {
    const items = await listItems();

    return items.map((item) => {
      return {
        id: item.id,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        name: item.name,
        nameJapanese: item.nameJapanese,
        description: item.description,
        category: item.category,
        condition: item.condition,
        // Format price range as readable string
        estimatedPriceRange: `¥${item.estimatedPriceJPY.low.toLocaleString()} - ¥${item.estimatedPriceJPY.high.toLocaleString()}`,
        priceConfidence: `${Math.round(item.estimatedPriceJPY.confidence * 100)}%`,
        recommendedAction: item.recommendedAction,
        actionRationale: item.actionRationale,
        // Convert arrays to comma-separated strings for CSV compatibility
        marketplaces: item.marketplaces.join(", "),
        searchQueries: item.searchQueries.join(", "),
        specialNotes: item.specialNotes,
        keywords: item.keywords.join(", "),
        // Format disposal fee if present
        disposalFee: item.disposalFeeJPY
          ? `¥${item.disposalFeeJPY.toLocaleString()}`
          : "",
        municipalityCode: item.municipalityCode,
      };
    });
  } catch (error) {
    console.error("Error preparing items for CSV export:", error);
    throw new Error("Failed to prepare items for export");
  }
}

/**
 * Calculate dashboard summary statistics
 */
export async function calculateDashboardSummary(): Promise<DashboardSummary> {
  try {
    const items = await listItems();

    // Initialize counters
    const itemsByAction = {
      keep: 0,
      online: 0,
      thrift: 0,
      donate: 0,
      trash: 0,
    };

    const itemsByCategory: Record<string, number> = {};
    let totalResaleLow = 0;
    let totalResaleHigh = 0;
    let totalConfidence = 0;
    let resaleItemCount = 0;
    let totalDisposalCost = 0;

    // Process each item
    items.forEach((item) => {
      // Count by action
      if (item.recommendedAction in itemsByAction) {
        itemsByAction[item.recommendedAction as keyof typeof itemsByAction]++;
      }

      // Count by category
      itemsByCategory[item.category] =
        (itemsByCategory[item.category] || 0) + 1;

      // Calculate resale values (only for online and thrift items)
      if (
        item.recommendedAction === "online" ||
        item.recommendedAction === "thrift"
      ) {
        totalResaleLow += item.estimatedPriceJPY.low;
        totalResaleHigh += item.estimatedPriceJPY.high;
        totalConfidence += item.estimatedPriceJPY.confidence;
        resaleItemCount++;
      }

      // Calculate disposal costs (only for trash items with disposal fee)
      if (item.recommendedAction === "trash" && item.disposalFeeJPY) {
        totalDisposalCost += item.disposalFeeJPY;
      }
    });

    return {
      totalItems: items.length,
      itemsByAction,
      itemsByCategory,
      estimatedResaleValue: {
        low: totalResaleLow,
        high: totalResaleHigh,
        averageConfidence:
          resaleItemCount > 0 ? totalConfidence / resaleItemCount : 0,
      },
      estimatedDisposalCost: totalDisposalCost,
    };
  } catch (error) {
    console.error("Error calculating dashboard summary:", error);
    throw new Error("Failed to calculate dashboard summary");
  }
}

// Database health and maintenance functions

/**
 * Check database connection and perform basic health check
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  version: number;
  itemCount: number;
}> {
  try {
    const db = getDb();
    const connected = db.isOpen();
    const version = db.verno;
    const itemCount = await db.items.count();

    // Simple read/write check for better diagnostics
    try {
      await db.transaction("rw", db.items, async () => {
        // This is a no-op transaction just to test read/write capability
      });
    } catch (txError) {
      console.warn("Database transaction test failed:", txError);
    }

    return {
      connected,
      version,
      itemCount,
    };
  } catch (error) {
    console.error("Error checking database health:", error);
    return {
      connected: false,
      version: 0,
      itemCount: 0,
    };
  }
}

/**
 * Perform database cleanup and optimization
 *
 * ⚠️ WARNING: This function is destructive and will remove invalid data!
 * It clears and rebuilds the entire items table, which may result in data loss
 * if there are any issues during the process.
 *
 * This is mainly for development/testing purposes and should not be used in production.
 *
 * @throws {Error} If called in production environment
 */
export async function optimizeDatabase(): Promise<void> {
  // Safety guard - prevent running in production
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "production"
  ) {
    throw new Error(
      "optimizeDatabase is not allowed in production environment",
    );
  }

  try {
    // Clear any orphaned or corrupt entries
    const db = getDb();
    const items = await db.items.toArray();
    const validItems = items.filter((item) => {
      return (
        item.id &&
        item.createdAt &&
        item.updatedAt &&
        item.name &&
        item.photo &&
        item.thumbnail
      );
    });

    if (validItems.length !== items.length) {
      // Use transaction for atomic clear+bulkAdd operation
      await db.transaction("rw", db.items, async () => {
        await db.items.clear();
        await db.items.bulkAdd(validItems);
      });
      console.log(
        `Cleaned up ${items.length - validItems.length} invalid items`,
      );
    }
  } catch (error) {
    console.error("Error optimizing database:", error);
    throw new Error("Failed to optimize database");
  }
}
