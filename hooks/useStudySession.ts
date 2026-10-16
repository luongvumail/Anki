import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, StudySession } from "../store/slices/types";
import { useStore } from "../store/useStore";
import { APP_CONFIG } from "../constants/config";
import {
  isDue,
  calculateQuizSRS,
  createDefaultSRSState,
  getModeResponseThresholds,
  selectCardsByFSRSPriority,
} from "../lib/srs";
import { generateQuizQuestion, QuizQuestion, shuffleArray } from "../lib/quizGenerator";
import { recordReviewToday } from "../lib/reviewTracker";

export type SessionStage = "loading" | "empty" | "preview" | "validation" | "repair" | "done";

export function useStudySession(deckId: string) {
  const cardsMap = useStore((s) => s.cards);
  const fetchCards = useStore((s) => s.fetchCards);
  const batchUpdateCards = useStore((s) => s.batchUpdateCards);
  const pendingUpdatesRef = useRef<{ cardId: string; deckId: string; updates: Partial<Card> }[]>(
    [],
  );

  const isCardsLoaded = Boolean(deckId && cardsMap[deckId] !== undefined);
  const deckCards: Card[] = useMemo(
    () => (deckId ? cardsMap[deckId] || [] : []),
    [cardsMap, deckId],
  );

  const [session, setSession] = useState<StudySession | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [targetCards, setTargetCards] = useState<Card[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [stage, setStage] = useState<SessionStage>("loading");
  const [isLoading, setIsLoading] = useState(true);
  const [revealedCardIds, setRevealedCardIds] = useState<Set<string>>(new Set());

  const [missedOrSlowCardIds, setMissedOrSlowCardIds] = useState<string[]>([]);
  const [repairQuestions, setRepairQuestions] = useState<QuizQuestion[]>([]);
  const [repairIndex, setRepairIndex] = useState(0);

  const ratedCardIdsInSession = useRef<Set<string>>(new Set());
  const initializedDeckIdRef = useRef<string | null>(null);

  // Automatically fetch cards for deck if not already cached in store
  useEffect(() => {
    if (!deckId) return;
    if (cardsMap[deckId] === undefined) {
      fetchCards(deckId);
    }
  }, [deckId, cardsMap, fetchCards]);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      if (!active) return;

      if (!deckId) {
        setIsLoading(false);
        setStage("empty");
        return;
      }

      // Wait until cards have been fetched from backend / store
      if (!isCardsLoaded) {
        setIsLoading(true);
        return;
      }

      if (initializedDeckIdRef.current === deckId && session !== null) {
        return;
      }

      const due = deckCards.filter((c: Card) => isDue(c.srs));
      const pool = due.length > 0 ? due : deckCards;
      const sessionCards = selectCardsByFSRSPriority(pool, APP_CONFIG.MAX_SESSION_CARDS);

      if (sessionCards.length === 0) {
        setIsLoading(false);
        setStage("empty");
        return;
      }

      const generated: QuizQuestion[] = [];
      sessionCards.forEach((c: Card, idx: number) => {
        const q = generateQuizQuestion(c, deckCards, undefined, undefined, idx);
        if (q) generated.push(q);
      });

      if (generated.length === 0) {
        setIsLoading(false);
        setStage("empty");
        return;
      }

      // Đảo lộn xộn thứ tự câu hỏi và queue ngay từ đầu (khác thứ tự tuần tự trong preview targetCards)
      const shuffledQuestions = shuffleArray(generated);
      const shuffledQueueCards = shuffledQuestions.map((q) => q.card);

      initializedDeckIdRef.current = deckId;
      setTargetCards(sessionCards); // Giữ nguyên danh sách xem thẻ ban đầu
      setQuestions(shuffledQuestions); // Xáo trộn thứ tự bài tập quiz
      setPreviewIndex(0);
      setRevealedCardIds(new Set());
      setSession({
        deckId,
        queue: shuffledQueueCards,
        currentIndex: 0,
        reviewedCount: 0,
        correctCount: 0,
        startTime: new Date(),
      });
      setIsLoading(false);
      setStage("preview");
      ratedCardIdsInSession.current.clear();
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
      if (pendingUpdatesRef.current.length > 0) {
        batchUpdateCards(pendingUpdatesRef.current);
        pendingUpdatesRef.current = [];
      }
    };
  }, [batchUpdateCards, deckId, deckCards, isCardsLoaded, session]);

  const markCardRevealed = useCallback((cardId: string) => {
    setRevealedCardIds((prev) => {
      if (prev.has(cardId)) return prev;
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
  }, []);

  const handleNextPreview = useCallback(() => {
    setPreviewIndex((prev) => {
      const next = prev + 1;
      if (next >= targetCards.length) {
        // Tái xáo trộn câu hỏi một lần nữa khi chuyển từ Preview sang Validation để đảm bảo độ bất ngờ cao nhất
        setQuestions((currentQs) => {
          const reshuffled = shuffleArray(currentQs);
          setSession((s) =>
            s ? { ...s, queue: reshuffled.map((q) => q.card), currentIndex: 0 } : null,
          );
          return reshuffled;
        });
        setStage("validation");
        return prev;
      }
      return next;
    });
  }, [targetCards.length]);

  const handlePrevPreview = useCallback(() => {
    setPreviewIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleQuizAnswer = useCallback(
    async (
      isCorrect: boolean,
      responseTimeMs: number,
      weakTag?: "pinyin" | "character" | "meaning",
    ) => {
      if (!session) return;
      const currIdx = session.currentIndex;
      if (currIdx >= questions.length) return;

      const currentQuestion = questions[currIdx];
      const card = currentQuestion.card;
      const interactionMode = currentQuestion.interactionMode || "choice";
      const { slowMs } = getModeResponseThresholds(interactionMode);

      const isFirstAttempt = !ratedCardIdsInSession.current.has(card.id);

      // FSRS Long-term Scheduling Rule:
      // Only update long-term FSRS memory state on the FIRST recall attempt of the card in this session.
      // Subsequent intra-session retries reinforce short-term recall without distorting FSRS stability or overwriting a first-try rating.
      if (isFirstAttempt) {
        ratedCardIdsInSession.current.add(card.id);
        const latestCardInStore =
          (useStore.getState().cards[deckId] || []).find((c) => c.id === card.id) || card;
        const currentSRS = latestCardInStore.srs || createDefaultSRSState();
        const { newSRS } = calculateQuizSRS(
          isCorrect,
          false,
          responseTimeMs,
          currentSRS,
          interactionMode,
        );
        const nowIso = new Date().toISOString();

        // Optimistically update card in Zustand store instantly
        useStore.setState((s) => ({
          cards: {
            ...s.cards,
            [deckId]: (s.cards[deckId] || []).map((c) =>
              c.id === card.id ? { ...c, srs: newSRS, lastReviewedAt: nowIso } : c,
            ),
          },
        }));

        const existingIdx = pendingUpdatesRef.current.findIndex((p) => p.cardId === card.id);
        const updateItem = {
          cardId: card.id,
          deckId,
          updates: { srs: newSRS, lastReviewedAt: nowIso },
        };
        if (existingIdx >= 0) {
          pendingUpdatesRef.current[existingIdx] = updateItem;
        } else {
          pendingUpdatesRef.current.push(updateItem);
        }
      }

      await recordReviewToday();

      const isSlowOrMissed = !isCorrect || responseTimeMs > slowMs;
      let nextMissed = missedOrSlowCardIds;
      if (isSlowOrMissed) {
        nextMissed = missedOrSlowCardIds.includes(card.id)
          ? missedOrSlowCardIds
          : [...missedOrSlowCardIds, card.id];
        setMissedOrSlowCardIds(nextMissed);
      }

      const updatedQuestions = [...questions];

      if (!isCorrect) {
        const nextQuestion = generateQuizQuestion(card, deckCards, undefined, weakTag, currIdx + 1);
        if (nextQuestion) {
          const targetPos = Math.min(updatedQuestions.length, currIdx + 3);
          updatedQuestions.splice(targetPos, 0, nextQuestion);
        }
      }

      const nextIndex = currIdx + 1;
      const newCorrect = isCorrect ? session.correctCount + 1 : session.correctCount;
      const newReviewed = session.reviewedCount + 1;

      setQuestions(updatedQuestions);

      setSession((prev) =>
        prev
          ? {
              ...prev,
              queue: updatedQuestions.map((q) => q.card),
              currentIndex: nextIndex,
              correctCount: newCorrect,
              reviewedCount: newReviewed,
            }
          : null,
      );

      if (nextIndex >= updatedQuestions.length) {
        const uniqueWeakMap = new Map<string, Card>();
        for (const c of targetCards) {
          if (nextMissed.includes(c.id)) {
            uniqueWeakMap.set(c.id, c);
          }
        }
        const weakCards = Array.from(uniqueWeakMap.values());

        if (weakCards.length > 0) {
          const fastChoiceTypes = [
            "meaning_choice",
            "pinyin_choice",
            "hanzi_from_meaning",
            "hanzi_from_pinyin",
          ] as const;
          const repairQs = weakCards
            .map((c: Card, idx: number) =>
              generateQuizQuestion(c, deckCards, fastChoiceTypes[idx % fastChoiceTypes.length]),
            )
            .filter((q): q is QuizQuestion => q !== null);
          if (repairQs.length > 0) {
            setRepairQuestions(shuffleArray(repairQs));
            setRepairIndex(0);
            setStage("repair");
          } else {
            setStage("done");
            if (pendingUpdatesRef.current.length > 0) {
              await batchUpdateCards(pendingUpdatesRef.current);
              pendingUpdatesRef.current = [];
            }
          }
        } else {
          setStage("done");
          if (pendingUpdatesRef.current.length > 0) {
            await batchUpdateCards(pendingUpdatesRef.current);
            pendingUpdatesRef.current = [];
          }
        }
      }
    },
    [batchUpdateCards, deckCards, deckId, missedOrSlowCardIds, questions, session, targetCards],
  );

  const handleRepairAnswer = useCallback(async () => {
    await recordReviewToday();

    const nextIdx = repairIndex + 1;
    setRepairIndex(nextIdx);
    if (nextIdx >= repairQuestions.length) {
      setStage("done");
      if (pendingUpdatesRef.current.length > 0) {
        await batchUpdateCards(pendingUpdatesRef.current);
        pendingUpdatesRef.current = [];
      }
    }
  }, [batchUpdateCards, repairIndex, repairQuestions.length]);

  return {
    stage,
    session,
    isLoading,
    deckCards,
    previewIndex,
    targetCards,
    questions,
    repairQuestions,
    repairIndex,
    revealedCardIds,
    markCardRevealed,
    handleNextPreview,
    handlePrevPreview,
    handleQuizAnswer,
    handleRepairAnswer,
  };
}
