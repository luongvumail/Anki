import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, triggerHaptic } from "../../constants/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.duolingo.green,
        tabBarInactiveTintColor: Colors.duolingo.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Học",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic("selection"),
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: "Từ vựng",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={24} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic("selection"),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Thêm thẻ",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={25} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic("selection"),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Thống kê",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={24} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => triggerHaptic("selection"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.duolingo.bg,
    borderTopColor: Colors.duolingo.cardBorder,
    borderTopWidth: 2,
    height: Platform.OS === "ios" ? 86 : 66,
    paddingBottom: Platform.OS === "ios" ? 26 : 10,
    paddingTop: 6,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
