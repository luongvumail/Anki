import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, triggerHaptic } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.accent.indigoLight,
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hôm nay',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'today' : 'today-outline'} size={23} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic('selection'),
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: 'Bộ thẻ',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'library' : 'library-outline'} size={23} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic('selection'),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Thêm từ',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={24} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic('selection'),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={23} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic('selection'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bg.primary,   // Linear Obsidian Backdrop (#08090C)
    borderTopColor: Colors.border.separator, // Crisp Linear 1px Divider (#1F212B)
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 6,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
});
