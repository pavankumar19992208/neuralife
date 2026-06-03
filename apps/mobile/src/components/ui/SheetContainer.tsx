import React, { useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform,
} from 'react-native';
import { Surface, Border, RadiusToken, Space, Shadow } from '@constants/index';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;          // fixed height; omit for content-sized (capped at 88%)
  maxHeightPct?: number;    // default 0.88
}

/**
 * Standard bottom-sheet shell: backdrop fade + translateY spring + drag handle.
 * Every sheet in the app uses this so they all behave identically.
 */
export function SheetContainer({ visible, onClose, children, height, maxHeightPct = 0.88 }: Props) {
  const sheetH = height ?? SCREEN_H * maxHeightPct;
  const translateY = useRef(new Animated.Value(sheetH)).current;
  const backdrop   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, { toValue: sheetH, tension: 80, friction: 12, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, backdrop, sheetH]);

  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.backdrop, { opacity: backdrop }]}>
      <TouchableOpacity style={styles.backdropTap} activeOpacity={1} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          height ? { height } : { maxHeight: SCREEN_H * maxHeightPct },
          { transform: [{ translateY }] },
          Shadow.lg,
        ]}>
        <View style={styles.handleArea}><View style={styles.handle} /></View>
        {children}
        {Platform.OS === 'ios' ? <View style={styles.iosSpacer} /> : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Surface.backdrop, justifyContent: 'flex-end', zIndex: 200,
  },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: Surface.sheet,
    borderTopLeftRadius: RadiusToken.xxl, borderTopRightRadius: RadiusToken.xxl,
    overflow: 'hidden',
  },
  handleArea: { alignItems: 'center', paddingTop: Space.md, paddingBottom: Space.sm },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: Border.default },
  iosSpacer:  { height: 20 },
});
