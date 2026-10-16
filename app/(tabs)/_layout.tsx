import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, Typography, Layout } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { AccountModal } from "../../components/home/AccountModal";

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Spacing.sm);

  return (
    <View style={{ flex: 1 }}>
      {/* Tab Screens ... */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: theme.bg,
              height: 58 + bottomPadding,
              paddingBottom: bottomPadding,
            },
          ],

          tabBarActiveTintColor: theme.blue,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Học",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={Layout.iconLg}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="decks"
          options={{
            title: "Từ vựng",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "book" : "book-outline"}
                size={Layout.iconLg}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="practice"
          options={{
            title: "Luyện tập",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "extension-puzzle" : "extension-puzzle-outline"}
                size={Layout.iconLg}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "Thống kê",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "stats-chart" : "stats-chart-outline"}
                size={Layout.iconLg}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
      <AccountModal />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
    paddingTop: Spacing.xs,
  },

  tabItem: {
    paddingTop: Spacing.xs,
  },
  tabLabel: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    letterSpacing: 0.3,
    marginTop: Spacing.xs,
  },
});
