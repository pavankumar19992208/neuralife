import React from 'react';
import { StyleSheet } from 'react-native';
import { Card } from '@components/ui/Card';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { TextColor, Space } from '@constants/index';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <Card style={styles.container} padding={Space.xxxl}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text variant="h3" style={styles.title}>{title}</Text>
      {subtitle ? <Text variant="small" color={TextColor.secondary} style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? <Button label={action.label} onPress={action.onPress} variant="ghost" style={styles.btn} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: Space.xl, alignItems: 'center', marginTop: Space.xxl },
  icon:      { fontSize: 52, marginBottom: Space.md },
  title:     { textAlign: 'center', marginBottom: Space.xs },
  subtitle:  { textAlign: 'center', marginBottom: Space.md },
  btn:       { marginTop: Space.sm },
});
