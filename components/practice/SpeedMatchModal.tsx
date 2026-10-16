import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../store/slices/types";
import { Spacing, Radii, Typography, Layout, triggerHaptic } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useSpeedMatch, SpeedMatchMode } from "../../hooks/useSpeedMatch";
import { AppButton } from "../ui/AppButton";

export interface SpeedMatchModalProps {
  visible: boolean;
  onClose: () => void;
  cards: Card[];
}

const MODES: { key: SpeedMatchMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "mixed", label: "Hỗn Hợp", icon: "shuffle" },
  { key: "hanzi_meaning", label: "Hán - Nghĩa", icon: "book-outline" },
  { key: "hanzi_pinyin", label: "Hán - Pinyin", icon: "text-outline" },
  { key: "pinyin_meaning", label: "Pinyin - Nghĩa", icon: "language-outline" },
];

export function SpeedMatchModal({ visible, onClose, cards }: SpeedMatchModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    timeLeft,
    score,
    highScore,
    tiles,
    selectedTile,
    isGameOver,
    mode,
    currentRoundMode,
    changeMode,
    startGame,
    handleTilePress,
  } = useSpeedMatch(visible, cards);

  if (!visible) return null;

  const currentModeLabel =
    currentRoundMode === "hanzi_pinyin"
      ? "Ghép Chữ Hán & Pinyin"
      : currentRoundMode === "pinyin_meaning"
        ? "Ghép Pinyin & Nghĩa"
        : "Ghép Chữ Hán & Nghĩa";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { paddingTop: Math.max(insets.top, Spacing.lg), backgroundColor: theme.bg },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              triggerHaptic("selection");
              onClose();
            }}
          >
            <Ionicons name="close" size={Layout.iconLg} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>GHÉP TỪ NHANH 60S</Text>
            <Text style={[styles.headerSub, { color: theme.blue }]}>{currentModeLabel}</Text>
          </View>

          <View style={{ width: Layout.avatarMd }} />
        </View>

        {/* Mode Selector Chips */}
        <View style={styles.modeChipsRow}>
          {MODES.map((m) => {
            const isSelected = mode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic("selection");
                  changeMode(m.key);
                }}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: isSelected ? theme.blue : theme.bgSoft,
                  },
                ]}
              >
                <Ionicons
                  name={m.icon}
                  size={13}
                  color={isSelected ? "#FFFFFF" : theme.textMuted}
                />
                <Text
                  style={[
                    styles.modeChipText,
                    {
                      color: isSelected ? "#FFFFFF" : theme.textMuted,
                      fontWeight: isSelected ? Typography.weight.extraBold : Typography.weight.bold,
                    },
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.bgSoft }]}>
            <Ionicons name="timer-outline" size={Layout.iconMd} color={theme.yellow} />
            <Text style={[styles.statVal, { color: theme.textPrimary }]}>{timeLeft}s</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: theme.bgSoft }]}>
            <Ionicons name="star" size={Layout.iconMd} color={theme.green} />
            <Text style={[styles.statVal, { color: theme.textPrimary }]}>{score} XP</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: theme.bgSoft }]}>
            <Ionicons name="trophy" size={Layout.iconMd} color={theme.purple} />
            <Text style={[styles.statVal, { color: theme.textPrimary }]}>Kỷ lục: {highScore}</Text>
          </View>
        </View>

        {isGameOver ? (
          /* Game Over Screen */
          <View style={styles.gameOverContainer}>
            <View style={[styles.doneIconCircle, { backgroundColor: theme.green }]}>
              <Ionicons name="trophy" size={48} color="#FFFFFF" />
            </View>
            <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>
              HOÀN THÀNH LỢT CHƠI!
            </Text>
            <Text style={[styles.scoreBigText, { color: theme.green }]}>+{score} XP</Text>
            <Text style={[styles.highScoreText, { color: theme.textMuted }]}>
              Kỷ lục cao nhất: {highScore} XP
            </Text>
            <AppButton
              title="CHƠI LẠI"
              variant="primary"
              size="lg"
              onPress={startGame}
              style={{ marginTop: Spacing.xl, width: "100%" }}
            />
          </View>
        ) : (
          /* Playing Grid Board */
          <View style={styles.boardGrid}>
            {tiles.map((tile) => {
              if (tile.matched) {
                return <View key={tile.id} style={styles.matchedTilePlaceholder} />;
              }

              const isSelected = selectedTile?.id === tile.id;

              return (
                <TouchableOpacity
                  key={tile.id}
                  activeOpacity={0.8}
                  onPress={() => handleTilePress(tile)}
                  style={[
                    styles.tile,
                    {
                      backgroundColor: isSelected ? theme.blue : theme.cardBg,
                      transform: [{ scale: isSelected ? 1.03 : 1 }],
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tileText,
                      { color: isSelected ? "#FFFFFF" : theme.textPrimary },
                    ]}
                    numberOfLines={2}
                  >
                    {tile.text}
                  </Text>
                  {tile.subText ? (
                    <Text
                      style={[
                        styles.tileSubText,
                        { color: isSelected ? "#E0F2FE" : theme.textMuted },
                      ]}
                    >
                      {tile.subText}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.xs,
  },
  closeBtn: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  headerSub: {
    fontSize: Typography.caption1.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.extraBold,
  },
  modeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.pageMargin,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  modeChipText: {
    fontSize: Typography.caption2.fontSize,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.pageMargin,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  statBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 0,
  },
  statVal: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  boardGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    alignContent: "flex-start",
    gap: Spacing.cellPadding,
  },
  tile: {
    width: "48%",
    height: 90,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
  },
  matchedTilePlaceholder: {
    width: "48%",
    height: 90,
    opacity: 0,
  },
  tileText: {
    fontSize: Typography.bodyMD.fontSize,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
  },
  tileSubText: {
    fontSize: Typography.caption1.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.semibold,
  },
  gameOverContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  doneIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  doneTitle: {
    fontSize: Typography.titleLG.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  scoreBigText: {
    fontSize: Typography.title1.fontSize,
    fontWeight: Typography.weight.extraBold,
    marginTop: Spacing.sm,
  },
  highScoreText: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.extraBold,
    marginTop: Spacing.sm,
  },
});
