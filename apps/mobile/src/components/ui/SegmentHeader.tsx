import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { useTitleAnimation, useEntryAnimation } from '@hooks/useEntryAnimation';
import { TextColor, Space } from '@constants/index';
import { haptic } from '@lib/haptics';

interface Props {
  title: string;
  caption?: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  onDark?: boolean;
}

export function SegmentHeader({ title, caption, subtitle, rightElement, showBack, onBack, onDark }: Props) {
  const titleAnim   = useTitleAnimation(0);
  const captionAnim = useEntryAnimation({ delay: 120 });
  const sub = caption ?? subtitle;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity
            onPress={() => { haptic.light(); onBack?.(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backBtn}>
            <Animated.Text style={[styles.backArrow, { color: onDark ? TextColor.onDark : TextColor.accent }, titleAnim]}>‹</Animated.Text>
          </TouchableOpacity>
        )}
        <View style={styles.textBlock}>
          <Animated.View style={titleAnim}>
            <Text variant="h2" onDark={onDark}>{title}</Text>
          </Animated.View>
          {sub ? (
            <Animated.View style={captionAnim.animatedStyle}>
              <Text variant="small" onDark={onDark} color={onDark ? TextColor.onDarkSec : TextColor.secondary} style={styles.caption}>
                {sub}
              </Text>
            </Animated.View>
          ) : null}
        </View>
        {rightElement ? <View style={styles.right}>{rightElement}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Space.xl, paddingTop: Space.xxl, paddingBottom: Space.md },
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  backBtn:   { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  backArrow: { fontSize: 32, lineHeight: 32, fontWeight: '300' },
  textBlock: { flex: 1 },
  caption:   { marginTop: 3 },
  right:     { alignSelf: 'center' },
});
