import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { CardData } from "../../lib/gemini";
import { Typography, Spacing, Radii, Layout, BorderWidths } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { SectionTitle } from "../ui/SectionTitle";
import { AppButton } from "../ui/AppButton";

import { Ionicons } from "@expo/vector-icons";

interface CardPreviewProps {
  cardData: CardData;
  targetDeckName?: string;
  saving?: boolean;
  saved?: boolean;
  onReGenerate?: () => void;
  onSave?: () => void;
  onRemove?: () => void;
}

export const CardPreview = React.memo(function CardPreview({
  cardData,
  targetDeckName,
  saving,
  saved,
  onReGenerate,
  onSave,
  onRemove,
}: CardPreviewProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 65,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Spacing.xl, 0],
  });

  return (
    <Animated.View style={{ opacity: slideAnim, transform: [{ translateY }] }}>
      <View style={styles.previewHeaderRow}>
        <SectionTitle>XEM TRƯỚC THẺ BÀI</SectionTitle>
        <View style={styles.previewHeaderActions}>
          <TouchableOpacity onPress={onReGenerate}>
            <Text style={[styles.reGenLink, { color: theme.blue }]}>Tạo lại</Text>
          </TouchableOpacity>
          {onRemove && (
            <TouchableOpacity
              onPress={onRemove}
              style={styles.removeBtn}
              hitSlop={Layout.hitSlopMd}
            >
              <Ionicons name="close" size={Layout.iconSm} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={[
          styles.previewCard,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            shadowOpacity: theme.isDark ? 0.3 : 0.08,
          },
        ]}
      >
        {/* Hanzi Header */}
        <View style={[styles.previewTop, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.characterBig, { color: theme.textPrimary }]}>
            {cardData.character}
          </Text>
          {cardData.traditional && cardData.traditional !== cardData.character && (
            <Text style={[styles.traditional, { color: theme.textMuted }]}>
              {cardData.traditional} (phồn thể)
            </Text>
          )}
        </View>

        {/* Data Rows */}
        <View style={styles.previewRows}>
          <InfoRow label="Pinyin" value={cardData.pinyin} color={theme.blue} />
          <InfoRow label="Nghĩa TV" value={cardData.translation} />
          {cardData.hskLevel ? (
            <InfoRow label="Cấp HSK" value={`HSK ${cardData.hskLevel}`} />
          ) : null}
          {cardData.radical ? <InfoRow label="Bộ thủ" value={cardData.radical} /> : null}
          {cardData.strokeCount ? (
            <InfoRow label="Số nét" value={`${cardData.strokeCount} nét`} />
          ) : null}
        </View>

        {/* Examples */}
        {cardData.examples && cardData.examples.length > 0 && (
          <View style={[styles.exampleSection, { borderTopColor: theme.cardBorder }]}>
            <Text style={[styles.exampleHeaderTitle, { color: theme.textMuted }]}>CÂU VÍ DỤ</Text>
            {cardData.examples.map((ex, i) => (
              <View key={i} style={[styles.exampleItem, { backgroundColor: theme.bgSoft }]}>
                <Text style={[styles.exCn, { color: theme.textPrimary }]}>{ex.chinese}</Text>
                <Text style={[styles.exPy, { color: theme.blue }]}>{ex.pinyin}</Text>
                <Text style={[styles.exVi, { color: theme.textMuted }]}>{ex.vietnamese}</Text>
              </View>
            ))}
          </View>
        )}

        {onSave && (
          <AppButton
            title={
              saving
                ? "ĐANG LƯU..."
                : saved
                  ? "ĐÃ LƯU ✓"
                  : `LƯU VÀO BỘ ${targetDeckName ? `"${targetDeckName}"` : ""}`
            }
            variant={saved ? "success" : "primary"}
            size="lg"
            disabled={saving || saved}
            onPress={onSave}
          />
        )}
      </View>
    </Animated.View>
  );
});

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: color || theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sectionTop,
    marginBottom: Spacing.sectionBottom,
  },
  previewHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  reGenLink: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.medium,
  },
  removeBtn: {
    padding: Spacing.xs / 2,
  },
  previewCard: {
    borderRadius: Radii.card,
    borderWidth: BorderWidths.thin,
    padding: Spacing.cellHorizontal,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
  },
  previewTop: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: BorderWidths.thin,
    marginBottom: Spacing.md,
  },
  characterBig: {
    fontSize: Typography.hanziCard.fontSize,
    fontWeight: Typography.weight.bold,
  },
  traditional: {
    fontSize: Typography.caption.fontSize,
    marginTop: Spacing.xs,
  },
  previewRows: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoLabel: {
    width: Layout.avatarLg * 1.6,
    fontSize: Typography.bodyMD.fontSize,
  },
  infoValue: {
    flex: 1,
    fontSize: Typography.bodyMD.fontSize,
  },
  exampleSection: {
    borderTopWidth: BorderWidths.thin,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  exampleHeaderTitle: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.xs,
    letterSpacing: 0.8,
  },
  exampleItem: {
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  exCn: {
    fontSize: Typography.bodyMD.fontSize,
    fontWeight: Typography.weight.semibold,
  },
  exPy: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
  },
  exVi: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
  },
});
