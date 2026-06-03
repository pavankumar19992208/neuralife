import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Semantic, Brand, RadiusToken } from '@constants/index';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'indigo';

const TONE: Record<Tone, string> = {
  success: Semantic.success, warning: Semantic.warning, danger: Semantic.danger,
  info: Semantic.info, indigo: Brand.indigo,
};

interface Props {
  pct: number;               // 0–100
  tone?: Tone;
  height?: number;
  trackColor?: string;
  style?: ViewStyle;
}

export function ProgressBar({ pct, tone = 'indigo', height = 6, trackColor, style }: Props) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(Math.max(0, Math.min(100, pct)), { duration: 600 }); }, [pct, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` as `${number}%` }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor ?? 'rgba(15,23,42,0.08)' }, style]}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: TONE[tone] }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: RadiusToken.full },
});
