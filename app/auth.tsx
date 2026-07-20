import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
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

// ─────────────────────────────────────────────
// Reusable Input Field Component
// ─────────────────────────────────────────────
interface FieldProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
}

function Field({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "sentences",
  autoCorrect = true,
  secureTextEntry = false,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [showText, setShowText] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border.separator, Colors.accent.indigo],
  });

  return (
    <Animated.View style={[styles.fieldCard, { borderColor }]}>
      <View style={styles.fieldIconWrap}>
        <Ionicons
          name={icon}
          size={18}
          color={focused ? Colors.accent.indigoLight : Colors.text.tertiary}
        />
      </View>
      <View style={styles.fieldBody}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.quaternary}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry && !showText}
        />
      </View>
      {secureTextEntry && (
        <TouchableOpacity
          onPress={() => setShowText((v) => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.eyeBtn}
        >
          <Ionicons
            name={showText ? "eye-off-outline" : "eye-outline"}
            size={18}
            color={Colors.text.tertiary}
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

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
            paddingTop: Math.max(insets.top + 24, 64),
            paddingBottom: Math.max(insets.bottom + 24, 48),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header / Branding ── */}
        <View style={styles.header}>
          <View style={styles.glowRing}>
            <View style={styles.appIconBox}>
              <Image
                source={require("../assets/adaptive-icon.png")}
                style={styles.appIconImage}
                resizeMode="cover"
              />
            </View>
          </View>
          <Text style={styles.appName}>Anki</Text>
          <Text style={styles.tagline}>HỆ THỐNG THẺ TỪ VỰNG TIẾNG TRUNG</Text>
        </View>

        {/* ── Segmented Control ── */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === "login" && styles.segmentBtnActive]}
            onPress={() => toggleMode("login")}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, mode === "login" && styles.segmentTextActive]}>
              Đăng nhập
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === "register" && styles.segmentBtnActive]}
            onPress={() => toggleMode("register")}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, mode === "register" && styles.segmentTextActive]}>
              Tạo tài khoản
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Form Fields ── */}
        <View style={styles.formGroup}>
          {mode === "register" && (
            <Field
              label="Họ tên"
              icon="person-outline"
              placeholder="Nguyễn Văn A"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <Field
            label="Email"
            icon="mail-outline"
            placeholder="example@icloud.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Mật khẩu"
            icon="lock-closed-outline"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* ── Forgot Password ── */}
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

        {/* ── Primary Action Button ── */}
        <TouchableOpacity
          style={[styles.actionBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#F0F3F6" />
          ) : (
            <View style={styles.actionBtnContent}>
              <Text style={styles.actionBtnText}>
                {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
              </Text>
              <Ionicons
                name={mode === "login" ? "arrow-forward" : "person-add-outline"}
                size={16}
                color="#F0F3F6"
                style={{ marginLeft: 6 }}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* ── Footer toggle ── */}
        <View style={styles.footerToggle}>
          <Text style={styles.footerText}>
            {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
          </Text>
          <TouchableOpacity
            onPress={() => toggleMode(mode === "login" ? "register" : "login")}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={styles.footerLink}>
              {mode === "login" ? " Tạo ngay" : " Đăng nhập"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const SEGMENT_PADDING = 4;
const SEGMENT_RADIUS = Radii.card; // 16
const INNER_RADIUS = SEGMENT_RADIUS - SEGMENT_PADDING; // 12 — matches outer curve

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.pageMargin,
  },

  // ── Branding ──
  header: { alignItems: "center", marginBottom: Spacing.xxl + 4 },
  glowRing: {
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: Colors.accent.indigoDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(94, 106, 210, 0.30)",
    shadowColor: Colors.accent.indigo,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
  },
  appIconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: "hidden",
  },
  appIconImage: { width: 80, height: 80 },
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
    color: Colors.text.tertiary,
    textAlign: "center",
    marginTop: Spacing.xs,
    letterSpacing: 1.4,
    fontWeight: Typography.weight.semibold,
  },

  // ── Segmented Control ──
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: Colors.bg.secondary,
    borderRadius: SEGMENT_RADIUS,
    padding: SEGMENT_PADDING,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.separator,
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: INNER_RADIUS,
  },
  segmentBtnActive: {
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.strong,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentText: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.tertiary,
    fontWeight: Typography.weight.semibold,
    includeFontPadding: false,
  },
  segmentTextActive: {
    color: Colors.text.primary,
    fontWeight: Typography.weight.bold,
  },

  // ── Form Fields ──
  formGroup: {
    gap: 10,
    marginBottom: Spacing.md,
  },
  fieldCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border.separator,
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: 10,
    minHeight: 58,
  },
  fieldIconWrap: {
    width: 32,
    alignItems: "center",
    marginRight: 8,
  },
  fieldBody: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  fieldInput: {
    fontSize: Typography.text.callout.fontSize,
    color: Colors.text.primary,
    padding: 0,
  },
  eyeBtn: {
    paddingLeft: 8,
  },

  // ── Forgot ──
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: Spacing.lg + 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  forgotBtnText: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.medium,
  },

  // ── Action Button ──
  actionBtn: {
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent.indigo,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  btnDisabled: { opacity: 0.55 },
  actionBtnContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtnText: {
    color: "#F0F3F6",
    fontSize: Typography.text.callout.fontSize,
    fontWeight: Typography.weight.semibold,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },

  // ── Footer Toggle ──
  footerToggle: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.tertiary,
  },
  footerLink: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.semibold,
  },
});
