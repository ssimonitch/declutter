// Database & Storage Layer for Declutter App MVP
// Dexie IndexedDB wrapper with CRUD operations and utility functions

import Dexie, { Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import {
  DeclutterItem,
  DeclutterItemDB,
  DashboardSummary,
  DeclutterMember,
  CreateRealmRequest,
  InviteMemberRequest,
  RealmSummary,
} from "./types";

// Dexie Database Class with Cloud addon
export class DeclutterDatabase extends Dexie {
  items!: Table<DeclutterItemDB>;

  constructor() {
    // Pass the database name and options including the dexieCloud addon
    super("DeclutterDB", { addons: [dexieCloud] });

    // For MVP: Since we're changing primary key format, we need to start fresh
    // In production, you'd want to implement a proper data migration

    // Version 1 - Use Dexie Cloud's @ prefix for auto-generated IDs
    // The @ prefix tells Dexie to generate globally unique string IDs
    this.version(1).stores({
      items:
        "@id, createdAt, updatedAt, recommendedAction, category, nameEnglishSpecific, [recommendedAction+updatedAt], [category+updatedAt]",
    });

    // Version 2 - Add realm sharing support (Dexie Cloud provides realms and members tables)
    this.version(2).stores({
      items:
        "@id, realmId, createdAt, updatedAt, recommendedAction, category, nameEnglishSpecific, [recommendedAction+updatedAt], [category+updatedAt], [realmId+updatedAt]",
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

    // Only configure cloud if it's available and environment variable is set
    if (process.env.NEXT_PUBLIC_DEXIE_CLOUD_DATABASE_URL && dbInstance.cloud) {
      try {
        dbInstance.cloud.configure({
          databaseUrl: process.env.NEXT_PUBLIC_DEXIE_CLOUD_DATABASE_URL,
          requireAuth: true, // TODO: implement custom auth after testing other features
        });
      } catch (error) {
        console.warn("Failed to configure Dexie Cloud:", error);
      }
    }
  }
  return dbInstance;
}

/**
 * Initialize database
 * Call this once when the app starts
 */
export async function initializeDatabase(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // Initialize the database
  try {
    const db = getDb();
    // Test that it works
    await db.items.count();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw new Error("Failed to initialize database");
  }
}

/**
 * Reset the entire database (useful for development)
 * WARNING: This will delete all data!
 */
export async function resetDatabase(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Database operations must be done in the browser");
  }

  try {
    // Delete the existing database
    await Dexie.delete("DeclutterDB");

    // Clear the instance
    dbInstance = null;

    // Re-initialize
    getDb();

    console.log("Database reset successfully");
  } catch (error) {
    console.error("Error resetting database:", error);
    throw new Error("Failed to reset database");
  }
}

// Realm and Sharing Operations

/**
 * Create a new shared realm for family collaboration
 */
export async function createRealm(
  request: CreateRealmRequest,
): Promise<string> {
  try {
    if (!dbInstance?.cloud?.currentUser) {
      throw new Error("User must be authenticated to create a realm");
    }

    // For now, create a simple realm ID
    // In a full implementation, this would integrate with Dexie Cloud's realm system
    const realmId = `realm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Created realm: ${request.name} with ID: ${realmId}`);
    return realmId;
  } catch (error) {
    console.error("Error creating realm:", error);
    throw new Error("Failed to create realm");
  }
}

/**
 * Invite a family member to a shared realm
 */
export async function inviteMember(
  request: InviteMemberRequest,
): Promise<string> {
  try {
    if (!dbInstance?.cloud?.currentUser) {
      throw new Error("User must be authenticated to invite members");
    }

    // Simplified implementation for demonstration
    console.log(
      `Inviting ${request.name} (${request.email}) to realm ${request.realmId}`,
    );
    return `invite_${Date.now()}`;
  } catch (error) {
    console.error("Error inviting member:", error);
    throw new Error("Failed to invite member");
  }
}

/**
 * Accept an invitation to join a realm
 */
export async function acceptInvitation(memberId: string): Promise<void> {
  try {
    if (!dbInstance?.cloud?.currentUser) {
      throw new Error("User must be authenticated to accept invitations");
    }

    // Simplified implementation for demonstration
    console.log(`Accepting invitation ${memberId}`);
  } catch (error) {
    console.error("Error accepting invitation:", error);
    throw new Error("Failed to accept invitation");
  }
}

/**
 * Get all realms the current user belongs to
 */
export async function getUserRealms(): Promise<RealmSummary[]> {
  try {
    if (!dbInstance?.cloud?.currentUser) {
      return [];
    }

    // Return empty array for now - simplified implementation
    // In a full implementation, this would query Dexie Cloud's built-in realm system
    return [];
  } catch (error) {
    console.error("Error getting user realms:", error);
    throw new Error("Failed to get user realms");
  }
}

/**
 * Get pending invitations for the current user
 */
export async function getPendingInvitations(): Promise<DeclutterMember[]> {
  try {
    if (!dbInstance?.cloud?.currentUser) {
      return [];
    }

    // Return empty array for now - simplified implementation
    return [];
  } catch (error) {
    console.error("Error getting pending invitations:", error);
    throw new Error("Failed to get pending invitations");
  }
}

/**
 * Remove a member from a realm (owner only)
 */
export async function removeMember(memberId: string): Promise<void> {
  try {
    if (!dbInstance?.cloud?.currentUser) {
      throw new Error("User must be authenticated to remove members");
    }

    // Simplified implementation for demonstration
    console.log(`Removing member ${memberId}`);
  } catch (error) {
    console.error("Error removing member:", error);
    throw new Error("Failed to remove member");
  }
}

/**
 * Get the current active realm ID (for filtering items)
 * Returns null for private items, or the selected realm ID
 */
let currentRealmId: string | null = null;

export function getCurrentRealmId(): string | null {
  return currentRealmId;
}

export function setCurrentRealmId(realmId: string | null): void {
  currentRealmId = realmId;
}

/**
 * Check if an item can be shared (not in a realm yet)
 */
export function canShareItem(item: DeclutterItem): boolean {
  return !item.realmId;
}

/**
 * Move items to a shared realm
 */
export async function shareItems(
  itemIds: string[],
  realmId: string,
): Promise<void> {
  try {
    if (!dbInstance?.cloud?.currentUser) {
      throw new Error("User must be authenticated to share items");
    }

    // Update items to include realm ID
    for (const itemId of itemIds) {
      await getDb().items.update(itemId, {
        realmId,
        updatedAt: new Date().toISOString(),
      });
    }
    console.log(`Shared ${itemIds.length} items to realm ${realmId}`);
  } catch (error) {
    console.error("Error sharing items:", error);
    throw new Error("Failed to share items");
  }
}

/**
 * Move items back to private (remove from realm)
 */
export async function unshareItems(itemIds: string[]): Promise<void> {
  try {
    const now = new Date().toISOString();

    for (const itemId of itemIds) {
      await getDb().items.update(itemId, {
        realmId: undefined,
        updatedAt: now,
      });
    }
  } catch (error) {
    console.error("Error unsharing items:", error);
    throw new Error("Failed to unshare items");
  }
}

// CRUD Operations

/**
 * Add new item with Dexie Cloud auto-generated ID and timestamps
 */
export async function addItem(
  item: Omit<DeclutterItem, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  try {
    const now = new Date().toISOString();
    const newItem: Omit<DeclutterItem, "id"> = {
      ...item,
      // ID will be auto-generated by Dexie due to @ prefix in schema
      realmId: item.realmId || getCurrentRealmId() || undefined, // Use current realm if not specified
      quantity: item.quantity || 1, // Default to 1 if not specified
      createdAt: now,
      updatedAt: now,
    };

    // Dexie will auto-generate the ID and return it
    const id = await getDb().items.add(newItem as DeclutterItem);
    return id as string;
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
 * Filters by current realm if one is set
 */
export async function listItems(): Promise<DeclutterItem[]> {
  try {
    const realmId = getCurrentRealmId();

    if (realmId === null) {
      // Show only private items (no realm or realm is null)
      return await getDb()
        .items.filter((item) => !item.realmId)
        .reverse()
        .sortBy("updatedAt");
    } else {
      // Show items from specific realm
      return await getDb()
        .items.where("realmId")
        .equals(realmId)
        .reverse()
        .sortBy("updatedAt");
    }
  } catch (error) {
    console.error("Error listing items:", error);
    throw new Error("Failed to retrieve items");
  }
}

/**
 * Search items by name, description, keywords
 * Filters by current realm if one is set
 */
export async function searchItems(query: string): Promise<DeclutterItem[]> {
  try {
    if (!query.trim()) {
      return await listItems();
    }

    const lowerQuery = query.toLowerCase();
    const realmId = getCurrentRealmId();

    const results = await getDb()
      .items.filter((item) => {
        // First check realm filtering
        if (realmId === null && item.realmId) {
          return false; // Skip realm items when showing private
        }
        if (realmId !== null && item.realmId !== realmId) {
          return false; // Skip items not in current realm
        }

        // Then check search query
        const searchableText = [
          item.nameJapaneseSpecific || "",
          item.nameEnglishSpecific || "",
          item.nameJapaneseGeneric || "",
          item.nameEnglishGeneric || "",
          item.description,
          item.specialNotes || "",
          item.actionRationale || "",
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
 * Filters by current realm if one is set
 */
export async function filterItemsByAction(
  action: string,
): Promise<DeclutterItem[]> {
  try {
    const realmId = getCurrentRealmId();

    const query = getDb().items.where("recommendedAction").equals(action);

    const results = await query
      .filter((item) => {
        if (realmId === null) {
          return !item.realmId; // Show only private items
        } else {
          return item.realmId === realmId; // Show only items from current realm
        }
      })
      .sortBy("updatedAt");

    return results.reverse();
  } catch (error) {
    console.error("Error filtering items by action:", error);
    throw new Error("Failed to filter items by action");
  }
}

/**
 * Filter items by category
 * Filters by current realm if one is set
 */
export async function filterItemsByCategory(
  category: string,
): Promise<DeclutterItem[]> {
  try {
    const realmId = getCurrentRealmId();

    const query = getDb().items.where("category").equals(category);

    const results = await query
      .filter((item) => {
        if (realmId === null) {
          return !item.realmId; // Show only private items
        } else {
          return item.realmId === realmId; // Show only items from current realm
        }
      })
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
    nameJapaneseSpecific: string;
    nameEnglishSpecific: string;
    nameJapaneseGeneric: string;
    nameEnglishGeneric: string;
    description: string;
    category: string;
    condition: string;
    quantity: number;
    onlineAuctionPriceRange: string;
    onlineAuctionPriceConfidence: string;
    thriftShopPriceRange: string;
    thriftShopPriceConfidence: string;
    recommendedAction: string;
    actionRationale: string;
    marketplaces: string;
    searchQueries: string;
    specialNotes: string;
    keywords: string;
    disposalCost?: string;
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
        nameJapaneseSpecific: item.nameJapaneseSpecific,
        nameEnglishSpecific: item.nameEnglishSpecific,
        nameJapaneseGeneric: item.nameJapaneseGeneric,
        nameEnglishGeneric: item.nameEnglishGeneric,
        description: item.description,
        category: item.category,
        condition: item.condition,
        quantity: item.quantity || 1,
        onlineAuctionPriceRange: `¥${item.onlineAuctionPriceJPY.low.toLocaleString()} - ¥${item.onlineAuctionPriceJPY.high.toLocaleString()}`,
        onlineAuctionPriceConfidence: `${Math.round(item.onlineAuctionPriceJPY.confidence * 100)}%`,
        thriftShopPriceRange: `¥${item.thriftShopPriceJPY.low.toLocaleString()} - ¥${item.thriftShopPriceJPY.high.toLocaleString()}`,
        thriftShopPriceConfidence: `${Math.round(item.thriftShopPriceJPY.confidence * 100)}%`,
        recommendedAction: item.recommendedAction,
        actionRationale: item.actionRationale || "",
        marketplaces: item.marketplaces.join(", "),
        searchQueries: item.searchQueries.join(", "),
        specialNotes: item.specialNotes || "",
        keywords: item.keywords.join(", "),
        disposalCost:
          item.disposalCostJPY !== undefined && item.disposalCostJPY !== null
            ? `¥${item.disposalCostJPY.toLocaleString()}`
            : undefined,
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
      const quantity = item.quantity || 1;

      // Count by action (considering quantity)
      if (item.recommendedAction in itemsByAction) {
        itemsByAction[item.recommendedAction as keyof typeof itemsByAction] +=
          quantity;
      }

      // Count by category (considering quantity)
      itemsByCategory[item.category] =
        (itemsByCategory[item.category] || 0) + quantity;

      // Calculate resale values
      if (item.recommendedAction === "online") {
        const priceData = item.onlineAuctionPriceJPY;
        totalResaleLow += priceData.low * quantity;
        totalResaleHigh += priceData.high * quantity;
        totalConfidence += priceData.confidence;
        resaleItemCount++;
      } else if (item.recommendedAction === "thrift") {
        const priceData = item.thriftShopPriceJPY;
        totalResaleLow += priceData.low * quantity;
        totalResaleHigh += priceData.high * quantity;
        totalConfidence += priceData.confidence;
        resaleItemCount++;
      }

      // Calculate disposal costs
      if (item.recommendedAction === "trash") {
        const disposalCost = item.disposalCostJPY || 0;
        totalDisposalCost += disposalCost * quantity;
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
        item.nameEnglishSpecific &&
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
