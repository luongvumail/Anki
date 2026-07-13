import React from 'react';
import { Tabs } from 'expo-router';
import { Home, BookOpen } from 'lucide-react-native';
import { useAppStore } from '../services/store';

export default function AppTabs() {
  const { queue, completedCount, totalInQueue } = useAppStore();

  // Tab is accessible only when there are cards remaining in the session
  const hasActiveSession = queue.length > 0 && completedCount < totalInQueue;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF2D55',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#120E2E',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="flashcard"
        options={{
          title: 'Ôn Tập',
          // href: null hides the tab when there is no active session
          href: hasActiveSession ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
