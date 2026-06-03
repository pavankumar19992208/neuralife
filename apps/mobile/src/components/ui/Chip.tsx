import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '@components/ui/Text';
import { Brand, Surface, Border, TextColor, RadiusToken, Space } from '@constants/index';
import { haptic } from '@lib/haptics';

type ChipSize = 'sm' | 'md' | 'lg';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  size?: ChipSize;
  style?: ViewStyle;
  disabled?: boolean;
  onDark?: boolean;
}

const HEIGHT: Record<ChipSize, number> = { sm: 28, md: 34, lg: 40 };
const FONT:   Record<ChipSize, number> = { sm: 12, md: 13, lg: 14 };
const PX:     Record<ChipSize, number> = { sm: 10, md: 14, lg: 18 };

export function Chip({ label, active, onPress, size = 'md', style, disabled, onDark }: ChipProps) {
  const handlePress = () => { if (disabled || !onPress) return; haptic.light(); onPress(); };

  const bg = active ? Brand.indigo : (onDark ? Surface.darkInput : Surface.card);
  const bd = active ? Brand.indigo : (onDark ? Border.darkDefault : Border.default);
  const fg = active ? '#ffffff' : (onDark ? TextColor.onDarkSec : TextColor.secondary);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled}
      style={[
        styles.chip,
        { height: HEIGHT[size], paddingHorizontal: PX[size], backgroundColor: bg, borderColor: bd },
        disabled && styles.disabled,
        style,
      ]}>
      <Text variant="smallMedium" color={fg} style={{ fontSize: FONT[size] }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: RadiusToken.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
