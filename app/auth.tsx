import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Colors, Typography, Spacing, Radii } from '../constants/theme';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name) { Alert.alert('Lỗi', 'Vui lòng nhập tên của bạn'); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
      }
    } catch (e: any) {
      console.error('Firebase Auth Error Details:', e);
      const msg = e.code === 'auth/user-not-found' ? 'Không tìm thấy tài khoản'
        : e.code === 'auth/wrong-password' ? 'Mật khẩu không đúng'
        : e.code === 'auth/email-already-in-use' ? 'Email đã được sử dụng'
        : e.code === 'auth/weak-password' ? 'Mật khẩu cần ít nhất 6 ký tự'
        : e.code === 'auth/operation-not-allowed' ? 'Tính năng Email/Password chưa được bật trên Firebase Console'
        : e.code === 'auth/invalid-api-key' ? 'API Key Firebase không hợp lệ trong file .env'
        : `Lỗi (${e.code || 'unknown'}): ${e.message || 'Vui lòng kiểm tra lại cấu hình'}`;
      Alert.alert('Lỗi đăng nhập/đăng ký', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo area */}
        <View style={styles.header}>
          <Text style={styles.logo}>漢</Text>
          <Text style={styles.appName}>HanViet</Text>
          <Text style={styles.tagline}>Học từ vựng Tiếng Trung theo cách thông minh</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>

          {mode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nguyễn Văn A"
                placeholderTextColor={Colors.text.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor={Colors.text.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.text.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
              <Text style={styles.switchLink}>
                {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  header: { alignItems: 'center', marginBottom: Spacing.xxxl },
  logo: {
    fontSize: 80,
    color: Colors.accent.purple,
    fontWeight: Typography.weight.bold,
    textShadowColor: Colors.accent.purpleLight,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  appName: {
    fontSize: Typography.text.xxxl,
    fontWeight: Typography.weight.heavy,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  tagline: {
    fontSize: Typography.text.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  title: {
    fontSize: Typography.text.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xl,
  },
  inputGroup: { marginBottom: Spacing.lg },
  label: {
    fontSize: Typography.text.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.weight.medium,
  },
  input: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.text.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  btn: {
    backgroundColor: Colors.accent.purple,
    borderRadius: Radii.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#fff',
    fontSize: Typography.text.md,
    fontWeight: Typography.weight.semibold,
  },
  switchRow: { marginTop: Spacing.lg, alignItems: 'center' },
  switchText: { color: Colors.text.secondary, fontSize: Typography.text.sm },
  switchLink: { color: Colors.accent.purpleLight, fontWeight: Typography.weight.semibold },
});
