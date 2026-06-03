import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenContainer } from '@components/ui/ScreenContainer';
import { SegmentHeader } from '@components/ui/SegmentHeader';
import { EmptyState } from '@components/ui/EmptyState';
import { Space } from '@constants/index';

export function MyClassScreen() {
  return (
    <ScreenContainer variant="light" scrim="soft" padded={false}>
      <SegmentHeader title="My Class" caption="Every student in your care." />
      <View style={styles.body}>
        <EmptyState icon="🏫" title="Coming soon" subtitle="Your class teacher dashboard arrives in the next update." />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ body: { marginTop: Space.xl } });
