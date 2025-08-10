### Issues and recommendations (prioritized)

- SSR safety: top-level Dexie instance may run server-side in Next.js and fail under SSR.
  - Problem: `export const db = new DeclutterDatabase();` executes at import time. If imported in server code, IndexedDB isn’t available.
  - Fix (preferred): lazy client-only init.
    ```ts
    // src/lib/db.ts
    let dbInstance: DeclutterDatabase | null = null;
    export function getDb(): DeclutterDatabase {
      if (!dbInstance) {
        if (typeof window === "undefined") {
          throw new Error("DeclutterDatabase must be used in the browser");
        }
        dbInstance = new DeclutterDatabase();
      }
      return dbInstance;
    }
    // …use getDb().items everywhere instead of db.items
    ```
  - Alternative: mark the module client-only with `'use client'` and ensure only client code imports it.
- Update semantics: `updateItem` can unintentionally overwrite `createdAt` and other immutable fields if passed in `updates`.
  - Cite:

    ```119:136:src/lib/db.ts
    const updated = await db.items
      .filter((item) => {
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
      .reverse()
      .sortBy("updatedAt");
    ```

    ```52:69:src/lib/db.ts
    export async function updateItem(
      id: string,
      updates: Partial<DeclutterItem>,
    ): Promise<void> {
      try {
        const updateData = {
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        const updated = await db.items.update(id, updateData);
        if (updated === 0) {
          throw new Error("Item not found");
        }
      } catch (error) {
        console.error("Error updating item:", error);
        throw new Error("Failed to update item");
      }
    }
    ```

  - Fix: sanitize updates.
    ```ts
    const {
      id: _ignoreId,
      createdAt: _ignoreCreatedAt,
      updatedAt: _ignoreUpdatedAt,
      ...safeUpdates
    } = updates;
    const updateData = { ...safeUpdates, updatedAt: new Date().toISOString() };
    ```
  - Optional stricter approach: fetch existing item and merge selectively to guarantee preservation of immutable fields.

- Sorting correctness with filters/search: `reverse().sortBy('updatedAt')` is inconsistent; `sortBy` sorts ascending in memory and ignores `reverse()` on the collection. You likely wanted descending.
  - Affects: `searchItems`, `filterItemsByAction`, `filterItemsByCategory`.
  - Cite:
    ```149:154:src/lib/db.ts
    return await db.items
      .where("recommendedAction")
      .equals(action)
      .reverse()
      .sortBy("updatedAt");
    ```
  - Fix: remove `.reverse()` and reverse the array after `sortBy`, or prefer DB-level ordering via compound indexes (see next).
    ```ts
    const results = await db.items
      .where("category")
      .equals(category)
      .sortBy("updatedAt");
    return results.reverse();
    ```
- Add compound indexes for common filtered sorts to achieve true DB-level performance:
  - Use `[recommendedAction+updatedAt]` and `[category+updatedAt]`.
  - Then query with `.where('[recommendedAction+updatedAt]').between([action, Dexie.minKey], [action, Dexie.maxKey]).reverse().toArray()` for fast descending order without in-memory sort.
  - Update schema:
    ```ts
    this.version(2).stores({
      items:
        "id, createdAt, updatedAt, recommendedAction, category, name, [recommendedAction+updatedAt], [category+updatedAt]",
    });
    ```
- Misleading naming in `checkDatabaseHealth` result:
  - Variable holds item count, but property is named `tableCount`.
  - Cite:

    ```368:383:src/lib/db.ts
    export async function checkDatabaseHealth(): Promise<{
      connected: boolean;
      version: number;
      tableCount: number;
    }> {
      try {
        const connected = db.isOpen();
        const version = db.verno;
        const itemCount = await db.items.count();

        return {
          connected,
          version,
          tableCount: itemCount,
        };
    ```

  - Fix: rename to `itemCount`. Optionally add a simple read/write check for diagnostics (e.g., put/get a temp record in a transaction in dev).

- `getDatabaseStats` could integrate browser’s quota estimate to align with the spec’s storage-quota approach.
  - Suggest: combine `navigator.storage.estimate()` with the blob-size approximation to present both “quota” and “estimated usage”. Or rename to make clear it’s an estimate.
- `optimizeDatabase` is destructive by design; add a warning in the JSDoc and ensure it’s only used in dev. Optionally guard behind `process.env.NODE_ENV !== 'production'`.
- Type hygiene and safety nits:
  - Consider `condition` and `recommendedAction` enums in separate types to reuse across code and UIs.
  - The `description` is required; consistent with spec. If you foresee empty descriptions initially, you might want to default to `""` in creator paths.
- CSV export concerns:
  - The function returns formatted strings; CSV injection protection is slated for the exporter (per spec). Ensure the downstream CSV utility applies sanitization for strings starting with =, +, -, @. No change needed here, just ensure consistency when you implement `utils/export.ts`.

### Minor suggestions

- Consider using Dexie transactions for sequences like clear+bulkAdd in `optimizeDatabase`.
- Add a simple “ping” read in `checkDatabaseHealth` to ensure the DB is actually usable, not just “open”.
- Consider a helper to consistently format yen for both CSV and UI (e.g., `Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })`), though plain toLocaleString is fine for MVP.
