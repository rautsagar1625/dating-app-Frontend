import { Platform, Dimensions } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface ClientFingerprint {
  deviceId: string;
  brand: string | null;
  model: string | null;
  osName: string | null;
  osVersion: string | null;
  isDevice: boolean;
  isRooted: boolean | null;
  appVersion: string | null;
  screenWidth: number;
  screenHeight: number;
  timezone: string;
  locale: string;
}

const DEVICE_ID_KEY = 'velvet_device_id';
let _sessionDeviceId: string | null = null;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getOrCreateDeviceId(): Promise<string> {
  if (_sessionDeviceId) return _sessionDeviceId;

  if (Platform.OS === 'web') {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(DEVICE_ID_KEY) : null;
      if (stored) { _sessionDeviceId = stored; return stored; }
      const newId = generateUUID();
      if (typeof window !== 'undefined') window.localStorage.setItem(DEVICE_ID_KEY, newId);
      _sessionDeviceId = newId;
      return newId;
    } catch {
      if (!_sessionDeviceId) _sessionDeviceId = generateUUID();
      return _sessionDeviceId;
    }
  }

  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) {
      _sessionDeviceId = stored;
      return stored;
    }
    const newId = generateUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, newId);
    _sessionDeviceId = newId;
    return newId;
  } catch {
    if (!_sessionDeviceId) _sessionDeviceId = generateUUID();
    return _sessionDeviceId;
  }
}

export async function getDeviceId(): Promise<string> {
  return getOrCreateDeviceId();
}

export async function collectFingerprint(): Promise<ClientFingerprint> {
  const deviceId = await getOrCreateDeviceId();
  const { width, height } = Dimensions.get('screen');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  const locale   = Intl.DateTimeFormat().resolvedOptions().locale   ?? 'en';

  return {
    deviceId,
    brand:       null,
    model:       null,
    osName:      Platform.OS,
    osVersion:   String(Platform.Version),
    isDevice:    true,
    isRooted:    null,
    appVersion:  null,
    screenWidth:  Math.round(width),
    screenHeight: Math.round(height),
    timezone,
    locale,
  };
}
