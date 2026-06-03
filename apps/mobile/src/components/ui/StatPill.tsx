import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '@components/ui/Text';
import { Semantic, RadiusToken, Space } from '@constants/index';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: Semantic.success, bg: Semantic.successDim },
  warning: { fg: Semantic.warning, bg: Semantic.warningDim },
  danger:  { fg: Semantic.danger,  bg: Semantic.dangerDim },
  info:    { fg: Semantic.info,    bg: Semantic.infoDim },
  neutral: { fg: '#475569',        bg: 'rgba(100,116,139,0.10)' },
};

interface Props {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}

/** Tiny coloured metric pill, e.g. "92% att." / "avg 78%". */
export function StatPill({ label, tone = 'neutral', style }: Props) {
  const t = TONE[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      <Text variant="caption" color={t.fg} style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Space.sm, paddingVertical: 3,
    borderRadius: RadiusToken.full, alignSelf: 'flex-start',
  },
  text: { fontSize: 11 },
});
