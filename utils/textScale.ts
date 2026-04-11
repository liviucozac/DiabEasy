import { PixelRatio } from 'react-native';

// Clamp font scale between 0.85 and 1.3 so text never grows unreadably large
const fontScale = Math.min(Math.max(PixelRatio.getFontScale(), 0.85), 1.3);

/**
 * Returns a font size scaled to the device's accessibility font size setting.
 * Use instead of hardcoded fontSize values for important text.
 *
 * Example: fontSize: fs(14)
 */
export function fs(size: number): number {
  return Math.round(size * fontScale);
}
