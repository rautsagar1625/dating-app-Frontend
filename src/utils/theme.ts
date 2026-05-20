export const COLORS = {
  background: '#0F0F0F',
  card: '#1A1A1A',
  cardElevated: '#222222',
  border: '#2A2A2A',
  borderGlow: 'rgba(123,47,247,0.5)',

  purple: '#7B2FF7',
  pink: '#F107A3',

  text: '#FFFFFF',
  textSecondary: '#E5E5E5',
  textMuted: '#888888',

  gold: '#F5C842',
  goldDark: '#C9A020',
  success: '#30D158',
  error: '#FF453A',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.75)',

  glowPurple: 'rgba(123,47,247,0.35)',
  glowPink: 'rgba(241,7,163,0.35)',
  glowGold: 'rgba(245,200,66,0.35)',

  gradient: {
    primary: ['#7B2FF7', '#F107A3'] as [string, string],
    primaryMid: ['#8B3FF7', '#E107B3'] as [string, string],
    card: ['rgba(26,26,26,0)', 'rgba(15,15,15,0.97)'] as [string, string],
    dark: ['#0F0F0F', '#1A1A1A'] as [string, string],
    glass: ['rgba(123,47,247,0.08)', 'rgba(241,7,163,0.08)'] as [string, string],
    gold: ['#F5C842', '#C9A020'] as [string, string],
    lock: ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)'] as [string, string],
  },
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    hero: 40,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const ANIMATION = {
  spring: {
    default:  { damping: 18, stiffness: 180, mass: 0.8 },
    snappy:   { damping: 15, stiffness: 350, mass: 0.5 },
    bouncy:   { damping: 10, stiffness: 200, mass: 0.8 },
    gentle:   { damping: 22, stiffness: 120, mass: 1.0 },
  },
  duration: {
    fast:   150,
    normal: 250,
    slow:   400,
  },
} as const;

export const SHADOWS = {
  glow: {
    shadowColor: '#7B2FF7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  glowPink: {
    shadowColor: '#F107A3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  glowGold: {
    shadowColor: '#F5C842',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
};
