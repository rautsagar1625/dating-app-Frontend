/**
 * Runtime environment config.
 * Values are resolved from Expo Constants (app.config.ts extra → EAS build vars)
 * with compile-time fallbacks for local dev.
 *
 * NEVER import process.env directly in app code — go through this module.
 */
import Constants from 'expo-constants';

function get(key: string, fallback: string): string {
  const extra = (Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as Record<string, string>;
  return extra[key] ?? fallback;
}

export const ENV = {
  APP_ENV:       get('APP_ENV', 'development') as 'development' | 'staging' | 'production',
  API_URL:       get('API_URL', 'http://localhost:3002/api'),
  SOCKET_URL:    get('SOCKET_URL', 'http://localhost:3002'),
  CDN_URL:       get('CDN_URL', 'http://localhost:3002'),
  SENTRY_DSN:    get('SENTRY_DSN', ''),
  MIXPANEL_TOKEN: get('MIXPANEL_TOKEN', ''),

  get isDev()     { return this.APP_ENV === 'development'; },
  get isStaging() { return this.APP_ENV === 'staging'; },
  get isProd()    { return this.APP_ENV === 'production'; },
} as const;
