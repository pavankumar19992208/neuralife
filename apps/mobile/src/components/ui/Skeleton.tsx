import React, {useEffect} from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import {Colors, Radius} from '@constants/index';

interface SkeletonProps {
  height?: number;
  width?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({height = 16, width = '100%', borderRadius = Radius.sm, style}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, {duration: 800, easing: Easing.inOut(Easing.ease)}),
      -1, true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({opacity: opacity.value}));

  return (
    <Animated.View style={[{height, width: width as number, borderRadius, backgroundColor: '#f1f5f9'}, animStyle, style]} />
  );
}

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton height={40} width={40} borderRadius={20} style={styles.mr} />
        <View style={styles.flex}>
          <Skeleton height={14} width="60%" style={styles.mb} />
          <Skeleton height={12} width="40%" />
        </View>
      </View>
      <Skeleton height={12} style={styles.mt} />
      <Skeleton height={12} width="80%" style={styles.mt} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {backgroundColor: '#ffffff', borderRadius: Radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0'},
  row: {flexDirection: 'row', alignItems: 'center'},
  flex: {flex: 1},
  mr: {marginRight: 12},
  mb: {marginBottom: 6},
  mt: {marginTop: 8},
});
