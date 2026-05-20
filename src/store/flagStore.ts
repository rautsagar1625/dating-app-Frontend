import { create } from 'zustand';

// Keep this in sync with the backend FEATURE_FLAGS constant.
// The string values must match exactly what's stored in the DB.
export const FLAG_KEYS = {
  ENABLE_VIDEO_CALLS: 'enableVideoCalls',
  ENABLE_BOOST:       'enableBoost',
  NEW_FEED_RANKING:   'newFeedRanking',
  PREMIUM_PAYWALL_V2: 'premiumPaywallV2',
  AI_MODERATION:      'aiModeration',
  VOICE_NOTES:        'voiceNotes',
} as const;

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];

interface FlagState {
  flags: Record<string, boolean>;
  loaded: boolean;
  setFlags: (flags: Record<string, boolean>) => void;
  getFlag: (key: FlagKey, fallback?: boolean) => boolean;
  reset: () => void;
}

export const useFlagStore = create<FlagState>((set, get) => ({
  flags: {},
  loaded: false,

  setFlags: (flags) => set({ flags, loaded: true }),

  // Typed accessor — returns fallback (default false) for unknown flags
  getFlag: (key, fallback = false) => {
    const { flags, loaded } = get();
    if (!loaded) return fallback;
    return key in flags ? flags[key] : fallback;
  },

  reset: () => set({ flags: {}, loaded: false }),
}));
