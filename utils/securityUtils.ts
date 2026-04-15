import * as LocalAuthentication from 'expo-local-authentication';

/** djb2 hash — good enough for local PIN/password storage */
export function hashValue(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) + value.charCodeAt(i);
    hash = hash & hash;
  }
  return String(hash >>> 0);
}

export function checkHash(input: string, stored: string): boolean {
  return hashValue(input) === stored;
}

export type BiometricResult =
  | { success: true }
  | { success: false; reason: 'not_available' | 'not_enrolled' | 'failed' | 'cancelled' };

export async function tryBiometrics(promptMessage = 'Unlock DiabEasy'): Promise<BiometricResult> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return { success: false, reason: 'not_available' };

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return { success: false, reason: 'not_enrolled' };

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Use PIN or password',
    disableDeviceFallback: true,   // we handle fallback ourselves
    cancelLabel: 'Cancel',
  });

  if (result.success) return { success: true };
  if (result.error === 'user_cancel' || result.error === 'system_cancel') {
    return { success: false, reason: 'cancelled' };
  }
  return { success: false, reason: 'failed' };
}

export async function biometricsAvailable(): Promise<boolean> {
  const hw = await LocalAuthentication.hasHardwareAsync();
  if (!hw) return false;
  return LocalAuthentication.isEnrolledAsync();
}
