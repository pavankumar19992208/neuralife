import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '@components/ui/Text';
import { Colors, Spacing, Radius } from '@constants/index';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  color?: string;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

const COLORS: Record<BadgeVariant, { fg: string; bg: string; bd: string }> = {
  success: { fg: Colors.success, bg: Colors.success + '1F', bd: Colors.success + '55' },
  warning: { fg: Colors.warning, bg: Colors.warning + '1F', bd: Colors.warning + '55' },
  danger:  { fg: Colors.danger,  bg: Colors.danger + '1F',  bd: Colors.danger + '55' },
  info:    { fg: Colors.info,    bg: Colors.info + '1F',    bd: Colors.info + '55' },
  accent:  { fg: Colors.accent,  bg: Colors.accent + '1F',  bd: Colors.accent + '55' },
  neutral: { fg: Colors.textMuted, bg: Colors.textMuted + '1F', bd: Colors.textMuted + '55' },
  default: { fg: Colors.textMuted, bg: Colors.textMuted + '1F', bd: Colors.textMuted + '55' },
};

export function Badge({ label, variant = 'neutral', color, style, size = 'sm' }: BadgeProps) {
  const c = COLORS[variant];
  const fg = color ?? c.fg;
  const bg = color ? color + '1F' : c.bg;
  const bd = color ? color + '55' : c.bd;

  return (
    <View style={[
      styles.badge,
      size === 'md' && styles.badgeMd,
      { backgroundColor: bg, borderColor: bd },
      style,
    ]}>
      <Text variant="label" color={fg} style={[styles.text, size === 'md' && styles.textMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5
  },
  text: {
    textTransform: 'uppercase',
    fontSize: 10
  },
  textMd: {
    fontSize: 11,
    letterSpacing: 0.6
  },
});