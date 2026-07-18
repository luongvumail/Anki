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
    if (!email || !password) {
      triggerHaptic("warning");
      Alert.alert("Thông báo", "Vui lòng nhập email và mật khẩu");
      return;
    }
    setLoading(true);
    triggerHaptic("medium");
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        triggerHaptic("success");
      } else {
        if (!name) {
          triggerHaptic("warning");
          Alert.alert("Thông báo", "Vui lòng nhập họ tên");
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(cred.user, { displayName: name });
        triggerHaptic("success");
      }
    } catch (e: any) {
      triggerHaptic("error");
      const msg =
        e.code === "auth/user-not-found"
          ? "Không tìm thấy tài khoản"
          : e.code === "auth/wrong-password"
            ? "Mật khẩu không đúng"
            : e.code === "auth/email-already-in-use"
              ? "Email đã được sử dụng"
              : e.code === "auth/weak-password"
                ? "Mật khẩu cần ít nhất 6 ký tự"
                : `Lỗi (${e.code || "unknown"}): ${e.message || "Vui lòng kiểm tra lại"}`;
      Alert.alert("Lỗi xác thực", msg);
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
      const msg =
        e.code === "auth/user-not-found"
          ? "Không tìm thấy tài khoản với email này."
          : e.code === "auth/invalid-email"
            ? "Địa chỉ email không hợp lệ."
            : e.message;
      Alert.alert("Không thể gửi email", msg);
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
              size={32}
              color={Colors.accent.blue}
            />
          </View>
          <Text style={styles.appName}>HanViet Anki</Text>
          <Text style={styles.tagline}>
            Ghi nhớ từ vựng Tiếng Trung thông minh
          </Text>
        </View>

        {/* iOS Segmented Control */}
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
              Đăng nhập
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
              Tạo tài khoản
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
              <ActivityIndicator size="small" color={Colors.accent.blue} />
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
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.actionBtnText}>
              {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
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
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.bg.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: Colors.border.separator,
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: Typography.text.title1.fontSize,
    lineHeight: Typography.text.title1.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  tagline: {
    fontSize: Typography.text.subhead.fontSize,
    lineHeight: Typography.text.subhead.lineHeight,
    color: Colors.text.secondary,
    textAlign: "center",
    marginTop: Spacing.xs,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: Colors.bg.secondary,
    borderRadius: 9,
    padding: 2,
    marginBottom: Spacing.xl,
  },
  segmentBtn: {
    flex: 1,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  segmentBtnActive: {
    backgroundColor: Colors.accent.gray4,
  },
  segmentText: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  segmentTextActive: {
    color: Colors.text.primary,
    fontWeight: Typography.weight.semibold,
  },

  // Inset Grouped Form
  groupedForm: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  rowBorderTop: {
    borderTopWidth: 0.5,
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
    color: Colors.accent.blue,
    fontWeight: Typography.weight.medium,
  },

  actionBtn: {
    backgroundColor: Colors.accent.blue,
    borderRadius: Radii.card,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  btnDisabled: { opacity: 0.6 },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  footerNote: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
    textAlign: "center",
    marginTop: Spacing.xxl,
  },
});
