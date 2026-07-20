import { Card } from "../store/slices/types";
import { isDue } from "./srs";

/**
 * Calculates due count on-the-fly for a given list of cards in a deck.
 */
export function computeDueCount(cards: Card[]): number {
  if (!cards || cards.length === 0) return 0;
  return cards.filter((c) => isDue(c.srs)).length;
}

/**
 * Calculates new card count (0 repetitions) for a given list of cards in a deck.
 */
export function computeNewCount(cards: Card[]): number {
  if (!cards || cards.length === 0) return 0;
  return cards.filter((c) => !c.srs || c.srs.repetitions === 0).length;
}

/**
 * Returns user-facing mastery percentage (0-100) for a deck or card set.
 */
export function getDeckMasteryPct(cardCount: number, dueCount: number, cards?: Card[]): number {
  if (cardCount <= 0) return 0;
  if (cards && cards.length > 0) {
    const learned = cards.filter((c) => c.srs && c.srs.repetitions > 0 && !isDue(c.srs)).length;
    return Math.round((learned / cards.length) * 100);
  }
  const learned = Math.max(0, cardCount - dueCount);
  return Math.round((learned / cardCount) * 100);
}
