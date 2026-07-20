import { Card } from "../store/slices/types";
import { isDue } from "./srs";

/**
 * Calculates total cards due for study today (both new cards + review due cards).
 */
export function computeDueCount(cards: Card[]): number {
  if (!cards || cards.length === 0) return 0;
  return cards.filter((c) => isDue(c.srs)).length;
}

/**
 * Calculates new card count (0 repetitions, never reviewed before).
 */
export function computeNewCount(cards: Card[]): number {
  if (!cards || cards.length === 0) return 0;
  return cards.filter((c) => !c.srs || c.srs.repetitions === 0).length;
}

/**
 * Calculates review cards count (already learned at least once, due for review today).
 */
export function computeReviewDueCount(cards: Card[]): number {
  if (!cards || cards.length === 0) return 0;
  return cards.filter((c) => c.srs && c.srs.repetitions > 0 && isDue(c.srs)).length;
}

/**
 * Calculates learned / mastered cards count (reviewed at least once and NOT due today).
 */
export function computeLearnedCount(cards: Card[]): number {
  if (!cards || cards.length === 0) return 0;
  return cards.filter((c) => c.srs && c.srs.repetitions > 0 && !isDue(c.srs)).length;
}

/**
 * Returns user-facing mastery percentage (0-100) for a deck or card set.
 */
export function getDeckMasteryPct(cardCount: number, dueCount: number, cards?: Card[]): number {
  if (cards && cards.length > 0) {
    const total = cards.length;
    if (total <= 0) return 0;
    const learned = computeLearnedCount(cards);
    return Math.round((learned / total) * 100);
  }
  if (cardCount <= 0) return 0;
  const learned = Math.max(0, cardCount - dueCount);
  return Math.round((learned / cardCount) * 100);
}
