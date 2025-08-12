// Database & Storage Layer for Declutter App MVP
// Dexie IndexedDB wrapper with CRUD operations and utility functions

import Dexie, { Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import {
  DeclutterItem,
  DeclutterItemDB,
  DashboardSummary,
  DeclutterRealm,
  DeclutterMember,
  CreateRealmRequest,
  InviteMemberRequest,
  RealmSummary,
} from "./types";

// Dexie Database Class with Cloud addon
export class DeclutterDatabase extends Dexie {
  items!: Table<DeclutterItemDB>;
  // Note: realms and members are automatically provided by Dexie Cloud addon

  constructor() {
    // Pass the database name and options including the dexieCloud addon
    super("DeclutterDB", { addons: [dexieCloud] });

    this.version(1).stores({
      items:
        "@id, realmId, createdAt, updatedAt, recommendedAction, category, nameEnglishSpecific, [recommendedAction+updatedAt], [category+updatedAt], [realmId+updatedAt]",
    });
  }
}

// Lazy database initialization for SSR safety
let dbInstance: DeclutterDatabase | null = null;

const isTestEnvironment =
  process.env.NODE_ENV === "test" ||
  process.env.VITEST === "true" ||
  process.env.CI === "true";

const cloudDatabaseUrl = process.env.NEXT_PUBLIC_DEXIE_CLOUD_DATABASE_URL;

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

    // Only configure cloud if it's available, environment variable is set, and not in test
    if (cloudDatabaseUrl && dbInstance.cloud && !isTestEnvironment) {
      try {
        dbInstance.cloud.configure({
          databaseUrl: cloudDatabaseUrl,
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
    const db = getDb();
    if (!db.cloud?.currentUser) {
      throw new Error("User must be authenticated to create a realm");
    }

    // Use Dexie Cloud's built-in realm management
    const currentUser = db.cloud.currentUser.getValue();
    if (!currentUser || !currentUser.userId) {
      throw new Error("No authenticated user found");
    }

    // Create a realm using Dexie Cloud's access control system
    const realmId = await db.transaction(
      "rw",
      ["realms", "members"],
      async () => {
        // Generate a globally unique realm ID with required "rlm" prefix for Dexie Cloud
        const newRealmId = `rlm${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

        // Add to Dexie Cloud's realms table
        await db.realms.add({
          realmId: newRealmId,
          name: request.name,
          owner: currentUser.userId,
        });

        // Add the creator as the owner member with a special ID to prevent duplicates
        await db.members.add({
          id: `mmb-owner-${newRealmId}`, // Use a deterministic ID for owner
          realmId: newRealmId,
          userId: currentUser.userId,
          name: currentUser.name || "Owner",
          email: currentUser.email,
          roles: ["owner"],
          accepted: new Date(),
        });

        return newRealmId;
      },
    );

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
    const db = getDb();
    if (!db.cloud?.currentUser) {
      throw new Error("User must be authenticated to invite members");
    }

    const currentUser = db.cloud.currentUser.getValue();
    if (!currentUser || !currentUser.userId) {
      throw new Error("No authenticated user found");
    }

    // Check if user is the realm owner
    const realm = await db.realms.get(request.realmId);
    if (!realm || realm.owner !== currentUser.userId) {
      throw new Error("Only realm owners can invite members");
    }

    // Check if user is already a member or has a pending invitation
    const allMembersInRealm = await db.members
      .where("realmId")
      .equals(request.realmId)
      .toArray();
    const existingMember = allMembersInRealm.find(
      (m) => m.email === request.email,
    );

    if (existingMember) {
      if (existingMember.accepted) {
        throw new Error("User is already a member of this realm");
      } else if (existingMember.invite && !existingMember.rejected) {
        throw new Error("User already has a pending invitation to this realm");
      }
    }

    // Create the invitation using Dexie Cloud's member system
    const inviteId = await db.transaction("rw", "members", async () => {
      const newInviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db.members.add({
        id: newInviteId,
        realmId: request.realmId,
        name: request.name,
        email: request.email,
        invite: true,
      });

      return newInviteId;
    });

    console.log(
      `Invited ${request.name} (${request.email}) to realm ${request.realmId}`,
    );
    return inviteId;
  } catch (error) {
    console.error("Error inviting member:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to invite member",
    );
  }
}

/**
 * Accept an invitation to join a realm
 */
export async function acceptInvitation(memberId: string): Promise<void> {
  try {
    const db = getDb();
    if (!db.cloud?.currentUser) {
      throw new Error("User must be authenticated to accept invitations");
    }

    const currentUser = db.cloud.currentUser.getValue();
    if (!currentUser || !currentUser.userId) {
      throw new Error("No authenticated user found");
    }

    // Find the invitation
    const invitation = await db.members.get(memberId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify this invitation is for the current user
    if (invitation.email !== currentUser.email) {
      throw new Error("This invitation is not for the current user");
    }

    // Check if invitation is still valid
    if (!invitation.invite || invitation.accepted || invitation.rejected) {
      throw new Error("This invitation is no longer valid");
    }

    // Accept the invitation by updating the member record
    await db.transaction("rw", "members", async () => {
      await db.members.update(memberId, {
        userId: currentUser.userId,
        accepted: new Date(),
        invite: false, // No longer a pending invitation
      });
    });

    console.log(`Accepted invitation ${memberId}`);
  } catch (error) {
    console.error("Error accepting invitation:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to accept invitation",
    );
  }
}

/**
 * Get all realms the current user belongs to
 */
export async function getUserRealms(): Promise<RealmSummary[]> {
  try {
    const db = getDb();
    if (!db.cloud?.currentUser) {
      return [];
    }

    const currentUser = db.cloud.currentUser.getValue();
    if (!currentUser || !currentUser.userId) {
      return [];
    }

    // Use a Map to track unique realms by realmId
    const realmMap = new Map<string, RealmSummary>();

    // Find all realms where the user is a member
    const userMemberships = await db.members
      .where("userId")
      .equals(currentUser.userId)
      .toArray();

    // Get unique realm IDs from memberships
    const memberRealmIds = [...new Set(userMemberships.map((m) => m.realmId))];

    // Process realms where user is a member
    for (const realmId of memberRealmIds) {
      const realm = await db.realms.get(realmId);
      if (!realm) continue;

      const allMembers = await db.members
        .where("realmId")
        .equals(realmId)
        .toArray();

      // Deduplicate members by userId (keep first occurrence)
      const uniqueMembers = allMembers.filter(
        (member, index, self) =>
          index === self.findIndex((m) => m.userId === member.userId),
      );

      const itemCount = await db.items.where("realmId").equals(realmId).count();

      realmMap.set(realmId, {
        realm,
        members: uniqueMembers,
        itemCount,
        isOwner: realm.owner === currentUser.userId,
      });
    }

    // Also check for owned realms (in case there's no explicit membership record)
    const allRealms = await db.realms.toArray();
    const ownedRealms = allRealms.filter(
      (realm) => realm.owner === currentUser.userId,
    );

    for (const realm of ownedRealms) {
      // Skip if already processed
      if (realmMap.has(realm.realmId)) {
        // Update isOwner flag if needed
        const existing = realmMap.get(realm.realmId)!;
        if (!existing.isOwner) {
          existing.isOwner = true;
        }
        continue;
      }

      const allMembers = await db.members
        .where("realmId")
        .equals(realm.realmId)
        .toArray();

      // Deduplicate members by userId
      const uniqueMembers = allMembers.filter(
        (member, index, self) =>
          index === self.findIndex((m) => m.userId === member.userId),
      );

      const itemCount = await db.items
        .where("realmId")
        .equals(realm.realmId)
        .count();

      realmMap.set(realm.realmId, {
        realm,
        members: uniqueMembers,
        itemCount,
        isOwner: true,
      });
    }

    return Array.from(realmMap.values());
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
    const db = getDb();
    if (!db.cloud?.currentUser) {
      return [];
    }

    const currentUser = db.cloud.currentUser.getValue();
    if (!currentUser || !currentUser.email) {
      return [];
    }

    // Find all pending invitations for the current user's email
    const pendingInvitations = await db.members
      .where("email")
      .equals(currentUser.email)
      .and(
        (member) =>
          member.invite === true && !member.accepted && !member.rejected,
      )
      .toArray();

    return pendingInvitations;
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
    const db = getDb();
    if (!db.cloud?.currentUser) {
      throw new Error("User must be authenticated to remove members");
    }

    const currentUser = db.cloud.currentUser.getValue();
    if (!currentUser || !currentUser.userId) {
      throw new Error("No authenticated user found");
    }

    // Get the member to be removed
    const memberToRemove = await db.members.get(memberId);
    if (!memberToRemove) {
      throw new Error("Member not found");
    }

    // Verify the current user is the realm owner
    const realm = await db.realms.get(memberToRemove.realmId);
    if (!realm || realm.owner !== currentUser.userId) {
      throw new Error("Only realm owners can remove members");
    }

    // Prevent owner from removing themselves (they should transfer ownership first)
    if (memberToRemove.userId === currentUser.userId) {
      throw new Error(
        "Owners cannot remove themselves. Transfer ownership first.",
      );
    }

    // Remove the member
    await db.transaction("rw", "members", async () => {
      await db.members.delete(memberId);
    });

    console.log(
      `Removed member ${memberId} from realm ${memberToRemove.realmId}`,
    );
  } catch (error) {
    console.error("Error removing member:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to remove member",
    );
  }
}

// DEPRECATED: Legacy realm management functions
// Realm state is now managed via RealmContext in /contexts/realm-context.tsx
// These functions remain for backward compatibility with existing database operations
// that may still reference them, but new code should use useRealm() hook instead

/**
 * @deprecated Use RealmContext via useRealm() hook instead
 * Legacy function for internal database operations only
 */
let currentRealmId: string | null = null;

/**
 * @deprecated Use RealmContext via useRealm() hook instead
 * This function is kept for backward compatibility with database operations
 * but should not be used in new UI components
 */
export function getCurrentRealmId(): string | null {
  return currentRealmId;
}

/**
 * @deprecated Use RealmContext via useRealm() hook instead
 * This function is kept for backward compatibility with database operations
 * but should not be used in new UI components
 */
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
//
// IMPORTANT: Realm State Management
// ================================
// These database functions support filtering by realm via an optional `realmId` parameter.
//
// RECOMMENDED PATTERN (for UI components):
// 1. Use RealmContext via useRealm() hook to get current realm state
// 2. Pass the realmId explicitly to database functions
//
// Example:
//   const { currentRealmId } = useRealm();
//   const items = await listItems(currentRealmId);
//
// DEPRECATED PATTERN (still supported for backward compatibility):
// 1. Relying on global getCurrentRealmId() function
// 2. Not passing realmId parameter (falls back to global)
//
// The global functions are kept for backward compatibility but should be avoided
// in new code. They may cause state drift between the React context and global state.

/**
 * Add new item with Dexie Cloud auto-generated ID and timestamps
 * @param item - The item data to add (excluding auto-generated fields)
 * @param realmId - Optional realm ID to assign the item to. Pass null for private items.
 *                  Recommended: get this from useRealm() hook in UI components.
 */
export async function addItem(
  item: Omit<DeclutterItem, "id" | "createdAt" | "updatedAt">,
  realmId?: string | null,
): Promise<string> {
  try {
    const now = new Date().toISOString();
    // Prioritize explicit realmId parameter, then item's existing realmId
    // Note: Global getCurrentRealmId() is deprecated - prefer passing explicit realmId
    const effectiveRealmId =
      realmId !== undefined
        ? realmId
        : item.realmId || getCurrentRealmId() || undefined;

    const newItem: Omit<DeclutterItem, "id"> = {
      ...item,
      // ID will be auto-generated by Dexie due to @ prefix in schema
      realmId: effectiveRealmId || undefined, // Use passed realmId or fall back to current realm
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
 * @param realmId - Optional realm ID to filter by. Pass null for private items only.
 *                  Recommended: get this from useRealm() hook in UI components.
 *                  If not provided, falls back to legacy global state (deprecated).
 */
export async function listItems(
  realmId?: string | null,
): Promise<DeclutterItem[]> {
  try {
    // Use explicit realmId parameter; fallback to legacy global is deprecated
    const effectiveRealmId =
      realmId !== undefined ? realmId : getCurrentRealmId();
    const db = getDb();
    const userId = db.cloud?.currentUser?.getValue()?.userId;

    if (effectiveRealmId === null) {
      // Show only private items (no realm or realm is undefined)
      return await db.items
        .filter((item) => !item.realmId || item.realmId === userId)
        .reverse()
        .sortBy("updatedAt");
    } else {
      // Show items from specific realm
      return await db.items
        .where("realmId")
        .equals(effectiveRealmId)
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
 * @param query - Search query string
 * @param realmId - Optional realm ID to filter by. Pass null for private items only.
 *                  Recommended: get this from useRealm() hook in UI components.
 *                  If not provided, falls back to legacy global state (deprecated).
 */
export async function searchItems(
  query: string,
  realmId?: string | null,
): Promise<DeclutterItem[]> {
  try {
    if (!query.trim()) {
      return await listItems(realmId);
    }

    const lowerQuery = query.toLowerCase();
    // Use explicit realmId parameter; fallback to legacy global is deprecated
    const effectiveRealmId =
      realmId !== undefined ? realmId : getCurrentRealmId();

    const results = await getDb()
      .items.filter((item) => {
        // First check realm filtering
        if (effectiveRealmId === null && item.realmId) {
          return false; // Skip realm items when showing private
        }
        if (effectiveRealmId !== null && item.realmId !== effectiveRealmId) {
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
 * @param action - The recommended action to filter by
 * @param realmId - Optional realm ID to filter by. Pass null for private items only.
 *                  Recommended: get this from useRealm() hook in UI components.
 *                  If not provided, falls back to legacy global state (deprecated).
 */
export async function filterItemsByAction(
  action: string,
  realmId?: string | null,
): Promise<DeclutterItem[]> {
  try {
    // Use explicit realmId parameter; fallback to legacy global is deprecated
    const effectiveRealmId =
      realmId !== undefined ? realmId : getCurrentRealmId();

    const query = getDb().items.where("recommendedAction").equals(action);

    const results = await query
      .filter((item) => {
        if (effectiveRealmId === null) {
          return !item.realmId; // Show only private items
        } else {
          return item.realmId === effectiveRealmId; // Show only items from current realm
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
 * @param category - The category to filter by
 * @param realmId - Optional realm ID to filter by. Pass null for private items only.
 *                  Recommended: get this from useRealm() hook in UI components.
 *                  If not provided, falls back to legacy global state (deprecated).
 */
export async function filterItemsByCategory(
  category: string,
  realmId?: string | null,
): Promise<DeclutterItem[]> {
  try {
    // Use explicit realmId parameter; fallback to legacy global is deprecated
    const effectiveRealmId =
      realmId !== undefined ? realmId : getCurrentRealmId();

    const query = getDb().items.where("category").equals(category);

    const results = await query
      .filter((item) => {
        if (effectiveRealmId === null) {
          return !item.realmId; // Show only private items
        } else {
          return item.realmId === effectiveRealmId; // Show only items from current realm
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
 * @param realmId - Optional realm ID to filter by. Pass null for private items only.
 *                  Recommended: get this from useRealm() hook in UI components.
 */
export async function exportItemsForCSV(realmId?: string | null): Promise<
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
    const items = await listItems(realmId);

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
 * @param realmId - Optional realm ID to filter by. Pass null for private items only.
 *                  Recommended: get this from useRealm() hook in UI components.
 */
export async function calculateDashboardSummary(
  realmId?: string | null,
): Promise<DashboardSummary> {
  try {
    const items = await listItems(realmId);

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

// Additional Realm Utility Functions

/**
 * Reject an invitation to join a realm
 */
export async function rejectInvitation(memberId: string): Promise<void> {
  try {
    const db = getDb();
    if (!db.cloud?.currentUser) {
      throw new Error("User must be authenticated to reject invitations");
    }

    const currentUser = db.cloud.currentUser.getValue();
    if (!currentUser || !currentUser.email) {
      throw new Error("No authenticated user found");
    }

    // Find the invitation
    const invitation = await db.members.get(memberId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify this invitation is for the current user
    if (invitation.email !== currentUser.email) {
      throw new Error("This invitation is not for the current user");
    }

    // Check if invitation is still valid
    if (!invitation.invite || invitation.accepted || invitation.rejected) {
      throw new Error("This invitation is no longer valid");
    }

    // Reject the invitation
    await db.transaction("rw", "members", async () => {
      await db.members.update(memberId, {
        rejected: new Date(),
        invite: false,
      });
    });

    console.log(`Rejected invitation ${memberId}`);
  } catch (error) {
    console.error("Error rejecting invitation:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to reject invitation",
    );
  }
}

/**
 * Leave a realm (non-owners only)
 */
export async function leaveRealm(realmId: string): Promise<void> {
  try {
    const db = getDb();
    if (!db.cloud?.currentUser) {
      throw new Error("User must be authenticated to leave realms");
    }

    const currentUser = db.cloud.currentUser.getValue();
    if (!currentUser || !currentUser.userId) {
      throw new Error("No authenticated user found");
    }

    // Find the user's membership
    const allMembersInRealm = await db.members
      .where("realmId")
      .equals(realmId)
      .toArray();
    const membership = allMembersInRealm.find(
      (m) => m.userId === currentUser.userId,
    );

    if (!membership) {
      throw new Error("You are not a member of this realm");
    }

    // Prevent owners from leaving (they should transfer ownership first)
    const realm = await db.realms.get(realmId);
    if (realm && realm.owner === currentUser.userId) {
      throw new Error("Owners cannot leave realms. Transfer ownership first.");
    }

    // Remove the membership
    await db.transaction("rw", "members", async () => {
      await db.members.delete(membership.id!);
    });

    // Note: Legacy realm state management via globals is deprecated
    // UI components should use RealmContext instead
    // This is kept for backward compatibility with any legacy components
    if (getCurrentRealmId() === realmId) {
      setCurrentRealmId(null);
    }

    console.log(`Left realm ${realmId}`);
  } catch (error) {
    console.error("Error leaving realm:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to leave realm",
    );
  }
}

/**
 * Transfer realm ownership to another member
 */
export async function transferRealmOwnership(
  realmId: string,
  newOwnerId: string,
): Promise<void> {
  try {
    const db = getDb();
    if (!db.cloud?.currentUser) {
      throw new Error("User must be authenticated to transfer ownership");
    }

    const currentUser = db.cloud.currentUser.getValue();
    if (!currentUser || !currentUser.userId) {
      throw new Error("No authenticated user found");
    }

    // Verify current user is the owner
    const realm = await db.realms.get(realmId);
    if (!realm || realm.owner !== currentUser.userId) {
      throw new Error("Only realm owners can transfer ownership");
    }

    // Verify the new owner is a member of the realm
    const allMembersInRealm = await db.members
      .where("realmId")
      .equals(realmId)
      .toArray();
    const newOwnerMembership = allMembersInRealm.find(
      (m) => m.userId === newOwnerId,
    );

    if (!newOwnerMembership || !newOwnerMembership.accepted) {
      throw new Error("New owner must be an accepted member of the realm");
    }

    // Transfer ownership
    await db.transaction("rw", "realms", async () => {
      // Update realm owner
      await db.realms.update(realmId, { owner: newOwnerId });
    });

    console.log(
      `Transferred ownership of realm ${realmId} to user ${newOwnerId}`,
    );
  } catch (error) {
    console.error("Error transferring realm ownership:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to transfer ownership",
    );
  }
}

/**
 * Get realm details by ID (for members only)
 */
export async function getRealm(
  realmId: string,
): Promise<DeclutterRealm | null> {
  try {
    const db = getDb();
    if (!db.cloud?.currentUser) {
      return null;
    }

    const currentUser = db.cloud.currentUser.getValue();
    if (!currentUser || !currentUser.userId) {
      return null;
    }

    // Verify user has access to this realm
    // We need to query by realmId first then filter for userId
    const allMembersInRealm = await db.members
      .where("realmId")
      .equals(realmId)
      .toArray();
    const membership = allMembersInRealm.find(
      (m) => m.userId === currentUser.userId,
    );

    // Check if user is a member or owner
    const realm = await db.realms.get(realmId);
    const isMember = membership && membership.userId === currentUser.userId;
    const isOwner = realm && realm.owner === currentUser.userId;

    if (!isMember && !isOwner) {
      throw new Error("Access denied to this realm");
    }

    // Return the realm
    return (await db.realms.get(realmId)) || null;
  } catch (error) {
    console.error("Error getting realm:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get realm",
    );
  }
}
