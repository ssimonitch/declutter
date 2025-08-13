/**
 * Utility functions for realm and access management
 * Centralizes logic for determining item visibility and access permissions
 */

import type { SuzuMemoItem } from "@/lib/types";

/**
 * Check if an item is private (belongs to user's personal realm)
 * Per Dexie Cloud: when realmId is not specified or equals userId, it's a private item
 */
export function isPrivateItem(
  item: SuzuMemoItem,
  userId: string | undefined,
): boolean {
  if (!userId) return false;
  // Item is private if it has no realmId or realmId equals the user's ID
  return !item.realmId || item.realmId === userId;
}

/**
 * Check if a user can access an item based on realm membership
 * @param item - The item to check
 * @param userId - The current user's ID
 * @param currentRealmId - The currently selected realm ID (null for private view)
 */
export function canAccessItem(
  item: SuzuMemoItem,
  userId: string | undefined,
  currentRealmId: string | null,
): boolean {
  if (!userId) return false;

  // If viewing private items (currentRealmId is null)
  if (currentRealmId === null) {
    return isPrivateItem(item, userId);
  }

  // If viewing a specific realm, item must belong to that realm
  return item.realmId === currentRealmId;
}

/**
 * Normalize realm ID for database operations
 * Converts null to undefined for consistency with Dexie Cloud
 */
export function normalizeRealmId(
  realmId: string | null | undefined,
): string | undefined {
  // Convert null to undefined for Dexie Cloud compatibility
  // Empty string should also be treated as undefined
  if (realmId === null || realmId === "") {
    return undefined;
  }
  return realmId;
}

/**
 * Get display name for a realm
 * @param realmId - The realm ID
 * @param userId - The current user's ID
 * @returns Display name for the realm
 */
export function getRealmDisplayName(
  realmId: string | null | undefined,
  userId: string | undefined,
): string {
  if (!realmId || (userId && realmId === userId)) {
    return "プライベート";
  }
  return "共有グループ";
}

/**
 * Check if a realm ID represents a private realm
 * @param realmId - The realm ID to check
 * @param userId - The current user's ID
 */
export function isPrivateRealm(
  realmId: string | null | undefined,
  userId: string | undefined,
): boolean {
  if (!userId) return false;
  return !realmId || realmId === userId;
}

/**
 * Filter items by realm access
 * @param items - Array of items to filter
 * @param userId - The current user's ID
 * @param currentRealmId - The currently selected realm ID
 */
export function filterItemsByRealm(
  items: SuzuMemoItem[],
  userId: string | undefined,
  currentRealmId: string | null,
): SuzuMemoItem[] {
  if (!userId) return [];

  return items.filter((item) => canAccessItem(item, userId, currentRealmId));
}
