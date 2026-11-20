import { useState, useRef, useMemo, useCallback } from "react";
import { Animated } from "react-native";
import { useStore } from "../store/useStore";
import { getReviewHistory, getStreakCount, getLocalDateString } from "../lib/reviewTracker";
import { computeLearnedCount, computeDueCount, computeNewCount } from "../lib/deckUtils";
import { getLevelInfo } from "../store/slices/userProgressSlice";

export interface DayActivity {
  dateStr: string;
  dayName: string;
  count: number;
  isToday: boolean;
}

function getLast7Days(): DayActivity[] {
  const result: DayActivity[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const dayName = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
    result.push({
      dateStr,
      dayName,
      count: 0,
      isToday: i === 0,
    });
  }
  return result;
}

export function useStats() {
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const fetchDecks = useStore((s) => s.fetchDecks);
  const userId = useStore((s) => s.userId);
  const xp = useStore((s) => s.xp || 0);

  const [loadingCards, setLoadingCards] = useState(decks.length === 0);
  const [reviewHistory, setReviewHistory] = useState<Record<string, number>>({});
  const [streakCount, setStreakCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const loadAllData = useCallback(async () => {
    if (!userId) return;

    if (decks.length === 0) setLoadingCards(true);
    await fetchDecks();

    const history = await getReviewHistory();
    const streak = await getStreakCount();
    setReviewHistory(history);
    setStreakCount(streak);
    setLoadingCards(false);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [userId, decks.length, fetchDecks, fadeAnim]);

  // Aggregate total stats directly from decks and cached cards
  const totalCardsCount = useMemo(() => {
    return decks.reduce((sum, d) => {
      const deckCards = cards[d.id];
      return sum + (deckCards ? deckCards.length : d.cardCount || 0);
    }, 0);
  }, [decks, cards]);

  const dueCount = useMemo(() => {
    return decks.reduce((sum, d) => {
      const deckCards = cards[d.id];
      return sum + (deckCards ? computeDueCount(deckCards) : d.dueCount || 0);
    }, 0);
  }, [decks, cards]);

  const newCardsCount = useMemo(() => {
    return decks.reduce((sum, d) => {
      const deckCards = cards[d.id];
      return sum + (deckCards ? computeNewCount(deckCards) : d.newCount || 0);
    }, 0);
  }, [decks, cards]);

  const learnedCount = useMemo(() => {
    return decks.reduce((sum, d) => {
      const deckCards = cards[d.id];
      if (deckCards && deckCards.length > 0) {
        return sum + computeLearnedCount(deckCards);
      }
      const notDue = Math.max(0, (d.cardCount || 0) - (d.dueCount || 0));
      return sum + notDue;
    }, 0);
  }, [decks, cards]);

  const retentionRatePct = useMemo(() => {
    if (totalCardsCount === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((learnedCount / totalCardsCount) * 100)));
  }, [totalCardsCount, learnedCount]);

  const weeklyActivity = useMemo(() => {
    const days = getLast7Days();
    days.forEach((day) => {
      day.count = reviewHistory[day.dateStr] || 0;
    });
    return days;
  }, [reviewHistory]);

  const maxWeeklyCount = useMemo(() => {
    const max = Math.max(...weeklyActivity.map((d) => d.count));
    return max > 0 ? max : 1;
  }, [weeklyActivity]);

  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);

  return {
    loadingCards,
    streakCount,
    fadeAnim,
    levelInfo,
    xp,
    retentionRatePct,
    learnedCount,
    dueCount,
    newCardsCount,
    weeklyActivity,
    maxWeeklyCount,
    loadAllData,
  };
}
