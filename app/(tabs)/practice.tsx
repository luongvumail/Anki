import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore, Card } from "../../store/useStore";
import { getStreakCount } from "../../lib/reviewTracker";
import { Spacing, Radii, Typography, Layout } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { AppCard } from "../../components/ui/AppCard";
import { AppHeader } from "../../components/ui/AppHeader";
import { AppButton } from "../../components/ui/AppButton";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { SpeedMatchModal } from "../../components/practice/SpeedMatchModal";
import { SentenceBuilderModal } from "../../components/practice/SentenceBuilderModal";
import { PronunciationTrainerModal } from "../../components/practice/PronunciationTrainerModal";
import { ListeningDictationModal } from "../../components/practice/ListeningDictationModal";
import { TypingRecallModal } from "../../components/practice/TypingRecallModal";

export default function PracticeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const fetchUserProgress = useStore((s) => s.fetchUserProgress);
  const cards = useStore((s) => s.cards);
  const decks = useStore((s) => s.decks);
  const fetchDecks = useStore((s) => s.fetchDecks);
  const fetchCards = useStore((s) => s.fetchCards);

  const [streakCount, setStreakCount] = useState(0);
  const [showSpeedMatch, setShowSpeedMatch] = useState(false);
  const [showSentenceBuilder, setShowSentenceBuilder] = useState(false);
  const [showPronunciationTrainer, setShowPronunciationTrainer] = useState(false);
  const [showListeningDictation, setShowListeningDictation] = useState(false);
  const [showTypingRecall, setShowTypingRecall] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchUserProgress();
      getStreakCount().then(setStreakCount);
    }, [fetchUserProgress]),
  );

  useEffect(() => {
    if (decks.length === 0) {
      fetchDecks();
    }
  }, [fetchDecks, decks.length]);

  useEffect(() => {
    if (decks.length > 0) {
      decks.forEach((d) => {
        if (!cards[d.id]) fetchCards(d.id);
      });
    }
  }, [decks, cards, fetchCards]);

  const allCardsList = useMemo(() => {
    let list: Card[] = [];
    Object.values(cards).forEach((deckCards) => {
      list = list.concat(deckCards);
    });
    return list;
  }, [cards]);

  const handleOpenSpeedMatch = () => {
    if (allCardsList.length < 2) {
      Alert.alert(
        "Chưa đủ từ vựng",
        "Bạn cần thêm ít nhất 2 từ vựng vào bộ thẻ để chơi Game Ghép Từ.",
      );
      return;
    }
    setShowSpeedMatch(true);
  };

  const handleOpenSentenceBuilder = () => {
    const validCards = allCardsList.filter(
      (c) => c.examples && c.examples.length > 0 && c.examples[0].chinese,
    );

    if (validCards.length === 0) {
      Alert.alert(
        "Chưa có câu ví dụ",
        "Bạn cần nạp các từ vựng có câu ví dụ (bằng AI) để bắt đầu bài tập Xếp Từ Thành Câu.",
      );
      return;
    }
    setShowSentenceBuilder(true);
  };

  const handleOpenPronunciationTrainer = () => {
    if (allCardsList.length === 0) {
      Alert.alert("Chưa có từ vựng", "Bạn cần nạp từ vựng vào bộ thẻ trước khi luyện phát âm.");
      return;
    }
    setShowPronunciationTrainer(true);
  };

  const handleOpenListeningDictation = () => {
    if (allCardsList.length === 0) {
      Alert.alert(
        "Chưa có từ vựng",
        "Bạn cần nạp từ vựng vào bộ thẻ trước khi luyện nghe chép chính tả.",
      );
      return;
    }
    setShowListeningDictation(true);
  };

  const handleOpenTypingRecall = () => {
    if (allCardsList.length === 0) {
      Alert.alert(
        "Chưa có từ vựng",
        "Bạn cần nạp từ vựng vào bộ thẻ trước khi luyện gõ từ phản xạ.",
      );
      return;
    }
    setShowTypingRecall(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AppHeader streakCount={streakCount} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Practice Arcade Modes List */}
        <SectionTitle style={{ marginTop: 0 }}>CHẾ ĐỘ LUYỆN TẬP TỰ DO</SectionTitle>

        {/* Mode 1: Speed Match */}
        <AppCard style={styles.modeCard}>
          <View style={styles.modeRow}>
            <View style={[styles.modeIconTile, { backgroundColor: theme.yellowDim }]}>
              <Ionicons name="stopwatch" size={Layout.iconXl} color={theme.yellow} />
            </View>
            <View style={styles.modeTextCol}>
              <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>
                GAME GHÉP TỪ NHANH 60S
              </Text>
              <Text style={[styles.modeDesc, { color: theme.textMuted }]}>
                Ghép ngẫu nhiên Chữ Hán, Pinyin & Nghĩa tương ứng trong 60 giây. Luyện phản xạ siêu
                tốc!
              </Text>
            </View>
          </View>
          <AppButton
            title="CHƠI NGAY"
            icon={<Ionicons name="play" size={Layout.iconMd} color="#FFFFFF" />}
            variant="yellow"
            size="lg"
            onPress={handleOpenSpeedMatch}
            style={{ marginTop: Spacing.md }}
          />
        </AppCard>

        {/* Mode 2: Typing Recall Drill */}
        <AppCard style={styles.modeCard}>
          <View style={styles.modeRow}>
            <View style={[styles.modeIconTile, { backgroundColor: theme.blueDim }]}>
              <Ionicons name="keypad" size={Layout.iconXl} color={theme.blue} />
            </View>
            <View style={styles.modeTextCol}>
              <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>
                THỬ THÁCH TỰ GÕ TỪ (ACTIVE RECALL)
              </Text>
              <Text style={[styles.modeDesc, { color: theme.textMuted }]}>
                Tự nhớ và gõ lại Chữ Hán, Pinyin kèm thanh điệu hoặc từ khuyết trong câu mà không
                cần gợi ý A/B/C/D.
              </Text>
            </View>
          </View>
          <AppButton
            title="LUYỆN GÕ NGAY"
            icon={<Ionicons name="create" size={Layout.iconMd} color="#FFFFFF" />}
            variant="blue"
            size="lg"
            onPress={handleOpenTypingRecall}
            style={{ marginTop: Spacing.md }}
          />
        </AppCard>

        {/* Mode 3: Listening Dictation */}
        <AppCard style={styles.modeCard}>
          <View style={styles.modeRow}>
            <View style={[styles.modeIconTile, { backgroundColor: theme.purpleDim }]}>
              <Ionicons name="headset" size={Layout.iconXl} color={theme.purple} />
            </View>
            <View style={styles.modeTextCol}>
              <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>
                NGHE CHÉP CHÍNH TẢ (DICTATION)
              </Text>
              <Text style={[styles.modeDesc, { color: theme.textMuted }]}>
                Nghe phát âm từ vựng hoặc cả câu (tốc độ chuẩn 1.0x & chậm 0.5x) rồi gõ lại chính
                xác.
              </Text>
            </View>
          </View>
          <AppButton
            title="LUYỆN NGHE NGAY"
            icon={<Ionicons name="ear" size={Layout.iconMd} color="#FFFFFF" />}
            variant="primary"
            size="lg"
            onPress={handleOpenListeningDictation}
            style={{ marginTop: Spacing.md }}
          />
        </AppCard>

        {/* Mode 4: Sentence Builder */}
        <AppCard style={styles.modeCard}>
          <View style={styles.modeRow}>
            <View style={[styles.modeIconTile, { backgroundColor: theme.blueDim }]}>
              <Ionicons name="build" size={Layout.iconXl} color={theme.blue} />
            </View>
            <View style={styles.modeTextCol}>
              <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>XẾP TỪ THÀNH CÂU</Text>
              <Text style={[styles.modeDesc, { color: theme.textMuted }]}>
                Sắp xếp các từ bị xáo trộn thành câu Tiếng Trung hoàn chỉnh theo câu ví dụ AI.
              </Text>
            </View>
          </View>
          <AppButton
            title="BẮT ĐẦU"
            icon={<Ionicons name="play" size={Layout.iconMd} color="#FFFFFF" />}
            variant="blue"
            size="lg"
            onPress={handleOpenSentenceBuilder}
            style={{ marginTop: Spacing.md }}
          />
        </AppCard>

        {/* Mode 5: AI Pronunciation Trainer */}
        <AppCard style={styles.modeCard}>
          <View style={styles.modeRow}>
            <View style={[styles.modeIconTile, { backgroundColor: theme.greenDim }]}>
              <Ionicons name="mic" size={Layout.iconXl} color={theme.green} />
            </View>
            <View style={styles.modeTextCol}>
              <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>
                PHÒNG LUYỆN PHÁT ÂM AI (3 CHẾ ĐỘ)
              </Text>
              <Text style={[styles.modeDesc, { color: theme.textMuted }]}>
                Đọc từ có Pinyin, Ẩn Pinyin tự nhớ cách đọc, hoặc Đọc nhại cả câu (Shadowing) cùng
                AI.
              </Text>
            </View>
          </View>
          <AppButton
            title="THU ÂM NGAY"
            icon={<Ionicons name="mic-circle" size={Layout.iconMd} color="#FFFFFF" />}
            variant="success"
            size="lg"
            onPress={handleOpenPronunciationTrainer}
            style={{ marginTop: Spacing.md }}
          />
        </AppCard>
      </ScrollView>

      {/* Speed Match Modal */}
      {showSpeedMatch && (
        <SpeedMatchModal
          visible={showSpeedMatch}
          onClose={() => setShowSpeedMatch(false)}
          cards={allCardsList}
        />
      )}

      {/* Typing Recall Modal */}
      {showTypingRecall && (
        <TypingRecallModal
          visible={showTypingRecall}
          onClose={() => setShowTypingRecall(false)}
          cards={allCardsList}
        />
      )}

      {/* Listening Dictation Modal */}
      {showListeningDictation && (
        <ListeningDictationModal
          visible={showListeningDictation}
          onClose={() => setShowListeningDictation(false)}
          cards={allCardsList}
        />
      )}

      {/* Sentence Builder Modal */}
      {showSentenceBuilder && (
        <SentenceBuilderModal
          visible={showSentenceBuilder}
          onClose={() => setShowSentenceBuilder(false)}
          cards={allCardsList}
        />
      )}

      {/* AI Pronunciation Trainer Modal */}
      {showPronunciationTrainer && (
        <PronunciationTrainerModal
          visible={showPronunciationTrainer}
          onClose={() => setShowPronunciationTrainer(false)}
          cards={allCardsList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md },
  modeCard: { marginBottom: Spacing.md, padding: Spacing.md },
  modeRow: { flexDirection: "row", gap: Spacing.md, alignItems: "center" },
  modeIconTile: {
    width: Layout.btnHeightXl,
    height: Layout.btnHeightXl,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTextCol: { flex: 1 },
  modeTitle: { fontSize: Typography.titleMD.fontSize, fontWeight: Typography.weight.extraBold },
  modeDesc: { fontSize: Typography.caption.fontSize, marginTop: Spacing.xs, lineHeight: 17 },
});
