import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Animated } from "react-native";
import { CardData } from "../../lib/gemini";
import { Colors, Typography, Spacing, Radii } from "../../constants/theme";
import { SectionTitle } from "../ui/SectionTitle";
import { AnimatedButton } from "../ui/AnimatedButton";

interface CardPreviewProps {
  cardData: CardData;
  saving: boolean;
  onReGenerate: () => void;
  onSave: () => void;
}

export function CardPreview({ cardData, saving, onReGenerate, onSave }: CardPreviewProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 65,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <Animated.View style={{ opacity: slideAnim, transform: [{ translateY }] }}>
      <View style={styles.previewHeaderRow}>
        <SectionTitle style={{ marginBottom: 0, marginTop: 0, marginLeft: 0 }}>
          XEM TRƯỚC THẺ BÀI
        </SectionTitle>
        <TouchableOpacity onPress={onReGenerate}>
          <Text style={styles.reGenLink}>Tạo lại ↻</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewCard}>
        {/* Hanzi Header */}
        <View style={styles.previewTop}>
          {cardData.hskLevel ? (
            <View style={styles.hskBadge}>
              <Text style={styles.hskText}>HSK {cardData.hskLevel}</Text>
            </View>
          ) : null}
          <Text style={styles.characterBig}>{cardData.character}</Text>
          {cardData.traditional && cardData.traditional !== cardData.character && (
            <Text style={styles.traditional}>{cardData.traditional} (phồn thể)</Text>
          )}
        </View>

        {/* Data Rows */}
        <View style={styles.previewRows}>
          <InfoRow label="Pinyin" value={cardData.pinyin} color={Colors.neon.cyan} />
          <InfoRow label="Hán Việt" value={cardData.hanviet} />
          <InfoRow label="Nghĩa TV" value={cardData.translation} />
          {cardData.radical ? <InfoRow label="Bộ thủ" value={cardData.radical} /> : null}
          {cardData.strokeCount ? (
            <InfoRow label="Số nét" value={`${cardData.strokeCount} nét`} />
          ) : null}
        </View>

        {/* Examples */}
        {cardData.examples && cardData.examples.length > 0 && (
          <View style={styles.exampleSection}>
            <Text style={styles.exampleHeaderTitle}>CÂU VÍ DỤ</Text>
            {cardData.examples.map((ex, i) => (
              <View key={i} style={styles.exampleItem}>
                <Text style={styles.exCn}>{ex.chinese}</Text>
                <Text style={styles.exPy}>{ex.pinyin}</Text>
                <Text style={styles.exVi}>{ex.vietnamese}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Save Button */}
        <AnimatedButton
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving}
          activeScale={0.97}
        >
          {saving ? (
            <ActivityIndicator color="#F3F4F6" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Lưu vào bộ thẻ</Text>
          )}
        </AnimatedButton>
      </View>
    </Animated.View>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[styles.infoValue, color ? { color, fontWeight: Typography.weight.semibold } : null]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sectionTop,
    marginBottom: Spacing.sectionBottom,
    paddingHorizontal: 4,
  },
  reGenLink: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.medium,
  },
  previewCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  previewTop: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.separator,
    marginBottom: Spacing.md,
  },
  hskBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  hskText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
  },
  characterBig: {
    fontSize: Typography.hanzi.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  traditional: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  previewRows: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoLabel: {
    width: 80,
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.secondary,
  },
  infoValue: {
    flex: 1,
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.primary,
  },
  exampleSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  exampleHeaderTitle: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.xs,
    letterSpacing: 0.8,
  },
  exampleItem: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  exCn: {
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  exPy: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.neon.cyan,
    marginTop: 2,
  },
  exVi: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.accent.indigoLight,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: "#F3F4F6",
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
