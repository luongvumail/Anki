import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focused,
  isAdd = false,
}: {
  name: IoniconsName;
  focused: boolean;
  isAdd?: boolean;
}) {
  if (isAdd) {
    return (
      <View style={[styles.addBtn, focused && styles.addBtnActive]}>
        <Ionicons name={name} size={28} color="#fff" />
      </View>
    );
  }
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={name}
        size={24}
        color={focused ? Colors.accent.purpleLight : Colors.text.muted}
      />
      {focused && <View style={styles.activeDot} />}
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
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hôm nay',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'today' : 'today-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: 'Bộ thẻ',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'library' : 'library-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="add" focused={focused} isAdd />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} focused={focused} />
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
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 36,
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent.purpleLight,
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Colors.accent.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  addBtnActive: {
    backgroundColor: Colors.accent.purpleMid,
  },
});
