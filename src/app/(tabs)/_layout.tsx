import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11 }, tabBarStyle: { backgroundColor: colors.paperRaised, borderTopColor: colors.rule, height: 64, paddingTop: 7, paddingBottom: 8 } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="report" options={{ title: 'Report', tabBarIcon: ({ color }) => <Ionicons name="add-circle" color={color} size={29} /> }} />
    <Tabs.Screen name="activity" options={{ title: 'My reports', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} /> }} />
  </Tabs>;
}
