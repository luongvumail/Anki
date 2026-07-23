import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../store/useStore";
import { generateQuizQuestion, QuizQuestion } from "../../lib/quizGenerator";
import { isDue, calculateSRS, createDefaultSRSState, SRSGrade, SRS_GRADES } from "../../lib/srs";
import { recordReviewToday } from "../../lib/reviewTracker";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { FlashcardView, ShortTermGrade } from "../../components/study/FlashcardView";
import { QuizCardView } from "../../components/study/QuizCardView";
import { SessionDoneScreen } from "../../components/study/SessionDoneScreen";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StudySession, Card } from "../../store/slices/types";

type StudyMode = "flashcard" | "quiz";

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const updateCard = useStore((s) => s.updateCard);
  const fetchCards = useStore((s) => s.fetchCards);
  const isLoading = useStore((s) => s.isLoading);

  const deck = useMemo(() => decks.find((d) => d.id === deckId), [decks, deckId]);
  const deckCards = useMemo(() => cards[deckId] || [], [cards, deckId]);

  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [session, setSession] = useState<StudySession | null>(null);
  const [targetCards, setTargetCards] = useState<Card[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (deckId) fetchCards(deckId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  useEffect(() => {
    if (deckCards.length > 0 && !session && !isDone) {
      const dueCards = deckCards.filter((c) => isDue(c.srs));
      const chosenCards = dueCards.length > 0 ? dueCards : deckCards.slice(0, 15);
      const generatedQuestions: QuizQuestion[] = chosenCards
        .map((c) => generateQuizQuestion(c, deckCards))
        .filter((q): q is QuizQuestion => q !== null);

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetCards(chosenCards);
      setQuestions(generatedQuestions);
      setSession({
        deckId,
        queue: chosenCards,
        currentIndex: 0,
        correctCount: 0,
        reviewedCount: 0,
        startTime: new Date(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckCards, deckId, isDone]);

  // Handle Flashcard Short-Term Memory Rating (Quên, Khó, Dễ)
  const handleFlashcardGrade = async (grade: ShortTermGrade) => {
    if (!session || targetCards.length === 0) return;

    const currentCard = targetCards[session.currentIndex];
    const srsGrade: SRSGrade = grade === "again" ? SRS_GRADES.AGAIN : grade === "hard" ? SRS_GRADES.HARD : SRS_GRADES.EASY;
    const currentSRS = currentCard.srs || createDefaultSRSState();
    const newSRS = calculateSRS(srsGrade, currentSRS);

    await updateCard(currentCard.id, deckId, { srs: newSRS });
    await recordReviewToday();

    let updatedQueue = [...targetCards];
    const currIdx = session.currentIndex;

    if (grade === "again") {
      // QUÊN: Re-insert card after 2 cards in session queue so it repeats soon!
      const targetPos = Math.min(updatedQueue.length, currIdx + 2);
      updatedQueue.splice(targetPos, 0, currentCard);
    } else if (grade === "hard") {
      // KHÓ: Re-insert card after 4 cards in session queue so it repeats later!
      const targetPos = Math.min(updatedQueue.length, currIdx + 4);
      updatedQueue.splice(targetPos, 0, currentCard);
    }
    // DỄ: Card is mastered & passes for this session! No re-insertion.

    const nextIndex = currIdx + 1;
    const isCorrect = grade === "easy";
    const newCorrect = isCorrect ? session.correctCount + 1 : session.correctCount;
    const newReviewed = session.reviewedCount + 1;

    setTargetCards(updatedQueue);

    if (nextIndex >= updatedQueue.length) {
      setSession({
        ...session,
        queue: updatedQueue,
        currentIndex: nextIndex,
        correctCount: newCorrect,
        reviewedCount: newReviewed,
      });
      setIsDone(true);
    } else {
      setSession({
        ...session,
        queue: updatedQueue,
        currentIndex: nextIndex,
        correctCount: newCorrect,
        reviewedCount: newReviewed,
      });
    }
  };

  // Handle Quiz Answer (Correct / Wrong - Short-Term Memory Re-study Loop)
  const handleQuizAnswer = async (isCorrect: boolean) => {
    if (!session || questions.length === 0) return;

    const currIdx = session.currentIndex;
    const currentQuestion = questions[currIdx];
    const card = currentQuestion.card;

    const grade: SRSGrade = isCorrect ? SRS_GRADES.GOOD : SRS_GRADES.AGAIN;
    const currentSRS = card.srs || createDefaultSRSState();
    const newSRS = calculateSRS(grade, currentSRS);

    await updateCard(card.id, deckId, { srs: newSRS });
    await recordReviewToday();

    let updatedQuestions = [...questions];
    if (!isCorrect) {
      // Short-Term Memory Queue: Re-insert wrong Quiz question 3 slots later so the user must get it right!
      const targetPos = Math.min(updatedQuestions.length, currIdx + 3);
      updatedQuestions.splice(targetPos, 0, currentQuestion);
    }

    const nextIndex = currIdx + 1;
    const newCorrect = isCorrect ? session.correctCount + 1 : session.correctCount;
    const newReviewed = session.reviewedCount + 1;

    setQuestions(updatedQuestions);

    if (nextIndex >= updatedQuestions.length) {
      setSession({
        ...session,
        currentIndex: nextIndex,
        correctCount: newCorrect,
        reviewedCount: newReviewed,
      });
      setIsDone(true);
    } else {
      setSession({
        ...session,
        currentIndex: nextIndex,
        correctCount: newCorrect,
        reviewedCount: newReviewed,
      });
    }
  };

  const handleSwitchMode = (newMode: StudyMode) => {
    triggerHaptic("selection");
    if (newMode === "quiz" && targetCards.length > 0) {
      // Sync Quiz questions with targetCards (including any re-study queue items from Flashcard mode)
      const syncedQuestions = targetCards
        .map((c) => generateQuizQuestion(c, deckCards))
        .filter((q): q is QuizQuestion => q !== null);
      if (syncedQuestions.length > 0) {
        setQuestions(syncedQuestions);
      }
    }
    setMode(newMode);
  };

  const endSession = async () => {
    if (session && session.reviewedCount > 0) {
      await recordReviewToday();
    }
  };

  if (isLoading || (!session && !isDone)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.duolingo.green} />
      </View>
    );
  }

  const totalCount = mode === "flashcard" ? targetCards.length : questions.length;

  if (isDone || !session || session.currentIndex >= totalCount) {
    return (
      <SessionDoneScreen
        session={
          session || {
            deckId,
            queue: [],
            currentIndex: 0,
            correctCount: 0,
            reviewedCount: 0,
            startTime: new Date(),
          }
        }
        onDone={() => {
          triggerHaptic("medium");
          router.back();
        }}
      />
    );
  }

  const progress = (session.currentIndex + 1) / totalCount;
  const currentCard = targetCards[session.currentIndex];
  const currentQuestion = questions[session.currentIndex];

  return (
    <View style={styles.container}>
      {/* Duolingo Style Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 44) }]}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic("light");
            endSession();
            router.back();
          }}
          style={styles.closeHeaderBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={26} color={Colors.duolingo.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <ProgressBar
            progress={progress}
            height={16}
            fillColor={Colors.duolingo.green}
          />
        </View>
      </View>

      {/* Short Term Memory Study Mode Segment Bar */}
      <View style={styles.modeSegmentBar}>
        <TouchableOpacity
          style={[
            styles.modeSegmentBtn,
            mode === "flashcard" && styles.modeSegmentBtnActive,
          ]}
          onPress={() => handleSwitchMode("flashcard")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.modeSegmentText,
              mode === "flashcard" && styles.modeSegmentTextActive,
            ]}
          >
            🎴 LẬT THẺ FLASHCARD
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeSegmentBtn,
            mode === "quiz" && styles.modeSegmentBtnActive,
          ]}
          onPress={() => handleSwitchMode("quiz")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.modeSegmentText,
              mode === "quiz" && styles.modeSegmentTextActive,
            ]}
          >
            🎯 BÀI TẬP QUIZ
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN VIEW CONTENT */}
      {mode === "flashcard" ? (
        currentCard ? (
          <FlashcardView
            key={`fc-${currentCard.id}-${session.currentIndex}`}
            card={currentCard}
            onGrade={handleFlashcardGrade}
          />
        ) : null
      ) : (
        currentQuestion ? (
          <QuizCardView
            key={`qz-${currentQuestion.card.id}-${session.currentIndex}`}
            question={currentQuestion}
            onAnswer={handleQuizAnswer}
          />
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.duolingo.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.duolingo.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.duolingo.bg,
    gap: 8,
  },
  closeHeaderBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
  },
  heartsBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.duolingo.cardBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.cardBottom,
  },
  heartsText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.duolingo.red,
  },

  modeSegmentBar: {
    flexDirection: "row",
    backgroundColor: Colors.duolingo.cardBg,
    marginHorizontal: Spacing.pageMargin,
    marginTop: 6,
    marginBottom: 4,
    borderRadius: Radii.full,
    padding: 3,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.cardBottom,
  },
  modeSegmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.full,
  },
  modeSegmentBtnActive: {
    backgroundColor: Colors.duolingo.blue,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.blueDark,
  },
  modeSegmentText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.duolingo.textMuted,
    letterSpacing: 0.5,
  },
  modeSegmentTextActive: {
    color: "#FFFFFF",
  },
});
