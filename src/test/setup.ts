// Setup file for all tests
import { vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

// Set up fake IndexedDB
global.indexedDB = new IDBFactory();

// Mark as test environment to disable Dexie Cloud
process.env.NODE_ENV = "test";
process.env.VITEST = "true";

// Suppress console errors in tests by default
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
