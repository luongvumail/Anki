import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { Card } from "../store/slices/types";
import { mapCardUpdatesToSupabaseRow } from "../store/slices/supabaseHelpers";

const OFFLINE_QUEUE_STORAGE_KEY = "@anki_offline_card_updates_v1";

export interface PendingCardUpdate {
  cardId: string;
  deckId: string;
  updates: Partial<Card>;
  timestamp: number;
}

export async function getOfflineQueue(): Promise<PendingCardUpdate[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("[offlineQueue] Failed to load offline queue:", e);
    return [];
  }
}

export async function enqueueOfflineUpdates(items: PendingCardUpdate[]): Promise<void> {
  if (items.length === 0) return;
  try {
    const current = await getOfflineQueue();
    const map = new Map<string, PendingCardUpdate>();
    for (const item of current) {
      map.set(item.cardId, item);
    }
    for (const item of items) {
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
    const updatedQueue = Array.from(map.values());
    await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));
  } catch (e) {
    console.warn("[offlineQueue] Failed to enqueue updates:", e);
  }
}

export async function flushOfflineQueue(): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    // Concurrently process offline updates via Promise.allSettled
    const results = await Promise.allSettled(
      queue.map(async (item) => {
        const payload = mapCardUpdatesToSupabaseRow(item.updates);
        const { error } = await supabase.from("cards").update(payload).eq("id", item.cardId);
        if (error) throw error;
      }),
    );

    const remaining: PendingCardUpdate[] = [];
    results.forEach((res, index) => {
      if (res.status === "rejected") {
        remaining.push(queue[index]);
      }
    });

    if (remaining.length !== queue.length) {
      await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(remaining));
    }
  } catch (e) {
    console.warn("[offlineQueue] Error flushing offline queue:", e);
  }
}
