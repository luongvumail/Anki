import { Card } from "../../store/slices/types";

export interface PendingCardUpdate {
  cardId: string;
  deckId: string;
  updates: Partial<Card>;
  timestamp: number;
}

function assertStrictEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}. ${message || ""}`);
  }
}

/**
 * Pure queue merger simulating the logic in offlineQueue
 */
function mergeOfflineQueue(
  current: PendingCardUpdate[],
  incoming: PendingCardUpdate[],
): PendingCardUpdate[] {
  const map = new Map<string, PendingCardUpdate>();
  for (const item of current) {
    map.set(item.cardId, item);
  }
  for (const item of incoming) {
    const existing = map.get(item.cardId);
    if (existing) {
      map.set(item.cardId, {
        ...existing,
        updates: { ...existing.updates, ...item.updates },
        timestamp: item.timestamp,
      });
    } else {
      map.set(item.cardId, item);
    }
  }
  return Array.from(map.values());
}

export function runOfflineQueueTests() {
  // Test 1: Add new items to empty queue
  const initial: PendingCardUpdate[] = [];
  const item1: PendingCardUpdate = {
    cardId: "card_100",
    deckId: "deck_a",
    updates: { translation: "Mèo con" },
    timestamp: 1000,
  };
  const res1 = mergeOfflineQueue(initial, [item1]);
  assertStrictEqual(res1.length, 1, "Queue should have 1 item");
  assertStrictEqual(res1[0].cardId, "card_100");
  assertStrictEqual(res1[0].updates.translation, "Mèo con");

  // Test 2: Deduplication and update merging for the same card
  const item1Updated: PendingCardUpdate = {
    cardId: "card_100",
    deckId: "deck_a",
    updates: { pinyin: "māo", lastReviewedAt: "2026-08-15T00:00:00Z" },
    timestamp: 2000,
  };
  const res2 = mergeOfflineQueue(res1, [item1Updated]);
  assertStrictEqual(res2.length, 1, "Queue must still have 1 item (deduplicated)");
  assertStrictEqual(res2[0].updates.translation, "Mèo con", "Previous updates should be preserved");
  assertStrictEqual(res2[0].updates.pinyin, "māo", "New updates should be merged");
  assertStrictEqual(res2[0].timestamp, 2000, "Timestamp should be updated to latest");

  // Test 3: Multiple cards in batch
  const item2: PendingCardUpdate = {
    cardId: "card_200",
    deckId: "deck_a",
    updates: { translation: "Chó con" },
    timestamp: 3000,
  };
  const res3 = mergeOfflineQueue(res2, [item2]);
  assertStrictEqual(res3.length, 2, "Queue should now have 2 distinct items");
}
