import React, { useRef } from 'react';
import { TouchableOpacity, Animated, ViewStyle } from 'react-native';

interface PressBtnProps {
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: ViewStyle | ViewStyle[] | any;
  children: React.ReactNode;
  activeOpacity?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'none' | 'menuitem' | 'tab' | 'search';
  accessibilityState?: object;
}

export function PressBtn({
  onPress,
  onPressIn: externalPressIn,
  onPressOut: externalPressOut,
  style,
  children,
  activeOpacity = 0.75,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
}: PressBtnProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 400,
      friction: 8,
    }).start();
    externalPressIn?.();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
    externalPressOut?.();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], alignSelf: 'stretch' }}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={activeOpacity}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}