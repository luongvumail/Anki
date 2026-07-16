# Email/Password Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Google OAuth with full Email/Password auth (Sign Up, Login, Forgot/Reset Password) using Supabase built-in email auth with deep-link handling.

**Architecture:** Supabase's `signInWithPassword` / `signUp` / `resetPasswordForEmail` / `updateUser` handle the auth backend. Expo's `expo-linking` intercepts email confirmation and password-reset links that redirect to `anki://auth/callback`. A new `src/services/auth.ts` module centralizes deep-link parsing and session setup. The existing Zustand store (`userId`) and root layout auth gate remain unchanged.

**Tech Stack:** Expo 54, Supabase JS SDK v2, expo-linking, expo-router v6, TypeScript

**Spec:** `docs/superpowers/specs/2026-07-16-email-auth-design.md`

## Global Constraints

- All UI text in Vietnamese (error messages, labels, buttons, alerts)
- Follow existing dark theme style: background `#120E2E`, card `rgba(255,255,255,0.08)`, accent `#FF2D55`
- Keep existing code patterns: `useHaptics()` for tactile feedback, `Alert.alert()` for errors
- No new npm dependencies — all needed packages are already installed
- Scheme `anki` already configured in `app.json`
- TypeScript strict mode

---

### Task 1: Auth deep-link service (`src/services/auth.ts`)

**Files:**

- Create: `src/services/auth.ts`
- Modify: `src/app/_layout.tsx` (add deep-link listener)

**Interfaces:**

- Consumes: `supabase` from `./supabase`, `Linking` from `expo-linking`, `router` from `expo-router`
- Produces: `handleAuthDeepLink(url: string): Promise<void>`, `setupAuthListener(): () => void`

- [ ] **Step 1: Create `src/services/auth.ts`**

```typescript
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from './supabase';

/**
 * Parse a Supabase auth callback URL and set the session.
 * Handles both signup confirmation and password recovery flows.
 *
 * Expected URL format:
 *   anki://auth/callback#access_token=xxx&refresh_token=yyy&type=signup
 *   anki://auth/callback#access_token=xxx&refresh_token=yyy&type=recovery
 */
export async function handleAuthDeepLink(url: string): Promise<void> {
  try {
    // Parse the hash fragment from the URL
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return;

    const params = new URLSearchParams(url.substring(hashIndex + 1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) throw error;

      // If this is a password recovery flow, navigate to update-password screen
      if (type === 'recovery') {
        router.replace('/(auth)/update-password');
      }
      // For signup confirmation, the onAuthStateChange listener in _layout.tsx
      // will automatically set userId and render the main app
    }
  } catch (error) {
    console.error('Auth deep link handling failed:', error);
  }
}

/**
 * Set up deep-link listeners for both cold start and warm start.
 * Call this once from the root layout.
 * Returns an unsubscribe function.
 */
export function setupAuthListener(): () => void {
  // Handle cold start (app not running when link was clicked)
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleAuthDeepLink(url);
    }
  });

  // Handle warm start (app already running)
  const subscription = Linking.addEventListener('url', (event) => {
    handleAuthDeepLink(event.url);
  });

  return () => {
    subscription.remove();
  };
}
```

- [ ] **Step 2: Add deep-link listener to `src/app/_layout.tsx`**

Add import at top:

```typescript
import { setupAuthListener } from '@/services/auth';
```

Add inside the main `useEffect` (after `supabase.auth.onAuthStateChange` subscription setup):

```typescript
const cleanupAuthListener = setupAuthListener();

return () => {
  subscription.unsubscribe();
  cleanupAuthListener();
};
```

- [ ] **Step 3: Commit**

```bash
git add src/services/auth.ts src/app/_layout.tsx
git commit -m "feat: add auth deep-link service"
```

---

### Task 2: Auth stack navigator (`(auth)/_layout.tsx`)

**Files:**

- Create: `src/app/(auth)/_layout.tsx`

**Interfaces:**

- Consumes: none
- Produces: Stack navigator for login, signup, reset-password, update-password screens

- [ ] **Step 1: Create `src/app/(auth)/_layout.tsx`**

```typescript
import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="update-password" />
    </Stack>
  );
}
```

- [ ] **Step 2: Update root layout to use Stack routing**

In `src/app/_layout.tsx`, replace the direct `LoginScreen` import and rendering:

Remove:

```typescript
import LoginScreen from './(auth)/login';
```

And the `if (!userId)` block:

```typescript
if (!userId) {
  return (
    <AppRoot>
      <LoginScreen />
    </AppRoot>
  );
}
```

Replace with:

```typescript
if (!userId) {
  return (
    <AppRoot>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    </AppRoot>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/_layout.tsx src/app/_layout.tsx
git commit -m "feat: add auth stack navigator and update root layout"
```

---

### Task 3: Login screen (Email/Password)

**Files:**

- Modify: `src/app/(auth)/login.tsx` (replace OAuth with Email/Password form)

**Interfaces:**

- Consumes: `supabase` from `@/services/supabase`, `router` from `expo-router`
- Produces: Login form with email/password fields, navigation to signup/reset-password

- [ ] **Step 1: Rewrite `src/app/(auth)/login.tsx`**

Replace the entire file with:

```typescript
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
    } catch (error: any) {
      warningHaptic();
      Alert.alert('Đăng nhập thất bại', error.message || 'Email hoặc mật khẩu không đúng.');
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

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={loading}
          >
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
```

- [ ] **Step 2: Remove unused imports (expo-web-browser)**

Since `expo-web-browser` is no longer used in login, remove from `package.json` only if nothing else depends on it. Keep it for now — it may be useful later.

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/login.tsx
git commit -m "feat: replace OAuth login with email/password login"
```

---

### Task 4: Sign Up screen

**Files:**

- Create: `src/app/(auth)/signup.tsx`

**Interfaces:**

- Consumes: `supabase` from `@/services/supabase`, `router` from `expo-router`
- Produces: Registration form with email/password/confirm-password

- [ ] **Step 1: Create `src/app/(auth)/signup.tsx`**

```typescript
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

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { lightHaptic, successHaptic, warningHaptic } = useHaptics();

  const handleSignUp = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('Chú ý', 'Vui lòng điền đầy đủ thông tin.');
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
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: 'anki://auth/callback',
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('Email này đã được đăng ký.');
        }
        throw error;
      }

      successHaptic();
      Alert.alert(
        'Đăng ký thành công',
        `Vui lòng kiểm tra email ${email.trim()} và click vào link xác thực để kích hoạt tài khoản.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error: any) {
      warningHaptic();
      Alert.alert('Đăng ký thất bại', error.message || 'Không thể đăng ký tài khoản.');
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
          <Text style={styles.emoji}>📝</Text>
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Đăng ký để bắt đầu học từ vựng</Text>
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

          <TextInput
            style={styles.input}
            placeholder="Xác nhận mật khẩu"
            placeholderTextColor="#6E6E73"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Đăng ký</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              lightHaptic();
              router.back();
            }}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Đã có tài khoản? Đăng nhập</Text>
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(auth)/signup.tsx
git commit -m "feat: add sign up screen"
```

---

### Task 5: Reset Password screen

**Files:**

- Create: `src/app/(auth)/reset-password.tsx`

**Interfaces:**

- Consumes: `supabase` from `@/services/supabase`, `router` from `expo-router`
- Produces: Forgot password form with email input

- [ ] **Step 1: Create `src/app/(auth)/reset-password.tsx`**

```typescript
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

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { lightHaptic, successHaptic, warningHaptic } = useHaptics();

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Chú ý', 'Vui lòng nhập email.');
      return;
    }

    setLoading(true);
    lightHaptic();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'anki://auth/callback',
      });

      if (error) throw error;

      successHaptic();
      Alert.alert(
        'Đã gửi email',
        `Link đặt lại mật khẩu đã được gửi đến ${email.trim()}. Vui lòng kiểm tra hộp thư.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error: any) {
      warningHaptic();
      Alert.alert('Thất bại', error.message || 'Không thể gửi email đặt lại mật khẩu.');
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
          <Text style={styles.emoji}>🔑</Text>
          <Text style={styles.title}>Quên mật khẩu</Text>
          <Text style={styles.subtitle}>
            Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.
          </Text>
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

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Gửi link đặt lại mật khẩu</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              lightHaptic();
              router.back();
            }}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Quay lại đăng nhập</Text>
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(auth)/reset-password.tsx
git commit -m "feat: add reset password screen"
```

---

### Task 6: Update Password screen

**Files:**

- Create: `src/app/(auth)/update-password.tsx`

**Interfaces:**

- Consumes: `supabase` from `@/services/supabase`, `router` from `expo-router`
- Produces: New password form (shown after recovery link click)

- [ ] **Step 1: Create `src/app/(auth)/update-password.tsx`**

```typescript
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
      Alert.alert('Thành công', 'Mật khẩu đã được cập nhật.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (error: any) {
      warningHaptic();
      Alert.alert('Thất bại', error.message || 'Không thể cập nhật mật khẩu.');
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

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleUpdate}
            disabled={loading}
          >
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(auth)/update-password.tsx
git commit -m "feat: add update password screen"
```

---

### Task 7: Configure Supabase Dashboard

**Files:** None (configuration in Supabase web UI)

**Note:** This is manual configuration — the user needs to do this in their Supabase dashboard.

- [ ] **Step 1: Authentication → Settings → URL Configuration**

Set the following in Supabase dashboard at `https://supabase.com/dashboard/project/xqmdyfbcokwocsqbjngw/auth/settings`:

- **Site URL**: `https://xqmdyfbcokwocsqbjngw.supabase.co`
- **Redirect URLs**: Add `anki://auth/callback`

- [ ] **Step 2: Authentication → Settings → Email Auth**

Ensure **Email Auth** is enabled (it should be by default). Optionally disable any other providers (Google, Apple) if you want email-only auth.

- [ ] **Step 3: Authentication → Settings → Email Templates**

Verify the email templates reference the correct redirect URL. The default templates should work with the `emailRedirectTo` option passed in `signUp()` and `resetPasswordForEmail()` calls.

---

### Task 8: Final integration & verify

**Files:** None (manual testing)

- [ ] **Step 1: Run the app**

```bash
npx expo start
```

- [ ] **Step 2: Verify sign-up flow**

1. Open app → see login screen
2. Tap "Chưa có tài khoản? Đăng ký" → navigate to signup screen
3. Enter email + password → tap "Đăng ký"
4. See success alert: "Vui lòng kiểm tra email..."
5. Check email inbox for confirmation link
6. Click link → app opens → session established → main app renders

- [ ] **Step 3: Verify login flow**

1. Log out (or reinstall)
2. Enter email + password of verified account
3. Tap "Đăng nhập" → session established → main app renders

- [ ] **Step 4: Verify reset password flow**

1. On login screen, tap "Quên mật khẩu?"
2. Enter email → tap "Gửi link đặt lại mật khẩu"
3. Check email for recovery link
4. Click link → app opens → update-password screen renders
5. Enter new password × 2 → tap "Cập nhật mật khẩu"
6. See success alert → navigate to main app
7. Log out → verify new password works on login

- [ ] **Step 5: Verify error handling**

1. Empty fields → validation alert
2. Invalid email format → Supabase error
3. Wrong password → "Email hoặc mật khẩu không đúng"
4. Password mismatch → "Mật khẩu xác nhận không khớp"
5. Short password → "Mật khẩu phải có ít nhất 6 ký tự"
