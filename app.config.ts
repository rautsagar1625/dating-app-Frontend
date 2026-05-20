import { ExpoConfig, ConfigContext } from 'expo/config';

// EAS Build supplies these as process.env at build time.
// Local dev falls back to the localhost values in src/config/env.ts.
const {
  APP_ENV       = 'development',
  API_URL,
  SOCKET_URL,
  CDN_URL,
  SENTRY_DSN    = '',
  MIXPANEL_TOKEN = '',
  EAS_PROJECT_ID = '',
} = process.env;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name:    APP_ENV === 'production' ? 'Velvet' : `Velvet (${APP_ENV})`,
  slug:    'dating-app-Frontend',
  version: '1.0.0',

  orientation:       'portrait',
  userInterfaceStyle: 'dark',
  newArchEnabled:    true,

  icon: './assets/icon.png',
  splash: {
    image:           './assets/splash-icon.png',
    resizeMode:      'contain',
    backgroundColor: '#0F0F0F',
  },

  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.velvet.datingapp',
    infoPlist: {
      NSPhotoLibraryUsageDescription: 'Velvet needs access to your photo library to upload a profile photo.',
      NSCameraUsageDescription:       'Velvet needs access to your camera to take a profile photo.',
    },
  },

  android: {
    package:         'com.velvet.datingapp',
    versionCode:     1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0F0F0F',
    },
    edgeToEdgeEnabled:            true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.CAMERA',
    ],
  },

  web: { favicon: './assets/favicon.png' },

  plugins: [
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission: 'Velvet needs access to your photos to upload a profile photo.',
        cameraPermission: 'Velvet needs your camera to take a profile photo.',
      },
    ],
    [
      'expo-notifications',
      {
        icon:  './assets/icon.png',
        color: '#7B2FF7',
        defaultChannel: 'default',
      },
    ],
  ],

  // All runtime env values flow through here → consumed by src/config/env.ts
  extra: {
    APP_ENV,
    API_URL:        API_URL    ?? (APP_ENV === 'production' ? '' : 'http://localhost:3002/api'),
    SOCKET_URL:     SOCKET_URL ?? (APP_ENV === 'production' ? '' : 'http://localhost:3002'),
    CDN_URL:        CDN_URL    ?? (APP_ENV === 'production' ? '' : 'http://localhost:3002'),
    SENTRY_DSN,
    MIXPANEL_TOKEN,
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },

  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },

  runtimeVersion: {
    policy: 'appVersion',
  },
});
