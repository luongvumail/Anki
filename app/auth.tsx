import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { getAuthErrorMessage } from "../lib/errorHandler";
import {
  Colors,
  Typography,
  Spacing,
  Radii,
  triggerHaptic,
} from "../constants/theme";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      triggerHaptic("warning");
      Alert.alert("Thông báo", "Vui lòng nhập địa chỉ email và mật khẩu.");
      return;
    }
    setLoading(true);
    triggerHaptic("medium");
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        triggerHaptic("success");
      } else {
        if (!name.trim()) {
          triggerHaptic("warning");
          Alert.alert("Thông báo", "Vui lòng nhập họ tên của bạn.");
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await updateProfile(cred.user, { displayName: name.trim() });
        triggerHaptic("success");
      }
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Lỗi xác thực", getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      triggerHaptic("warning");
      Alert.alert(
        "Quên mật khẩu",
        'Vui lòng nhập địa chỉ email của bạn vào ô Email rồi bấm lại "Quên mật khẩu?".',
      );
      return;
    }
    setResettingPassword(true);
    triggerHaptic("medium");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      triggerHaptic("success");
      Alert.alert(
        "Đã gửi email khôi phục",
        `Hướng dẫn đặt lại mật khẩu đã được gửi tới ${email.trim()}.\nVui lòng mở ứng dụng Mail / Hộp thư (bao gồm cả thư rác) để đặt lại mật khẩu.`,
      );
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Không thể gửi email", getAuthErrorMessage(e));
    } finally {
      setResettingPassword(false);
    }
  };

  const toggleMode = (newMode: "login" | "register") => {
    triggerHaptic("selection");
    setMode(newMode);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top + 20, 60),
            paddingBottom: Math.max(insets.bottom + 20, 40),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Vector Icon */}
        <View style={styles.header}>
          <View style={styles.appIconBox}>
            <Ionicons
              name="journal-outline"
              size={30}
              color={Colors.accent.indigoLight}
            />
          </View>
          <Text style={styles.appName}>Anki</Text>
          <Text style={styles.tagline}>
            INTELLIGENT CHINESE FLASHCARD SYSTEM
          </Text>
        </View>

        {/* Linear Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              mode === "login" && styles.segmentBtnActive,
            ]}
            onPress={() => toggleMode("login")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                mode === "login" && styles.segmentTextActive,
              ]}
            >
              SIGN IN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              mode === "register" && styles.segmentBtnActive,
            ]}
            onPress={() => toggleMode("register")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                mode === "register" && styles.segmentTextActive,
              ]}
            >
              CREATE ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inset Grouped Form */}
        <View style={styles.groupedForm}>
          {mode === "register" && (
            <View style={styles.formRow}>
              <Text style={styles.fieldLabel}>Họ tên</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Nguyễn Văn A"
                placeholderTextColor={Colors.text.tertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View
            style={[styles.formRow, mode === "register" && styles.rowBorderTop]}
          >
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="example@icloud.com"
              placeholderTextColor={Colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.formRow, styles.rowBorderTop]}>
            <Text style={styles.fieldLabel}>Mật khẩu</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="••••••••"
              placeholderTextColor={Colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        {/* Forgot Password Link in Login Mode */}
        {mode === "login" && (
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={handleForgotPassword}
            disabled={resettingPassword}
            activeOpacity={0.7}
          >
            {resettingPassword ? (
              <ActivityIndicator size="small" color={Colors.accent.indigoLight} />
            ) : (
              <Text style={styles.forgotBtnText}>Quên mật khẩu?</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.actionBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#F3F4F6" />
          ) : (
            <Text style={styles.actionBtnText}>
              {mode === "login" ? "CONTINUE TO ANKI" : "REGISTER ACCOUNT"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.pageMargin,
  },

  header: { alignItems: "center", marginBottom: Spacing.xxl },
  appIconBox: {
    width: 60,
    height: 60,
    borderRadius: Radii.card,
    backgroundColor: Colors.bg.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: Typography.text.title1.fontSize,
    lineHeight: Typography.text.title1.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: Typography.text.caption2.fontSize,
    lineHeight: Typography.text.caption2.lineHeight,
    color: Colors.text.secondary,
    textAlign: "center",
    marginTop: Spacing.xs,
    letterSpacing: 1.2,
    fontWeight: Typography.weight.semibold,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: 3,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  segmentBtn: {
    flex: 1,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.sm,
  },
  segmentBtnActive: {
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  segmentText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.8,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  segmentTextActive: {
    color: Colors.text.primary,
    fontWeight: Typography.weight.bold,
  },

  // Inset Grouped Form
  groupedForm: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: "hidden",
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
  },
  fieldLabel: {
    width: 100,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  fieldInput: {
    flex: 1,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
  },

  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: Spacing.lg,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  forgotBtnText: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.medium,
  },

  actionBtn: {
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.accent.indigoLight,
  },
  btnDisabled: { opacity: 0.6 },
  actionBtnText: {
    color: "#F3F4F6",
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
