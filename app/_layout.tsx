import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const setUserId = useStore(s => s.setUserId);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        router.replace('/(tabs)');
      } else {
        setUserId(null);
        router.replace('/auth');
      }
    });
    return unsub;
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg.primary },
        }}
      >
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="study/[deckId]"
          options={{
            presentation: 'fullScreenModal',
            contentStyle: { backgroundColor: Colors.bg.primary },
          }}
        />
        <Stack.Screen name="deck/[id]" />
        <Stack.Screen name="card/[id]" />
      </Stack>
    </ErrorBoundary>
  );
}
