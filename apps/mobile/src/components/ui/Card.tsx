import React from 'react';
import { View, ViewStyle, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors, Spacing, Radius } from '@constants/index';
import { useStaggerAnimation } from '@hooks/useEntryAnimation';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: (e: GestureResponderEvent) => void;
  index?: number;
  accentLeft?: string;
  padding?: number;
  variant?: 'solid' | 'glass';
}

export function Card({
  children,
  style,
  onPress,
  index = 0,
  accentLeft,
  padding,
  variant = 'solid',
}: CardProps) {
  const { animatedStyle } = useStaggerAnimation(index);

  const cardStyle: ViewStyle = {
    backgroundColor: variant === 'glass' ? 'rgba(255, 255, 255, 0.9)' : '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: padding ?? Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    ...(accentLeft && {
      borderLeftWidth: 3,
      borderLeftColor: accentLeft,
    }),
  };

  return (
    <Animated.View style={animatedStyle}>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[cardStyle, style]}>
          {children}
        </TouchableOpacity>
      ) : (
        <View style={[cardStyle, style]}>
          {children}
        </View>
      )}
    </Animated.View>
  );
}

export function GlassCard(props: CardProps) {
  return <Card {...props} variant="glass" />;
}