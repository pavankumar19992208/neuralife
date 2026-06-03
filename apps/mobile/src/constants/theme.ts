/**
 * NeuraLife Intelligence OS v3.0 Theme System
 *
 * Core Philosophy: "Teachers as Neural Operators of School Intelligence"
 * Premium International Academy aesthetic with neural intelligence cues
 */

// Neural Academy Palette
export const Palette = {
  // Neural Intelligence Core
  neuralBlue: '#1E40AF',
  neuralIndigo: '#4338CA',
  neuralViolet: '#7C3AED',

  // Academic Heritage
  academicGold: '#D97706',
  scholarRed: '#DC2626',

  // Base colors
  white: '#FFFFFF',
  black: '#000000',

  // Status
  successGreen: '#10B981',
  warningAmber: '#F59E0B',
  dangerRed: '#EF4444',
  infoBlue: '#3B82F6',

  // Additional colors needed by components
  blueBright: '#3B82F6',
  indigo: '#4338CA',
  indigoSoft: '#E0E7FF',
  gold: '#F59E0B',
} as const;

// Surface colors (background system)
export const Surface = {
  // Dark mode surfaces
  bg: '#0f172a',
  card: '#1e293b',
  cardHigh: '#334155',
  input: '#334155',
  darkInput: '#1e293b',
  glass: 'rgba(30, 41, 59, 0.8)',
  backdrop: 'rgba(15, 23, 42, 0.8)',
  sheet: '#1e293b',

  // Light mode surfaces
  bgLight: '#ffffff',
  cardLight: '#ffffff',
  cardLightHigh: '#f8fafc',
} as const;

// Border colors
export const Border = {
  default: 'rgba(255,255,255,0.08)',
  lightDefault: '#e2e8f0',
  subtle: 'rgba(255,255,255,0.05)',
  strong: 'rgba(255,255,255,0.12)',
  darkDefault: 'rgba(255,255,255,0.1)',
  glass: 'rgba(255,255,255,0.15)',
} as const;

// Text colors
export const TextColor = {
  primary: '#f1f5f9',
  secondary: '#94a3b8',
  muted: '#475569',
  accent: '#6366f1',

  lightPrimary: '#0f172a',
  lightSecondary: '#64748b',
  lightMuted: '#94a3b8',

  // Additional text colors
  onDarkSec: '#94a3b8',
  onDark: '#f1f5f9',
  onDarkMuted: '#64748b',
  dimmed: '#64748b',
} as const;

// Brand colors (context-aware)
export const Brand = {
  accent: '#6366f1',
  accentLight: '#818cf8',
  neural: Palette.neuralBlue,
  academic: Palette.academicGold,
  indigo: '#4338CA',
  indigoSoft: '#E0E7FF',
} as const;

// Semantic colors
export const Semantic = {
  success: Palette.successGreen,
  warning: Palette.warningAmber,
  danger: Palette.dangerRed,
  info: Palette.infoBlue,
  dangerBorder: '#FCA5A5',

  // Dimmed variants
  successDim: '#059669',
  warningDim: '#D97706',
  dangerDim: '#DC2626',
  infoDim: '#2563EB',
} as const;

// Spacing system
export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,

  // Teacher-optimized
  touchTarget: 44,
  scanGap: 20,
  neuralGap: 14,
} as const;

// Radius tokens
export const RadiusToken = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
} as const;

// Font system
export const Font = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  semibold: 'Inter-SemiBold', // alias for consistency
  bold: 'Inter-Bold',
  mono: 'monospace',
  telugu: 'NotoSansTelugu',
  academic: 'LibreBaskerville-Regular',
  academicBold: 'LibreBaskerville-Bold',
} as const;

// Dark theme colors
export const Dark = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceHigh: '#334155',
  border: 'rgba(255,255,255,0.08)',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',

  // Additional dark theme colors
  gold: '#F59E0B',
  accent: '#6366f1',
  input: '#334155',
  borderSubtle: 'rgba(255,255,255,0.05)',
} as const;

// Typography system
export const Type = {
  // Academic hierarchy (serif)
  academicDisplay: {
    fontSize: 32,
    fontWeight: '700' as const,
    fontFamily: Font.academicBold,
    letterSpacing: -0.5,
  },
  academicTitle: {
    fontSize: 24,
    fontWeight: '600' as const,
    fontFamily: Font.academic,
    letterSpacing: -0.3,
  },
  academicSubtitle: {
    fontSize: 18,
    fontWeight: '500' as const,
    fontFamily: Font.academic,
  },

  // Neural interface (sans)
  neuralDisplay: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  neuralTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  neuralSubtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
  },

  // Teacher interface (efficiency optimized)
  teacherHeading: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  teacherLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  teacherBody: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  teacherCaption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: TextColor.muted,
  },

  // Data & numbers
  dataLarge: {
    fontSize: 24,
    fontWeight: '700' as const,
    fontFamily: Font.mono,
  },
  dataMedium: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: Font.mono,
  },
  dataSmall: {
    fontSize: 12,
    fontWeight: '500' as const,
    fontFamily: Font.mono,
  },

  // Technical/ID information
  technical: {
    fontSize: 11,
    fontWeight: '400' as const,
    fontFamily: Font.mono,
    letterSpacing: 0.5,
  },
  technicalLarge: {
    fontSize: 14,
    fontWeight: '500' as const,
    fontFamily: Font.mono,
    letterSpacing: 0.3,
  },

  // Telugu content
  telugu: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: Font.telugu,
    lineHeight: 22,
  },
} as const;

// Spring animation configurations
export const SpringConfig = {
  teacherQuick: {
    damping: 20,
    stiffness: 300,
  },
  teacherStandard: {
    damping: 22,
    stiffness: 200,
  },
  neuralGentle: {
    damping: 24,
    stiffness: 180,
  },
  academicCalm: {
    damping: 30,
    stiffness: 150,
  },
  gentle: {
    damping: 26,
    stiffness: 160,
  },
} as const;

// Shadow system
export const Shadow = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  strong: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: '#6366f1',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// Subject colors
export const subjectColor = (subject: string): string => {
  const colors: Record<string, string> = {
    MATHEMATICS: '#3b82f6',
    ENGLISH: '#f59e0b',
    SCIENCE: '#10b981',
    TELUGU: '#ef4444',
    SOCIAL: '#8b5cf6',
    BIOLOGY: '#84cc16',
    HINDI: '#ec4899',
    PHYSICS: '#0ea5e9',
    CHEMISTRY: '#f97316',
  };
  return colors[subject.toUpperCase()] || '#6b7280';
};

export type PaletteKey = keyof typeof Palette;
export type SurfaceKey = keyof typeof Surface;
export type BorderKey = keyof typeof Border;
export type TextColorKey = keyof typeof TextColor;
export type BrandKey = keyof typeof Brand;
export type SemanticKey = keyof typeof Semantic;
export type SpaceKey = keyof typeof Space;
export type RadiusTokenKey = keyof typeof RadiusToken;
export type SpringConfigKey = keyof typeof SpringConfig;