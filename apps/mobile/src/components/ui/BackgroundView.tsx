/**
 * BackgroundView — screen background system.
 *
 *   DARK  (splash / login / OTP): bg-dark.png + navy scrim + optional AnimatedDarkOverlay.
 *
 *   LIGHT (every other screen): SVG radial gradient (exact match of the CSS spec below)
 *                               + FloatingIconsLayer (ambient branded watermark at 0.065 opacity).
 *
 *   CSS reference:
 *     background: radial-gradient(ellipse 130% 90% at 50% 40%,
 *       #ffffff 0%, #ebf5ff 28%, #cce5f5 70%, #aacde8 100%);
 */

import React from 'react';
import {View, Image, StyleSheet, StatusBar, ViewStyle, Dimensions} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Defs, RadialGradient, Stop, Rect, LinearGradient as SvgLinearGradient} from 'react-native-svg';
import {Colors} from '@constants/index';
import {AnimatedDarkOverlay} from '@components/ui/AnimatedDarkOverlay';
import {FloatingIconsLayer} from '@components/ui/FloatingIconsLayer';

const {width: W, height: H} = Dimensions.get('window');

const BG_DARK = require('../../assets/backgrounds/bg-dark.png');

type BgVariantType = 'light' | 'dark';
type Scrim = 'none' | 'soft' | 'strong';

interface Props {
  variant?: BgVariantType;
  children: React.ReactNode;
  scrim?: Scrim;
  animated?: boolean;
  overlayIntensity?: 'full' | 'subtle';
  style?: ViewStyle;
}

/**
 * Neural Intelligence Grid - Clean professional pattern for EdTech
 * Subtle grid with neural connection hints, very low opacity
 */
function NeuralIntelligenceGrid() {
  const gridSize = 40;
  const cols = Math.ceil(W / gridSize) + 1;
  const rows = Math.ceil(H / gridSize) + 1;

  return (
    <Svg
      width={W}
      height={H}
      style={StyleSheet.absoluteFill}
      pointerEvents="none">
      <Defs>
        <SvgLinearGradient
          id="intelligenceGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
          gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#f8fafc" />
          <Stop offset="50%" stopColor="#ffffff" />
          <Stop offset="100%" stopColor="#f1f5f9" />
        </SvgLinearGradient>
      </Defs>

      {/* Clean gradient background */}
      <Rect width={W} height={H} fill="url(#intelligenceGradient)" />

      {/* Subtle grid pattern */}
      {Array.from({length: cols}).map((_, i) => (
        <Rect
          key={`col-${i}`}
          x={i * gridSize}
          y={0}
          width={0.5}
          height={H}
          fill="rgba(30, 64, 175, 0.04)"
        />
      ))}
      {Array.from({length: rows}).map((_, i) => (
        <Rect
          key={`row-${i}`}
          x={0}
          y={i * gridSize}
          width={W}
          height={0.5}
          fill="rgba(30, 64, 175, 0.04)"
        />
      ))}
    </Svg>
  );
}

function BackgroundViewImpl({
  variant = 'light',
  children,
  scrim = 'soft',
  animated = false,
  overlayIntensity = 'full',
  style,
}: Props) {

  // ── DARK variant — unchanged ───────────────────────────────────────────────
  if (variant === 'dark') {
    return (
      <View style={[styles.root, {backgroundColor: Colors.bg}, style]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <Image source={BG_DARK} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(10,24,64,0)', 'rgba(5,11,37,0.55)']}
          locations={[0.45, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {animated ? <AnimatedDarkOverlay intensity={overlayIntensity} /> : null}
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  // ── LIGHT variant — Neural Intelligence OS v3.0 clean professional background ──────────
  return (
    <View style={[styles.root, {backgroundColor: '#ffffff'}, style]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Neural Intelligence Grid - subtle professional pattern */}
      <NeuralIntelligenceGrid />

      {/* Clean intelligence overlay */}
      {scrim !== 'none' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: scrim === 'strong'
                ? 'rgba(248, 250, 252, 0.85)'
                : 'rgba(248, 250, 252, 0.4)'
            }
          ]}
          pointerEvents="none"
        />
      )}

      <View style={styles.content}>{children}</View>
    </View>
  );
}

export const BackgroundView = React.memo(BackgroundViewImpl);

const styles = StyleSheet.create({
  root:    {flex: 1},
  content: {flex: 1},
});