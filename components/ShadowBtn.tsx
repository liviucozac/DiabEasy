import React from 'react';
import { Text, ViewStyle, TextStyle } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { PressBtn } from './PressBtn';

interface ShadowBtnProps {
  onPress: () => void;
  label: string;
  style?: ViewStyle | ViewStyle[] | any;
  textStyle?: TextStyle | TextStyle[] | any;
  activeOpacity?: number;
  disabled?: boolean;
  shadowColor?: string;
  distance?: number;
}

export function ShadowBtn({
  onPress,
  label,
  style,
  textStyle,
  activeOpacity = 0.85,
  disabled,
  shadowColor = 'rgba(201,64,66,0.25)',
  distance = 6,
}: ShadowBtnProps) {
  return (
    <Shadow
      distance={distance}
      startColor={shadowColor}
      endColor="rgba(201,64,66,0)"
      offset={[0, -4]}
      style={{ borderRadius: style?.borderRadius ?? 10 }}
    >
      <PressBtn
        style={style}
        onPress={onPress}
        activeOpacity={activeOpacity}
        disabled={disabled}
      >
        <Text style={textStyle}>{label}</Text>
      </PressBtn>
    </Shadow>
  );
}