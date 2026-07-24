import React, { useEffect, useState, useRef, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStore, Card } from "../../store/useStore";
import { Colors, Typography, Spacing, Radii } from "../../constants/theme";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { DuolingoCard } from "../../components/ui/DuolingoCard";
import { DuolingoHeader } from "../../components/ui/DuolingoHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";

import { getReviewHistory } from "../../lib/reviewTracker";
import { isDue } from "../../lib/srs";

interface DayActivity {
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
    const dateStr = d.toISOString().split("T")[0];
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

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const fetchDecks = useStore((s) => s.fetchDecks);
  const fetchCards = useStore((s) => s.fetchCards);
  const userId = useStore((s) => s.userId);
  const [loadingCards, setLoadingCards] = useState(true);
  const [reviewHistory, setReviewHistory] = useState<Record<string, number>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function loadAllData() {
      if (!userId) return;
      setLoadingCards(true);
      if (decks.length === 0) {
        await fetchDecks();
      }

      const currentDecks = useStore.getState().decks;
      if (currentDecks.length > 0) {
        await Promise.all(currentDecks.map((d) => fetchCards(d.id)));
      }

      const history = await getReviewHistory();
      setReviewHistory(history);

      setLoadingCards(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }

    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const allCardsList = useMemo(() => {
    let list: Card[] = [];
    Object.values(cards).forEach((deckCards) => {
      list = list.concat(deckCards);
    });
    return list;
  }, [cards]);

  const totalCardsCount = allCardsList.length;

  const dueCount = useMemo(() => {
    return allCardsList.filter((c) => isDue(c.srs)).length;
  }, [allCardsList]);

  const learnedCount = useMemo(() => {
    return allCardsList.filter((c) => c.srs && c.srs.repetitions > 0).length;
  }, [allCardsList]);

  const newCardsCount = useMemo(() => {
    return allCardsList.filter((c) => !c.srs || c.srs.repetitions === 0).length;
  }, [allCardsList]);

  const retentionRatePct = useMemo(() => {
    if (totalCardsCount === 0) return 0;
    return Math.round((learnedCount / totalCardsCount) * 100);
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

  return (
    <View style={styles.container}>
      <DuolingoHeader courseName="Anki" streakCount={1} gemsCount={150} heartsCount={5} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loadingCards ? (
          <ActivityIndicator
            size="small"
            color={Colors.duolingo.green}
            style={{ marginVertical: 40 }}
          />
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Main Trophy Progress Card */}
            <DuolingoCard style={styles.trophyBanner}>
              <View style={styles.trophyRow}>
                <View style={styles.trophyIconBox}>
                  <Ionicons name="trophy" size={26} color={Colors.duolingo.yellow} />
                </View>
                <View style={styles.trophyText}>
                  <Text style={styles.trophyTitle}>TIẾN ĐỘ THUỘC TỪ VỰNG</Text>
                  <Text style={styles.trophySub}>
                    Bạn đã ghi nhớ thuộc {retentionRatePct}% tổng từ vựng
                  </Text>
                </View>
              </View>

              <ProgressBar
                progress={retentionRatePct / 100}
                height={12}
                fillColor={Colors.duolingo.green}
                style={{ marginTop: Spacing.sm }}
              />
            </DuolingoCard>

            {/* Overview Stat Cards Grid */}
            <View style={styles.statsGrid}>
              <DuolingoCard style={styles.statCardItem}>
                <Ionicons name="flame" size={22} color={Colors.duolingo.yellow} />
                <Text style={styles.statCardVal}>1 Ngày</Text>
                <Text style={styles.statCardLabel}>Chuỗi Học Liên Tục</Text>
              </DuolingoCard>

              <DuolingoCard style={styles.statCardItem}>
                <Ionicons name="checkmark-done-circle" size={22} color={Colors.duolingo.green} />
                <Text style={styles.statCardVal}>{learnedCount} từ</Text>
                <Text style={styles.statCardLabel}>Đã Ghi Nhớ Thuộc</Text>
              </DuolingoCard>

              <DuolingoCard style={styles.statCardItem}>
                <Ionicons name="flash" size={22} color={Colors.duolingo.yellow} />
                <Text style={styles.statCardVal}>{dueCount} từ</Text>
                <Text style={styles.statCardLabel}>Cần Ôn Tập Ngay</Text>
              </DuolingoCard>

              <DuolingoCard style={styles.statCardItem}>
                <Ionicons name="sparkles" size={22} color={Colors.duolingo.purple} />
                <Text style={styles.statCardVal}>{newCardsCount} từ</Text>
                <Text style={styles.statCardLabel}>Từ Mới Chưa Học</Text>
              </DuolingoCard>
            </View>

            {/* Weekly Activity Bar Chart */}
            <SectionTitle>HOẠT ĐỘNG 7 NGÀY GẦN ĐÂY</SectionTitle>

            <DuolingoCard style={styles.chartCard}>
              <View style={styles.chartRow}>
                {weeklyActivity.map((day) => {
                  const heightPct = Math.min(100, Math.max(12, (day.count / maxWeeklyCount) * 100));

                  return (
                    <View key={day.dateStr} style={styles.barColumn}>
                      <Text style={styles.barCountText}>{day.count > 0 ? day.count : ""}</Text>

                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${heightPct}%`,
                              backgroundColor: day.isToday
                                ? Colors.duolingo.blue
                                : day.count > 0
                                  ? Colors.duolingo.green
                                  : Colors.duolingo.cardBottom,
                            },
                          ]}
                        />
                      </View>

                      <Text style={[styles.barDayText, day.isToday && styles.barDayToday]}>
                        {day.dayName}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </DuolingoCard>

            {/* Comprehensive User Guide & SRS Mechanics Section */}
            <SectionTitle>HƯỚNG DẪN SỬ DỤNG & NGUYÊN LÝ HOẠT ĐỘNG</SectionTitle>

            <View style={styles.guideListContainer}>
              {/* Step 1: SRS Mechanics */}
              <DuolingoCard style={styles.guideCard}>
                <View style={styles.guideHeaderRow}>
                  <View style={[styles.guideIconTile, { backgroundColor: Colors.duolingo.blueDim }]}>
                    <Ionicons name="hardware-chip" size={22} color={Colors.duolingo.blue} />
                  </View>
                  <View style={styles.guideHeaderText}>
                    <Text style={styles.guideTitle}>1. Nguyên lý Thuật toán Trí nhớ Ngắt quãng (SRS)</Text>
                    <Text style={styles.guideSub}>Khắc phục Đường cong Quên Ebbinghaus (Forgetting Curve)</Text>
                  </View>
                </View>
                <Text style={styles.guideDesc}>
                  Bộ não con người sẽ quên 70% kiến thức mới sau 24h. Thuật toán SuperMemo-2 (SRS) tự động tính toán điểm rơi trí nhớ (~85%) để nhắc ôn tập đúng thời điểm sắp quên. Mỗi lần ôn tập thành công, khoảng cách ôn sẽ nhân lên (1 ngày ➔ 6 ngày ➔ 15 ngày ➔ 1 tháng), đưa từ vựng vào trí nhớ dài hạn vĩnh viễn.
                </Text>
              </DuolingoCard>

              {/* Step 2: Swipe Gestures */}
              <DuolingoCard style={styles.guideCard}>
                <View style={styles.guideHeaderRow}>
                  <View style={[styles.guideIconTile, { backgroundColor: Colors.duolingo.greenDark + "33" }]}>
                    <Ionicons name="hand-left" size={22} color={Colors.duolingo.green} />
                  </View>
                  <View style={styles.guideHeaderText}>
                    <Text style={styles.guideTitle}>2. Chế độ Flashcard (Tự Đánh Giá Nhanh)</Text>
                    <Text style={styles.guideSub}>Lật mặt thẻ & tự chấm điểm mức độ thuộc từ</Text>
                  </View>
                </View>
                <View style={styles.gestureGuideList}>
                  <View style={styles.gestureRowItem}>
                    <Ionicons name="radio-button-on" size={16} color={Colors.duolingo.blue} />
                    <Text style={styles.gestureText}><Text style={{ fontWeight: "800", color: "#FFFFFF" }}>Chạm vào thẻ:</Text> Mở đáp án Pinyin, dịch nghĩa & câu ví dụ</Text>
                  </View>
                  <View style={styles.gestureRowItem}>
                    <Ionicons name="arrow-back-circle" size={16} color={Colors.duolingo.red} />
                    <Text style={styles.gestureText}><Text style={{ fontWeight: "800", color: Colors.duolingo.red }}>Vuốt Trái:</Text> Quên từ — Ôn lại ngay trong buổi học</Text>
                  </View>
                  <View style={styles.gestureRowItem}>
                    <Ionicons name="arrow-up-circle" size={16} color={Colors.duolingo.yellow} />
                    <Text style={styles.gestureText}><Text style={{ fontWeight: "800", color: Colors.duolingo.yellow }}>Vuốt Lên:</Text> Từ khó — Giảm khoảng cách ngày ôn</Text>
                  </View>
                  <View style={styles.gestureRowItem}>
                    <Ionicons name="arrow-forward-circle" size={16} color={Colors.duolingo.green} />
                    <Text style={styles.gestureText}><Text style={{ fontWeight: "800", color: Colors.duolingo.green }}>Vuốt Phải:</Text> Thuộc lòng — Giãn thời gian ôn xa hơn</Text>
                  </View>
                </View>
              </DuolingoCard>

              {/* Step 3: Quiz Mode - Alternative Objective Testing */}
              <DuolingoCard style={styles.guideCard}>
                <View style={styles.guideHeaderRow}>
                  <View style={[styles.guideIconTile, { backgroundColor: Colors.duolingo.blueDim }]}>
                    <Ionicons name="checkmark-done-circle" size={22} color={Colors.duolingo.blue} />
                  </View>
                  <View style={styles.guideHeaderText}>
                    <Text style={styles.guideTitle}>3. Chế độ Trắc nghiệm (3 Dạng Bài Tập Khách Quan)</Text>
                    <Text style={styles.guideSub}>Phương pháp thay thế Chống Đánh Giá Cảm Tính</Text>
                  </View>
                </View>
                <Text style={styles.guideDesc}>
                  Máy tính tự động chấm điểm khách quan 100% qua 3 dạng bài tập thích ứng theo tiến trình thuộc từ:
                </Text>
                <View style={styles.gestureGuideList}>
                  <View style={styles.gestureRowItem}>
                    <Ionicons name="text" size={16} color={Colors.duolingo.blue} />
                    <Text style={styles.gestureText}><Text style={{ fontWeight: "800", color: "#FFFFFF" }}>Chọn Pinyin & Thanh điệu:</Text> Phân biệt 4 thanh điệu Hán ngữ</Text>
                  </View>
                  <View style={styles.gestureRowItem}>
                    <Ionicons name="volume-high" size={16} color={Colors.duolingo.yellow} />
                    <Text style={styles.gestureText}><Text style={{ fontWeight: "800", color: Colors.duolingo.yellow }}>Nghe & Chọn Chữ Hán:</Text> Nghe phát âm giọng chuẩn để chọn Hán tự</Text>
                  </View>
                  <View style={styles.gestureRowItem}>
                    <Ionicons name="create" size={16} color={Colors.duolingo.green} />
                    <Text style={styles.gestureText}><Text style={{ fontWeight: "800", color: Colors.duolingo.green }}>Điền từ Ngữ cảnh (Cloze):</Text> Điền Hán tự đúng vào ô trống câu ví dụ</Text>
                  </View>
                </View>
              </DuolingoCard>

              {/* Step 4: AI Card Generator */}
              <DuolingoCard style={styles.guideCard}>
                <View style={styles.guideHeaderRow}>
                  <View style={[styles.guideIconTile, { backgroundColor: Colors.duolingo.purpleDark + "33" }]}>
                    <Ionicons name="sparkles" size={22} color={Colors.duolingo.purple} />
                  </View>
                  <View style={styles.guideHeaderText}>
                    <Text style={styles.guideTitle}>4. Nạp từ vựng tự động bằng AI</Text>
                    <Text style={styles.guideSub}>Công nghệ Gemini AI Hán-Việt chuyên sâu</Text>
                  </View>
                </View>
                <Text style={styles.guideDesc}>
                  Vào tab <Text style={{ fontWeight: "800", color: Colors.duolingo.purple }}>"Thêm thẻ"</Text> hoặc bấm nút AI trong chi tiết bộ thẻ ➔ Nhập chữ Hán ➔ Trí tuệ nhân tạo sẽ tự động phân tích Pinyin, dịch nghĩa, cấu tạo Bộ thủ Hán-Việt và đặt câu ví dụ chuẩn xác.
                </Text>
              </DuolingoCard>

              {/* Step 5: Daily Learning Streak */}
              <DuolingoCard style={styles.guideCard}>
                <View style={styles.guideHeaderRow}>
                  <View style={[styles.guideIconTile, { backgroundColor: Colors.duolingo.yellowDark + "33" }]}>
                    <Ionicons name="flame" size={22} color={Colors.duolingo.yellow} />
                  </View>
                  <View style={styles.guideHeaderText}>
                    <Text style={styles.guideTitle}>5. Duy trì Chuỗi Học (Streak)</Text>
                    <Text style={styles.guideSub}>Học ít nhất 5 phút mỗi ngày</Text>
                  </View>
                </View>
                <Text style={styles.guideDesc}>
                  Chỉ cần hoàn thành bài ôn tập hàng ngày để giữ ngọn lửa <Text style={{ fontWeight: "800", color: Colors.duolingo.yellow }}>Streak 🔥</Text>. Thói quen học đều đặn mỗi ngày quan trọng hơn học dồn dập!
                </Text>
              </DuolingoCard>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.duolingo.bg },
  scrollContent: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md },

  trophyBanner: { padding: Spacing.md, marginBottom: Spacing.md },
  trophyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  trophyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.duolingo.blueDim,
    alignItems: "center",
    justifyContent: "center",
  },
  trophyText: { flex: 1 },
  trophyTitle: {
    fontSize: 12,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
  trophySub: { fontSize: 13, fontWeight: Typography.weight.semibold, color: Colors.duolingo.textMuted, marginTop: 2 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: Spacing.md },
  statCardItem: { width: "48%", padding: Spacing.md, alignItems: "flex-start" },
  statCardIcon: { fontSize: 20 },
  statCardVal: {
    fontSize: 20,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
    marginTop: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: Colors.duolingo.textMuted,
    marginTop: 2,
    fontWeight: Typography.weight.semibold,
  },

  chartCard: { padding: Spacing.md, marginBottom: Spacing.md },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 130,
  },
  barColumn: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" },
  barCountText: { fontSize: 10, color: Colors.duolingo.textMuted, fontWeight: "700", marginBottom: 4 },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: Colors.duolingo.cardBottom,
    borderRadius: 7,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: { width: "100%", borderRadius: 7 },
  barDayText: { fontSize: 12, color: Colors.duolingo.textMuted, marginTop: 6, fontWeight: "600" },
  barDayToday: { color: "#FFFFFF", fontWeight: "800" },

  badgeGrid: { flexDirection: "row", gap: 10, marginTop: Spacing.xs },
  badgeCard: { flex: 1, padding: Spacing.md, alignItems: "center" },
  badgeEmoji: { fontSize: 28, marginBottom: 4 },
  badgeName: { fontSize: 13, fontWeight: Typography.weight.bold, color: "#FFFFFF" },
  badgeSub: { fontSize: 10, color: Colors.duolingo.textMuted, marginTop: 2 },

  leaderboardCard: { padding: Spacing.md, marginBottom: Spacing.md },
  leaderboardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: Spacing.md },
  leagueTitle: { fontSize: 12, fontWeight: "800", color: Colors.duolingo.yellow, letterSpacing: 0.5 },
  leaderboardList: { gap: 8 },
  leaderItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: Colors.duolingo.bg,
    borderRadius: Radii.md,
    gap: 10,
  },
  leaderItemUser: {
    backgroundColor: Colors.duolingo.greenLight,
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.greenDark,
  },
  rankNum: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", width: 28, textAlign: "center" },
  leaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.duolingo.cardBg,
    alignItems: "center",
    justifyContent: "center",
  },
  leaderName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  leaderNameUser: { color: "#FFFFFF", fontWeight: "800" },
  leaderXp: { fontSize: 14, fontWeight: "800", color: Colors.duolingo.yellow },

  /* User Guide & SRS Mechanics Styles */
  guideListContainer: { gap: 12, marginBottom: Spacing.md },
  guideCard: { padding: Spacing.md },
  guideHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  guideIconTile: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  guideHeaderText: { flex: 1 },
  guideTitle: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  guideSub: { fontSize: 12, fontWeight: "600", color: Colors.duolingo.textMuted, marginTop: 2 },
  guideDesc: { fontSize: 13, color: Colors.duolingo.textMuted, lineHeight: 18, fontWeight: "500" },
  gestureGuideList: { gap: 8, marginTop: 4 },
  gestureRowItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  gestureText: { fontSize: 13, color: Colors.duolingo.textMuted, flex: 1 },
});
