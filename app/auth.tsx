import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Pressable,
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
import { DuolingoButton } from "../components/ui/DuolingoButton";
import { DuolingoCard } from "../components/ui/DuolingoCard";

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
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <DuolingoCard style={styles.fieldCard} padding={12}>
        <View style={styles.fieldRow}>
          <View style={styles.fieldIconWrap}>
            <Ionicons
              name={icon}
              size={20}
              color={focused ? Colors.duolingo.blue : Colors.duolingo.textMuted}
            />
          </View>
          <View style={styles.fieldBody}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              ref={inputRef}
              style={styles.fieldInput}
              placeholder={placeholder}
              placeholderTextColor={Colors.duolingo.disabledText}
              value={value}
              onChangeText={onChangeText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              secureTextEntry={secureTextEntry && !showText}
            />
          </View>
          {secureTextEntry && (
            <TouchableOpacity
              onPress={() => setShowText((v) => !v)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showText ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={Colors.duolingo.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </DuolingoCard>
    </Pressable>
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
        `Hướng dẫn đặt lại mật khẩu đã được gửi tới ${email.trim()}.\nVui lòng mở hộp thư để đặt lại mật khẩu.`,
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
        {/* Header / Branding */}
        <View style={styles.header}>
          <View style={styles.appIconBox}>
            <Image
              source={require("../assets/adaptive-icon.png")}
              style={styles.appIconImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.appName}>Anki Tiếng Trung</Text>
          <Text style={styles.tagline}>HỌC TỪ VỰNG TIẾNG TRUNG THÔNG MINH</Text>
        </View>

        {/* Mode Switcher 3D Segment */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === "login" && styles.segmentBtnActive]}
            onPress={() => toggleMode("login")}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, mode === "login" && styles.segmentTextActive]}>
              ĐĂNG NHẬP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === "register" && styles.segmentBtnActive]}
            onPress={() => toggleMode("register")}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, mode === "register" && styles.segmentTextActive]}>
              TẠO TÀI KHOẢN
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
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
            placeholder="example@gmail.com"
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

        {/* Forgot Password */}
        {mode === "login" && (
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={handleForgotPassword}
            disabled={resettingPassword}
            activeOpacity={0.7}
          >
            {resettingPassword ? (
              <ActivityIndicator size="small" color={Colors.duolingo.blue} />
            ) : (
              <Text style={styles.forgotBtnText}>Quên mật khẩu?</Text>
            )}
          </TouchableOpacity>
        )}

        {/* 3D Primary Button */}
        <DuolingoButton
          title={loading ? "ĐANG XỬ LÝ..." : mode === "login" ? "ĐĂNG NHẬP ➜" : "TẠO TÀI KHOẢN ➜"}
          variant="primary"
          disabled={loading}
          onPress={handleSubmit}
          height={54}
        />

        {/* Footer Toggle */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.duolingo.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.pageMargin,
  },

  header: { alignItems: "center", marginBottom: Spacing.xl },
  appIconBox: {
    width: 80,
    height: 80,
    borderRadius: Radii.xl,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  appIconImage: { width: 80, height: 80 },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    color: Colors.duolingo.textMuted,
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 1,
    fontWeight: "700",
  },

  segmentedControl: {
    flexDirection: "row",
    backgroundColor: Colors.duolingo.bgSoftDark,
    borderRadius: Radii.lg,
    padding: 4,
    marginBottom: Spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: "#18242B",
  },
  segmentBtn: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.md,
  },
  segmentBtnActive: {
    backgroundColor: Colors.duolingo.blue,
  },
  segmentText: {
    fontSize: 13,
    color: Colors.duolingo.textMuted,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  formGroup: {
    gap: 10,
    marginBottom: Spacing.md,
  },
  fieldCard: {
    marginBottom: 0,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldIconWrap: {
    width: 32,
    alignItems: "center",
    marginRight: 8,
  },
  fieldBody: {
    flex: 1,
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 11,
    color: Colors.duolingo.textMuted,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  fieldInput: {
    fontSize: 16,
    color: "#FFFFFF",
    padding: 0,
    minHeight: 24,
    fontWeight: "600",
  },
  eyeBtn: {
    paddingLeft: 8,
  },

  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: Spacing.lg,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  forgotBtnText: {
    fontSize: 13,
    color: Colors.duolingo.blue,
    fontWeight: "700",
  },

  footerToggle: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: Colors.duolingo.textMuted,
  },
  footerLink: {
    fontSize: 14,
    color: Colors.duolingo.blue,
    fontWeight: "800",
  },
});
