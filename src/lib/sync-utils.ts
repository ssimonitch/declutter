/**
 * Utilities for Dexie Cloud sync monitoring and management
 */

import { getDb } from "./db";

export type SyncStatus =
  | "syncing"
  | "connected"
  | "disconnected"
  | "error"
  | "disabled";

export interface SyncState {
  status: SyncStatus;
  lastSyncTime?: string;
  error?: string;
  pendingChanges?: number;
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncState {
  const db = getDb();

  // Check if Dexie Cloud is disabled
  if (process.env.NEXT_PUBLIC_DISABLE_DEXIE_CLOUD === "true" || !db.cloud) {
    return { status: "disabled" };
  }

  // Get sync state from Dexie Cloud
  const syncState = db.cloud.syncState?.getValue();

  if (!syncState) {
    return { status: "disconnected" };
  }

  // Map Dexie Cloud states to our simplified status
  if (syncState.phase === "in-sync") {
    return {
      status: "connected",
      lastSyncTime: new Date().toISOString(),
    };
  } else if (syncState.phase === "pushing" || syncState.phase === "pulling") {
    return {
      status: "syncing",
    };
  } else if (syncState.error) {
    return {
      status: "error",
      error: syncState.error.message || String(syncState.error),
    };
  }

  return { status: "disconnected" };
}

/**
 * Manually trigger sync
 */
export async function triggerSync(): Promise<void> {
  const db = getDb();

  if (!db.cloud) {
    throw new Error("Dexie Cloud is not configured");
  }

  try {
    console.log("Manually triggering sync...");
    await db.cloud.sync();
    console.log("Manual sync completed");
  } catch (error) {
    console.error("Manual sync failed:", error);
    throw error;
  }
}

/**
 * Force pull latest data from cloud
 */
export async function forcePullFromCloud(): Promise<void> {
  const db = getDb();

  if (!db.cloud) {
    throw new Error("Dexie Cloud is not configured");
  }

  try {
    console.log("Force pulling from cloud...");
    await db.cloud.sync({ purpose: "pull", wait: true });
    console.log("Force pull completed");
  } catch (error) {
    console.error("Force pull failed:", error);
    throw error;
  }
}

/**
 * Check if there are pending changes to sync
 */
export async function hasPendingChanges(): Promise<boolean> {
  const db = getDb();

  if (!db.cloud) {
    return false;
  }

  const syncState = db.cloud.syncState?.getValue();
  // Check if we're in a syncing state
  return (
    syncState?.phase === "pushing" || syncState?.phase === "pulling" || false
  );
}

/**
 * Wait for sync to complete (with timeout)
 */
export async function waitForSync(timeoutMs = 10000): Promise<void> {
  const db = getDb();

  if (!db.cloud) {
    return; // Nothing to wait for if cloud is disabled
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Sync timeout"));
    }, timeoutMs);

    // Subscribe to sync state changes
    const subscription = db.cloud.syncState?.subscribe((state) => {
      if (state.phase === "in-sync") {
        clearTimeout(timeout);
        subscription?.unsubscribe();
        resolve();
      } else if (state.error) {
        clearTimeout(timeout);
        subscription?.unsubscribe();
        reject(new Error(state.error.message || String(state.error)));
      }
    });

    // If already in sync, resolve immediately
    const currentState = db.cloud.syncState?.getValue();
    if (currentState?.phase === "in-sync") {
      clearTimeout(timeout);
      subscription?.unsubscribe();
      resolve();
    }
  });
}

/**
 * Subscribe to sync state changes
 */
export function subscribeSyncState(
  callback: (state: SyncState) => void,
): () => void {
  const db = getDb();

  if (!db.cloud) {
    // Call once with disabled state
    callback({ status: "disabled" });
    return () => {}; // No-op unsubscribe
  }

  const subscription = db.cloud.syncState?.subscribe((dexieState) => {
    // Convert Dexie state to our simplified state
    if (dexieState.phase === "in-sync") {
      callback({
        status: "connected",
        lastSyncTime: new Date().toISOString(),
      });
    } else if (
      dexieState.phase === "pushing" ||
      dexieState.phase === "pulling"
    ) {
      callback({
        status: "syncing",
      });
    } else if (dexieState.error) {
      callback({
        status: "error",
        error: dexieState.error.message || String(dexieState.error),
      });
    } else {
      callback({ status: "disconnected" });
    }
  });

  return () => subscription?.unsubscribe();
}
