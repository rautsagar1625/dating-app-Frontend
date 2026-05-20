/**
 * Lightweight analytics abstraction.
 * Wraps Mixpanel (or any provider) behind a stable interface so
 * the rest of the app never imports the SDK directly.
 *
 * Events are batched and flushed every 30 s or on app foreground.
 * When offline, the queue is held in memory and replayed on reconnect.
 */
import { AppState, type AppStateStatus } from 'react-native';
import { ENV } from '../config/env';

// ── Types ──────────────────────────────────────────────────────────────────

export type EventName =
  // Onboarding
  | 'onboarding_start'
  | 'onboarding_step_complete'
  | 'onboarding_complete'
  | 'photo_uploaded'
  // Auth
  | 'login'
  | 'register'
  | 'logout'
  | 'forgot_password'
  | 'password_reset'
  // Discovery
  | 'browse_view'
  | 'profile_view'
  | 'like_sent'
  | 'like_removed'
  | 'mutual_match'
  // Chat
  | 'chat_opened'
  | 'chat_unlocked'
  | 'message_sent'
  | 'chat_list_viewed'
  // Monetization
  | 'subscription_view'
  | 'subscription_started'
  | 'subscription_completed'
  | 'subscription_failed'
  | 'subscription_cancelled'
  | 'wallet_view'
  | 'credits_purchased'
  | 'boost_activated'
  // Engagement
  | 'photo_access_approved'
  | 'photo_access_denied'
  | 'notification_opened'
  // Retention
  | 'app_foregrounded'
  | 'deep_link_opened'
  // Safety
  | 'user_blocked'
  | 'user_reported'
  | 'account_delete_started'
  | 'account_deleted'
  // Beta
  | 'beta_feedback_opened'
  | 'beta_feedback_submitted';

interface QueuedEvent {
  name:      EventName;
  props:     Record<string, unknown>;
  timestamp: number;
}

// ── State ──────────────────────────────────────────────────────────────────

let userId: string | null = null;
const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let isOnline = true;

// ── Core ───────────────────────────────────────────────────────────────────

export const analytics = {
  /** Call once when the user authenticates. */
  identify(id: string, traits?: Record<string, unknown>) {
    userId = id;
    if (!ENV.MIXPANEL_TOKEN) return;
    // Mixpanel.identify(id);
    // if (traits) Mixpanel.getPeople().set(traits);
  },

  /** Reset identity on logout. */
  reset() {
    userId = null;
    queue.length = 0;
    // Mixpanel.reset();
  },

  /** Track an event. Queued immediately; flushed in batches. */
  track(name: EventName, props: Record<string, unknown> = {}) {
    queue.push({ name, props: { ...props, userId, env: ENV.APP_ENV }, timestamp: Date.now() });
    if (ENV.isDev) {
      console.log(`[Analytics] ${name}`, props);
    }
    if (queue.length >= 20) this._flush();
  },

  /** Screen view helper. */
  screen(screenName: string, props: Record<string, unknown> = {}) {
    if (!ENV.MIXPANEL_TOKEN) {
      if (ENV.isDev) console.log(`[Analytics] screen: ${screenName}`);
      return;
    }
    // Mixpanel.track('screen_view', { screen: screenName, ...props });
  },

  setOnline(online: boolean) {
    isOnline = online;
    if (online && queue.length > 0) this._flush();
  },

  _flush() {
    if (!isOnline || queue.length === 0) return;
    const batch = queue.splice(0, queue.length);
    if (!ENV.MIXPANEL_TOKEN) return;
    // Ship batch to Mixpanel / custom ingestion endpoint
    batch.forEach(({ name, props }) => {
      // Mixpanel.track(name, props);
    });
  },

  _startFlushInterval() {
    if (flushTimer) return;
    flushTimer = setInterval(() => this._flush(), 30_000);
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        this.track('app_foregrounded');
        this._flush();
      }
    });
  },
};

analytics._startFlushInterval();
