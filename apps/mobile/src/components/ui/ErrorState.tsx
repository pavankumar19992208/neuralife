import React from 'react';
import { StyleSheet } from 'react-native';
import { Card } from '@components/ui/Card';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { Semantic, Space } from '@constants/index';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <Card style={styles.container} padding={Space.xxxl} accentLeft={Semantic.danger}>
      <Text style={styles.icon}>⚠️</Text>
      <Text variant="h3" style={styles.title}>Unable to load</Text>
      <Text variant="small" color={Semantic.danger} style={styles.subtitle}>{message}</Text>
      {onRetry ? <Button label="Retry" onPress={onRetry} variant="secondary" style={styles.btn} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: Space.xl, alignItems: 'center', marginTop: Space.xxl },
  icon:      { fontSize: 40, marginBottom: Space.md },
  title:     { textAlign: 'center', marginBottom: Space.xs },
  subtitle:  { textAlign: 'center', marginBottom: Space.md },
  btn:       { marginTop: Space.sm },
});
