import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from '@components/ui/Text';
import { useSyncStore } from '@store/syncStore';
import { Semantic, Surface, Border, Shadow, RadiusToken, Space } from '@constants/index';

export function SyncPill() {
  const { status, pendingCount } = useSyncStore();
  const dotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'OFFLINE') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(dotScale, { toValue: 1.5, duration: 600, useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    }
  }, [status, dotScale]);

  if (status === 'LIVE') return null;

  const cfg = {
    PENDING: { color: Semantic.warning, text: `${pendingCount} pending` },
    OFFLINE: { color: Semantic.danger,  text: 'Offline' },
    SYNCING: { color: Semantic.info,    text: 'Syncing…' },
    LIVE:    { color: Semantic.success, text: 'Live' },
  }[status];

  return (
    <View style={[styles.pill, Shadow.sm]}>
      <Animated.View style={[styles.dot, { backgroundColor: cfg.color, transform: [{ scale: dotScale }] }]} />
      <Text variant="caption" color={cfg.color} style={styles.text}>{cfg.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RadiusToken.full, borderWidth: 1,
    borderColor: Border.lightDefault, backgroundColor: Surface.cardLight,
    marginTop: Space.xs,
  },
  dot:  { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontSize: 11 },
});
