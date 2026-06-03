import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@components/ui/Text';
import { Space, TextColor } from '@constants/index';

interface Props {
  label: string;
  right?: React.ReactNode;
  onDark?: boolean;
}

/** Uppercase section header with consistent padding. e.g. "TODAY'S SCHEDULE". */
export function SectionLabel({ label, right, onDark }: Props) {
  return (
    <View style={styles.row}>
      <Text
        variant="label"
        color={onDark ? TextColor.onDarkMuted : TextColor.muted}
        style={styles.label}>
        {label.toUpperCase()}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Space.xl, paddingTop: Space.lg, paddingBottom: Space.sm,
  },
  label: { letterSpacing: 1.2 },
});
