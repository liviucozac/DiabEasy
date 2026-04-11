import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider, useTheme } from '../context/AppContext';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { useGlucoseStore } from '../store/glucoseStore';
import OnboardingScreen from './onboarding';
import { useRef, useEffect } from 'react';
import { UIManager, Platform } from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function Header() {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, {
      backgroundColor: colors.bg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    }]}>
      <Image
        source={{ uri: 'https://i.imgur.com/XRrP3SM.png' }}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.logoText, { color: colors.red }]}>DiabEasy</Text>
    </View>
  );
}

function AnimatedTabIcon({ name, color, focused }: { name: string; color: string; focused: boolean }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(focused ? 1.18 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.18 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [focused]);

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        shadowColor: focused ? colors.red : 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: focused ? 0.75 : 0,
        shadowRadius: 8,
      }}
    >
      <Ionicons name={name as any} size={22} color={color} />
    </Animated.View>
  );
}

function TabsLayout() {
  const { colors } = useTheme();

  const TAB_SCREENS = [
    { name: 'index',      title: 'Home',    icon: 'home' },
    { name: 'history',    title: 'History', icon: 'time' },
    { name: 'foodguide',  title: 'Food',    icon: 'nutrition' },
    { name: 'medication', title: 'Meds',    icon: 'medical' },
    { name: 'emergency',  title: 'SOS',     icon: 'warning' },
    { name: 'profile',    title: 'Profile', icon: 'person' },
  ];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   colors.red,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          shadowColor: colors.red,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 16,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: { fontSize: 10 },
        headerShown:      true,
        header:           () => <Header />,
      }}
    >
      {TAB_SCREENS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon name={icon} color={color} focused={focused} />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="onboarding" options={{ href: null }} />
    </Tabs>
  );
}

function RootContent() {
  const { hasSeenOnboarding } = useGlucoseStore();
  if (!hasSeenOnboarding) return <OnboardingScreen />;
  return <TabsLayout />;
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootContent />
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
