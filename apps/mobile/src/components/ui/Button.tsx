import React, { useCallback } from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Colors, Spacing, Radius } from '@constants/index';
import { haptic } from '@lib/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 48, lg: 56 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 16 };

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, style, textStyle, icon,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const bg: Record<ButtonVariant, string> = {
    primary:   Colors.accent,
    secondary: Colors.surface,
    ghost:     'transparent',
    danger:    Colors.danger,
  };

  const fg: Record<ButtonVariant, string> = {
    primary:   Colors.textPrimary,
    secondary: Colors.textPrimary,
    ghost:     Colors.accent,
    danger:    Colors.textPrimary,
  };

  const borderStyle = variant === 'secondary'
    ? { borderWidth: 1, borderColor: Colors.cardBorder }
    : variant === 'ghost' ? { borderWidth: 0 } : {};

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    if (loading || disabled) return;
    haptic.medium();
    scale.value = withSpring(0.97, undefined, () => {
      scale.value = withSpring(1);
    });
    onPress();
  }, [loading, disabled, onPress, scale]);

  return (
    <Animated.View style={[animStyle, style]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          styles.btn,
          { backgroundColor: bg[variant], height: HEIGHT[size] },
          borderStyle,
          (disabled || loading) && styles.disabled,
        ]}>
        {loading ? (
          <ActivityIndicator color={fg[variant]} size="small" />
        ) : (
          <View style={styles.inner}>
            {icon}
            <Text
              variant="bodyMedium"
              color={fg[variant]}
              style={[{ fontSize: FONT_SIZE[size] }, textStyle]}>
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  disabled: {
    opacity: 0.45
  },
});