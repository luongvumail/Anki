import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, ActivityIndicator } from 'react-native';

import AppTabs from '@/components/AppTabs';
import { initLocalDB } from '@/services/sqlite';
import { useAppStore } from '@/services/store';
import { supabase } from '@/services/supabase';
import LoginScreen from './(auth)/login';

SplashScreen.preventAutoHideAsync();

// Initialize local DB on app start
initLocalDB();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { userId, setUserId } = useAppStore();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setAuthLoading(false);
      SplashScreen.hideAsync().catch(() => {});
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Queue loading is handled by index.tsx on mount to avoid concurrent loadQueue() calls.

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#120E2E' }}>
        <ActivityIndicator size="large" color="#FF2D55" />
      </View>
    );
  }

  if (!userId) {
    return <LoginScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
