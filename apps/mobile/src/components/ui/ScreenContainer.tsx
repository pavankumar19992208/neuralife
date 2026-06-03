import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { BackgroundView } from '@components/ui/BackgroundView';
import { Spacing } from '@constants/index';

type BgVariantType = 'light' | 'dark';

interface Props {
  variant?: BgVariantType;
  scrim?: 'none' | 'soft' | 'strong';
  animated?: boolean;
  overlayIntensity?: 'full' | 'subtle';
  scroll?: boolean;
  padded?: boolean;            // apply standard horizontal padding (default true)
  edges?: Edge[];
  contentStyle?: ViewStyle;
  children: React.ReactNode;
}

/**
 * Standard screen shell used by EVERY screen — guarantees consistent
 * background handling, safe-area, and horizontal margins app-wide.
 */
export function ScreenContainer({
  variant = 'light',
  scrim = 'soft',
  animated = false,
  overlayIntensity = 'full',
  scroll = false,
  padded = true,
  edges = ['top'],
  contentStyle,
  children,
}: Props) {
  const inner = padded ? [styles.padded, contentStyle] : contentStyle;

  return (
    <BackgroundView variant={variant} scrim={scrim} animated={animated} overlayIntensity={overlayIntensity}>
      <SafeAreaView style={styles.safe} edges={edges}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, inner]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, inner]}>{children}</View>
        )}
      </SafeAreaView>
    </BackgroundView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  flex:          { flex: 1 },
  padded:        { paddingHorizontal: Spacing.xl },
  scrollContent: { paddingBottom: Spacing.massive },
});