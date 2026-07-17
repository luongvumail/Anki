import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <View>
        {/* Using emoji as tab icons for universal compatibility */}
        <View style={styles.emojiContainer}>
          <View style={focused ? styles.activeIndicator : null} />
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.accent.purpleLight,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hôm nay',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.icon, focused && styles.iconActive]}>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: 'Bộ thẻ',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.icon, focused && styles.iconActive]} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Thêm từ',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.addIcon, focused && styles.addIconActive]} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.icon, focused && styles.iconActive]} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bg.secondary,
    borderTopColor: Colors.border.subtle,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 20,
  },
  tabLabel: { fontSize: 11, fontWeight: '500' },
  iconWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: {},
  icon: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.text.muted,
  },
  iconActive: { backgroundColor: Colors.accent.purpleLight },
  addIcon: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.text.muted,
  },
  addIconActive: { backgroundColor: Colors.accent.purple },
  emojiContainer: {},
  activeIndicator: {},
});
