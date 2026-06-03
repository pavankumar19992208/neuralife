import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import {Text} from '@components/ui/Text';
import {Colors, Spacing} from '@constants/index';
import {API_URL} from '@env';

interface Props {
  visible: boolean;
  message?: string;
}

/**
 * Thin amber banner that slides in from the top when the API is unreachable.
 * Shows the current API_URL so dev can immediately see if the ngrok URL expired.
 * Does NOT block the screen — content behind it is still visible and scrollable.
 */
export function NetworkBanner({visible, message}: Props) {
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -60,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  return (
    <Animated.View style={[styles.banner, {transform: [{translateY}]}]}>
      <View style={styles.row}>
        <Text style={styles.icon}>⚠️</Text>
        <View style={styles.textGroup}>
          <Text variant="label" color="#92400e" style={styles.title}>
            {message ?? "Can't reach server"}
          </Text>
          <Text variant="caption" color="#78350f" numberOfLines={1} style={styles.url}>
            {API_URL}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fef3c7',   // amber-100
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d', // amber-300
    zIndex: 999,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  icon: {fontSize: 16},
  textGroup: {flex: 1},
  title: {fontWeight: '600'},
  url: {fontFamily: 'monospace', fontSize: 10},
});
