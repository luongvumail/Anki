import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { Card } from "../store/slices/types";

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

    const remaining: PendingCardUpdate[] = [];

    for (const item of queue) {
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        const { updates, cardId } = item;
        if (updates.character !== undefined) payload.character = updates.character;
        if (updates.traditional !== undefined) payload.traditional = updates.traditional;
        if (updates.pinyin !== undefined) payload.pinyin = updates.pinyin;
        if (updates.hanviet !== undefined) payload.hanviet = updates.hanviet;
        if (updates.translation !== undefined) payload.translation = updates.translation;
        if (updates.examples !== undefined) payload.examples = updates.examples;
        if (updates.radical !== undefined) payload.radical = updates.radical;
        if (updates.strokeCount !== undefined) payload.stroke_count = updates.strokeCount;
        if (updates.hskLevel !== undefined) payload.hsk_level = updates.hskLevel;
        if (updates.tags !== undefined) payload.tags = updates.tags;
        if (updates.srs !== undefined) {
          payload.srs = updates.srs;
          if (updates.srs.dueDate) {
            payload.srs_next_review = updates.srs.dueDate;
          }
        }
        if (updates.lastReviewedAt !== undefined) payload.last_reviewed_at = updates.lastReviewedAt;

        const { error } = await supabase.from("cards").update(payload).eq("id", cardId);
        if (error) {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length !== queue.length) {
      await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(remaining));
    }
  } catch (e) {
    console.warn("[offlineQueue] Error flushing offline queue:", e);
  }
}
