import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text } from '@components/ui/Text';
import { Font } from '@constants/index';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  style?: ViewStyle;
}

// Consistent gradient per person (hash of name → palette pair).
const GRADIENTS: [string, string][] = [
  ['#4f46e5', '#6366f1'], ['#2563eb', '#3b82f6'], ['#0891b2', '#06b6d4'],
  ['#059669', '#10b981'], ['#d97706', '#f59e0b'], ['#7c3aed', '#a855f7'],
  ['#db2777', '#ec4899'], ['#dc2626', '#ef4444'],
];

function gradientFor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[h];
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export function Avatar({ name, photoUrl, size = 40, style }: AvatarProps) {
  const radius = size / 2;
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[{ width: size, height: size, borderRadius: radius }, style as ImageStyle]}
      />
    );
  }
  const [c1, c2] = gradientFor(name);
  return (
    <LinearGradient
      colors={[c1, c2]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.wrap, { width: size, height: size, borderRadius: radius }, style]}>
      <Text color="#ffffff" style={{ fontFamily: Font.bold, fontSize: size * 0.38 }}>
        {initials(name)}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
