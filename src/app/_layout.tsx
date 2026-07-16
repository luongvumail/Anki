import 'react-native-url-polyfill/auto';
import '@/global.css';
import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, ActivityIndicator, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { initLocalDB } from '@/services/sqlite';
import { useAppStore } from '@/services/store';
import { supabase } from '@/services/supabase';
import { setupAuthListener } from '@/services/auth';
import { notificationService } from '@/services/notifications';
import OnboardingScreen from './onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

// Singleton check to make sure database is initialized only once
let dbInitialized = false;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { userId, pendingRecovery, setUserId } = useAppStore();
  const [authLoading, setAuthLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const redirectFromNotification = (notification: Notifications.Notification) => {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) {
        router.push(url as never);
      }
    };

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      redirectFromNotification(lastResponse.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      redirectFromNotification(response.notification);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!dbInitialized) {
      initLocalDB();
      dbInitialized = true;
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setAuthLoading(false);
      SplashScreen.hideAsync().catch(() => {});
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
      if (event === 'SIGNED_OUT') {
        // Navigate to root so the auth gate in this layout shows the login screen
        router.replace('/');
      }
    });

    // Check if onboarding completed
    AsyncStorage.getItem('@anki_onboarding_completed').then((val) => {
      if (val !== 'true') {
        setShowOnboarding(true);
      }
    });

    // Request notification permissions and schedule daily notification
    notificationService.getSettings().then((settings) => {
      if (settings.enabled) {
        notificationService.scheduleDailyNotification(settings.hour, settings.minute);
      }
    });

    const cleanupAuthListener = setupAuthListener();

    return () => {
      subscription.unsubscribe();
      cleanupAuthListener();
    };
  }, [setUserId]);

  // Queue loading is handled by index.tsx on mount to avoid concurrent loadQueue() calls.

  if (authLoading) {
    return (
      <AppRoot>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#120E2E',
          }}
        >
          <ActivityIndicator size="large" color="#FF2D55" />
        </View>
      </AppRoot>
    );
  }

  if (showOnboarding) {
    return (
      <AppRoot>
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </AppRoot>
    );
  }

  if (!userId || pendingRecovery) {
    return (
      <AppRoot>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
        </Stack>
      </AppRoot>
    );
  }

  return (
    <AppRoot>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="flashcard" options={{ presentation: 'modal' }} />
          <Stack.Screen name="add-word" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </AppRoot>
  );
}

function AppRoot({ children }: React.PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
