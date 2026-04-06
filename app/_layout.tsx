import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider, useTheme } from '../context/AppContext';
import { View, Text, Image, StyleSheet } from 'react-native';

function Header() {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.bg }]}>
      <Image
        source={{ uri: 'https://i.imgur.com/XRrP3SM.png' }}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.logoText, { color: colors.red }]}>DiabEasy</Text>
    </View>
  );
}

function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   colors.red,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle:             { backgroundColor: colors.tabBar },
        tabBarLabelStyle:        { fontSize: 10 },
        headerShown:             true,
        header:                  () => <Header />,
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Home',    tabBarIcon: ({ color }) => <Ionicons name="home"      size={22} color={color} /> }} />
      <Tabs.Screen name="history"    options={{ title: 'History', tabBarIcon: ({ color }) => <Ionicons name="time"      size={22} color={color} /> }} />
      <Tabs.Screen name="foodguide"  options={{ title: 'Food',    tabBarIcon: ({ color }) => <Ionicons name="nutrition" size={22} color={color} /> }} />
      <Tabs.Screen name="medication" options={{ title: 'Meds',    tabBarIcon: ({ color }) => <Ionicons name="medical"   size={22} color={color} /> }} />
      <Tabs.Screen name="emergency"  options={{ title: 'SOS',     tabBarIcon: ({ color }) => <Ionicons name="warning"   size={22} color={color} /> }} />
      <Tabs.Screen name="profile"    options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person"    size={22} color={color} /> }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <TabsLayout />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 55,
    paddingBottom: 12,
    gap: 8,
  },
  logo:     { width: 38, height: 38 },
  logoText: { fontSize: 22, fontWeight: 'bold' },
});