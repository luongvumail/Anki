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
import { useAppStore } from '../../services/store';
import { useHaptics } from '../../hooks/useHaptics';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { lightHaptic, successHaptic, warningHaptic } = useHaptics();

  const handleUpdate = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Chú ý', 'Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (password !== confirmPassword) {
      warningHaptic();
      Alert.alert('Chú ý', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 6) {
      warningHaptic();
      Alert.alert('Chú ý', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    lightHaptic();

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      successHaptic();
      useAppStore.getState().setPendingRecovery(false);
      Alert.alert('Thành công', 'Mật khẩu đã được cập nhật.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể cập nhật mật khẩu.';
      warningHaptic();
      Alert.alert('Thất bại', message);
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
          <Text style={styles.emoji}>🔐</Text>
          <Text style={styles.title}>Đặt lại mật khẩu</Text>
          <Text style={styles.subtitle}>Nhập mật khẩu mới cho tài khoản của bạn.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu mới"
            placeholderTextColor="#6E6E73"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Xác nhận mật khẩu mới"
            placeholderTextColor="#6E6E73"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleUpdate} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Cập nhật mật khẩu</Text>
            )}
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
});
