import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { supabase } from './supabase';
import { useAppStore } from './store';

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
      // Flag recovery flow BEFORE setSession so the auth gate keeps the (auth)
      // Stack mounted — otherwise onAuthStateChange sets userId and the main
      // app renders, unmounting the (auth) Stack before we can navigate.
      if (type === 'recovery') {
        useAppStore.getState().setPendingRecovery(true);
      }

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
    Alert.alert(
      'Xác thực thất bại',
      'Không thể xác thực liên kết từ email. Vui lòng thử lại hoặc yêu cầu gửi lại email.',
    );
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
