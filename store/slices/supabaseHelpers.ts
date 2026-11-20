import { supabase } from "../../lib/supabase";
import { Card } from "./types";

export async function getUserIdAsync(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("User not authenticated");
  }
  return user.id;
}

/**
 * Removes undefined properties from an object so Supabase insert/update calls don't send undefined.
 */
export function sanitizeForSupabase<T extends object>(obj: T): Partial<T> {
  const clean: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  Object.keys(record).forEach((key) => {
    if (record[key] !== undefined) {
      clean[key] = record[key];
    }
  });
  return clean as Partial<T>;
}

/**
 * Centralized mapping from Partial<Card> (camelCase) to Supabase database columns (snake_case).
 * Eliminates repetitive payload code across slices and offline queue.
 */
export function mapCardUpdatesToSupabaseRow(updates: Partial<Card>): Record<string, any> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

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
  if (updates.lastReviewedAt !== undefined) {
    payload.last_reviewed_at = updates.lastReviewedAt;
  }

  return payload;
}
