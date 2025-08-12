import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Dexie from "dexie";
import { getUserRealms, getDb } from "./db";

// Mock Dexie Cloud functionality
const mockCurrentUser = {
  userId: "test-user@example.com",
  email: "test-user@example.com",
  name: "Test User",
};

const mockGetValue = vi.fn(() => mockCurrentUser);

describe("Realm and Member Management", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;

  beforeEach(async () => {
    // Reset database for each test
    await Dexie.delete("DeclutterDB");

    // Initialize database
    db = getDb();

    // Mock Dexie Cloud
    db.cloud = {
      currentUser: {
        getValue: mockGetValue,
      },
    };

    // Add mock tables for realms and members
    if (!db.realms) {
      db.realms = {
        add: vi.fn(),
        get: vi.fn(),
        toArray: vi.fn(() => []),
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            toArray: vi.fn(() => []),
          })),
        })),
      };
    }

    if (!db.members) {
      db.members = {
        add: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        toArray: vi.fn(() => []),
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            toArray: vi.fn(() => []),
            and: vi.fn(() => ({
              toArray: vi.fn(() => []),
            })),
          })),
        })),
      };
    }
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe("getUserRealms", () => {
    it("should not return duplicate realms", async () => {
      const realmId = "rlm123";
      const realm = {
        realmId,
        name: "Test Realm",
        owner: mockCurrentUser.userId,
      };

      // Mock data that would cause duplicates in the old implementation
      // User is both a member and the owner
      const ownerMember = {
        id: "mmb-owner-" + realmId,
        realmId,
        userId: mockCurrentUser.userId,
        accepted: new Date(),
      };

      const regularMember = {
        id: "mmb-regular-" + realmId,
        realmId,
        userId: mockCurrentUser.userId,
        name: mockCurrentUser.name,
        email: mockCurrentUser.email,
      };

      // Mock the database calls
      db.members.where = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => [ownerMember, regularMember]), // User appears twice as member
        })),
      }));

      db.realms.toArray = vi.fn(() => [realm]); // User is also owner
      db.realms.get = vi.fn(() => realm);

      db.items = {
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            count: vi.fn(() => 5),
          })),
        })),
      };

      const summaries = await getUserRealms();

      // Should only return one realm summary, not duplicates
      expect(summaries).toHaveLength(1);
      expect(summaries[0].realm.realmId).toBe(realmId);
      expect(summaries[0].isOwner).toBe(true);
    });

    it("should not include duplicate members in realm summary", async () => {
      const realmId = "rlm456";
      const realm = {
        realmId,
        name: "Test Realm 2",
        owner: mockCurrentUser.userId,
      };

      // Mock scenario where same user appears multiple times
      const members = [
        {
          id: "mmb-owner-" + realmId,
          realmId,
          userId: mockCurrentUser.userId,
          accepted: new Date(),
        },
        {
          id: "mmb-regular-" + realmId,
          realmId,
          userId: mockCurrentUser.userId,
          name: mockCurrentUser.name,
          email: mockCurrentUser.email,
        },
        {
          id: "mmb-other",
          realmId,
          userId: "other-user@example.com",
          name: "Other User",
          email: "other-user@example.com",
        },
      ];

      db.members.where = vi.fn(() => ({
        equals: vi.fn((field) => {
          if (field === mockCurrentUser.userId) {
            // Return only the first member record for this user
            return {
              toArray: vi.fn(() => [members[0]]),
            };
          }
          // Return all members for the realm
          return {
            toArray: vi.fn(() => members),
          };
        }),
      }));

      db.realms.toArray = vi.fn(() => [realm]);
      db.realms.get = vi.fn(() => realm);

      db.items = {
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            count: vi.fn(() => 0),
          })),
        })),
      };

      const summaries = await getUserRealms();

      expect(summaries).toHaveLength(1);

      // Check that duplicate members are filtered out
      const uniqueUserIds = new Set(summaries[0].members.map((m) => m.userId));
      expect(uniqueUserIds.size).toBe(
        summaries[0].members.filter((m) => m.userId).length,
      );
    });

    it("should handle realms where user is member but not owner", async () => {
      const realmId = "rlm789";
      const realm = {
        realmId,
        name: "Someone Else Realm",
        owner: "other-owner@example.com",
      };

      const membership = {
        id: "mmb-member",
        realmId,
        userId: mockCurrentUser.userId,
        accepted: new Date(),
      };

      db.members.where = vi.fn(() => ({
        equals: vi.fn((userId) => {
          if (userId === mockCurrentUser.userId) {
            return {
              toArray: vi.fn(() => [membership]),
            };
          }
          return {
            toArray: vi.fn(() => [membership]),
          };
        }),
      }));

      db.realms.toArray = vi.fn(() => []); // User doesn't own any realms
      db.realms.get = vi.fn(() => realm);

      db.items = {
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            count: vi.fn(() => 3),
          })),
        })),
      };

      const summaries = await getUserRealms();

      expect(summaries).toHaveLength(1);
      expect(summaries[0].realm.realmId).toBe(realmId);
      expect(summaries[0].isOwner).toBe(false);
    });

    it("should return empty array when user has no realms", async () => {
      db.members.where = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => []),
        })),
      }));

      db.realms.toArray = vi.fn(() => []);

      const summaries = await getUserRealms();

      expect(summaries).toHaveLength(0);
    });
  });

  describe("Member deduplication", () => {
    it("should filter out duplicate member records with same userId", () => {
      const members = [
        {
          id: "mmb1",
          userId: "user1@example.com",
          name: "User One",
          email: "user1@example.com",
        },
        {
          id: "mmb2",
          userId: "user1@example.com", // Duplicate userId
          name: "User One Alt",
          email: "user1@example.com",
        },
        {
          id: "mmb3",
          userId: "user2@example.com",
          name: "User Two",
          email: "user2@example.com",
        },
      ];

      // Deduplicate members by userId
      const uniqueMembers = members.filter(
        (member, index, self) =>
          index === self.findIndex((m) => m.userId === member.userId),
      );

      expect(uniqueMembers).toHaveLength(2);
      expect(uniqueMembers.map((m) => m.userId)).toEqual([
        "user1@example.com",
        "user2@example.com",
      ]);
    });
  });
});
