import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useHaptics } from '../../hooks/useHaptics';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { lightHaptic, successHaptic, warningHaptic } = useHaptics();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Chú ý', 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    setLoading(true);
    lightHaptic();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn.');
        }
        throw error;
      }

      successHaptic();
      // Navigation handled by onAuthStateChange in _layout.tsx
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email hoặc mật khẩu không đúng.';
      warningHaptic();
      Alert.alert('Đăng nhập thất bại', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🚀</Text>
          <Text style={styles.title}>CHINESE SRS</Text>
          <Text style={styles.subtitle}>Ghi nhớ từ vựng tiếng Trung qua âm Hán Việt</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6E6E73"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Mật khẩu"
            placeholderTextColor="#6E6E73"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              lightHaptic();
              router.push('/(auth)/reset-password');
            }}
            disabled={loading}
          >
            <Text style={styles.linkText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              lightHaptic();
              router.push('/(auth)/signup');
            }}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Chưa có tài khoản? Đăng ký</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120E2E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#AEAEB2',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  primaryButton: {
    backgroundColor: '#FF2D55',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#FF2D55',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
