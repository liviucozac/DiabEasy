import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, ColorScheme } from './colors';
import { useGlucoseStore } from '../store/glucoseStore';

// ─── Context type ─────────────────────────────────────────────────────────────

interface AppContextValue {
  colors: ColorScheme;
  isDark: boolean;
}

const AppContext = createContext<AppContextValue>({
  colors: COLORS.light,
  isDark: false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const { settings } = useGlucoseStore();

  const isDark = useMemo(() => {
    if (settings.theme === 'dark')   return true;
    if (settings.theme === 'light')  return false;
    // 'system' — follow device
    return systemScheme === 'dark';
  }, [settings.theme, systemScheme]);

  const colors = useMemo(() => (isDark ? COLORS.dark : COLORS.light), [isDark]);

  return (
    <AppContext.Provider value={{ colors, isDark }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useTheme = () => useContext(AppContext);

// Keep old hook name working for any existing usage
export const useAppContext = () => useContext(AppContext);