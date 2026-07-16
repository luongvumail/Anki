# Email/Password Authentication Design

## Overview

Replace the current Google OAuth-only login with a full Email/Password authentication
system using Supabase's built-in email auth with deep-link handling.

## Screens & Navigation

### New screens

```
src/app/(auth)/
  _layout.tsx          Stack navigator for auth screens
  login.tsx            Email + Password login form (modified from OAuth)
  signup.tsx           Email + Password + Confirm Password registration form
  reset-password.tsx   Email input → send recovery link
  update-password.tsx  New password form (after link click)
```

### Auth flow

```
┌─────────────┐
│   Login     │ ←─── "Đăng ký" → Signup
│ (email/pw)  │ ←─── "Quên mật khẩu" → Reset Password
└──────┬──────┘
       │ Sign in success
       v
   ┌─────────┐
   │  Main   │
   │  App    │
   └─────────┘
```

```
┌──────────────┐
│   Sign Up    │ ←─── "Đã có tài khoản? Đăng nhập" → Login
│ (email/pw)   │
└──────┬───────┘
       │ Submit → email link → click link → app opens → auto verify → login
```

```
┌──────────────────┐
│  Reset Password  │ ←─── "Quay lại" → Login
│ (nhập email)     │
└──────┬───────────┘
       │ Submit → email link → click link → app opens
       v
┌──────────────────┐
│  Update Password │
│ (new pwd × 2)    │
└──────────────────┘
```

### Root layout change

`_layout.tsx` currently imports `LoginScreen` directly. Change to:

```tsx
// When !userId:
<Stack>
  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
</Stack>
```

`(auth)/_layout.tsx` is a Stack navigator routing between login, signup,
reset-password, update-password.

## Deep Link Handling

### URL Scheme

Configured in `app.json`:

```json
{ "expo": { "scheme": "anki" } }
```

### Supabase Dashboard → Authentication → URL Configuration

- **Site URL**: `https://xqmdyfbcokwocsqbjngw.supabase.co`
- **Redirect URLs**:
  - `anki://auth/callback` (production)
  - `exp://127.0.0.1:8081/--/auth/callback` (Expo dev)
  - `anki://` (fallback)

### URL format

```
anki://auth/callback#access_token=xxx&refresh_token=yyy&type=signup
anki://auth/callback#access_token=xxx&refresh_token=yyy&type=recovery
```

### Handling in app

`src/services/auth.ts` provides:

- `handleAuthDeepLink(url: string)`: parse URL hash → extract tokens →
  `supabase.auth.setSession()`. If `type === 'recovery'`, navigate to
  update-password screen.
- `setupAuthListener()`: listen for `Linking.addEventListener('url')` events
  and `Linking.getInitialURL()` for cold starts.

Called from `_layout.tsx` useEffect.

## Screen Details

### Login (modified)

- Email TextInput, Password TextInput (secureTextEntry)
- "Đăng nhập" button → `supabase.auth.signInWithPassword({ email, password })`
- "Chưa có tài khoản? Đăng ký" → navigate to signup
- "Quên mật khẩu?" → navigate to reset-password
- Error messages in Vietnamese

### Sign Up

- Email TextInput, Password TextInput, Confirm Password TextInput
- Validation: passwords match, min 6 chars
- "Đăng ký" button → `supabase.auth.signUp({ email, password })`
- On success: "Vui lòng kiểm tra email {email} và click vào link xác thực"
- "Đã có tài khoản? Đăng nhập" → navigate to login

### Reset Password

- Email TextInput
- "Gửi link đặt lại mật khẩu" → `supabase.auth.resetPasswordForEmail()`
  with `redirectTo: 'anki://auth/callback'`
- On success: "Link đã gửi đến {email}. Kiểm tra hộp thư."
- "Quay lại đăng nhập" → navigate to login

### Update Password

- Only accessible after deep link from recovery email
- Password TextInput, Confirm Password TextInput
- "Cập nhật mật khẩu" → `supabase.auth.updateUser({ password })`
- On success: "Đã cập nhật mật khẩu" → navigate to main app

## State Management

No changes to Zustand store. Existing flow works:

1. `supabase.auth.setSession()` calls trigger `onAuthStateChange`
2. Root layout's listener picks up the change
3. `setUserId()` → app renders main stack

## Files to Create/Modify

### Create:

- `src/services/auth.ts` — deep link handling + auth helpers
- `src/app/(auth)/_layout.tsx` — Stack navigator
- `src/app/(auth)/signup.tsx` — registration form
- `src/app/(auth)/reset-password.tsx` — forgot password form
- `src/app/(auth)/update-password.tsx` — new password form

### Modify:

- `src/app/(auth)/login.tsx` — OAuth → Email/Password
- `src/app/_layout.tsx` — use Stack routing instead of direct import

### Keep unchanged:

- `src/services/supabase.ts`
- `src/services/store.ts`
- `src/services/sync.ts`
- `src/services/sqlite.ts`
- `src/app/settings.tsx`
- `src/app/(tabs)/`
- `src/app/onboarding.tsx`
