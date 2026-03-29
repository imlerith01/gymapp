import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const COLORS = {
  bg: '#0A0A0F',
  surface: '#12121A',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassHighlight: 'rgba(255, 255, 255, 0.12)',
  accent: '#E8A838',
  accentGlow: 'rgba(232, 168, 56, 0.15)',
  accentSoft: 'rgba(232, 168, 56, 0.08)',
  volume: '#3B82F6',
  volumeGlow: 'rgba(59, 130, 246, 0.15)',
  strenght: '#E8A838',
  strenghtGlow: 'rgba(232, 168, 56, 0.15)',
  deload: '#22C55E',
  deloadGlow: 'rgba(34, 197, 94, 0.15)',
  success: '#22C55E',
  textPrimary: '#F1F1F6',
  textSecondary: 'rgba(255, 255, 255, 0.5)',
  textTertiary: 'rgba(255, 255, 255, 0.3)',
  coachBorder: '#E8A838',
  coachBg: 'rgba(232, 168, 56, 0.06)',
  inputBg: 'rgba(255, 255, 255, 0.04)',
  inputBorder: 'rgba(255, 255, 255, 0.08)',
  gradientStart: '#0F0F18',
  gradientEnd: '#0A0A0F',
} as const;

export const TYPE_COLORS: Record<string, { color: string; glow: string }> = {
  VOLUME: { color: COLORS.volume, glow: COLORS.volumeGlow },
  STRENGHT: { color: COLORS.strenght, glow: COLORS.strenghtGlow },
  DELOAD: { color: COLORS.deload, glow: COLORS.deloadGlow },
};

export const glassCard: ViewStyle = {
  backgroundColor: COLORS.glass,
  borderWidth: 1,
  borderColor: COLORS.glassBorder,
  borderRadius: 20,
};

export const glassCardInner: ViewStyle = {
  backgroundColor: 'transparent',
  borderRadius: 19,
  overflow: 'hidden',
};

export const SHADOWS = StyleSheet.create({
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});

export const FONTS = {
  title: {
    fontSize: 28,
    fontWeight: '800' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    color: COLORS.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.8,
    textTransform: 'uppercase' as TextStyle['textTransform'],
    color: COLORS.textTertiary,
  },
  mono: {
    fontSize: 48,
    fontWeight: '200' as TextStyle['fontWeight'],
    letterSpacing: 2,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
};
