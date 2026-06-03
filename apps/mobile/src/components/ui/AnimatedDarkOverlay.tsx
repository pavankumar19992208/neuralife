/**
 * AnimatedDarkOverlay — brings the dark background art to life.
 *   - Amber "brain" glow (top-right) that breathes (the hero).
 *   - Drifting blue particles.
 *   - Connection lines drawing the closed-loop story (full intensity only).
 *
 * intensity: 'full'   → glow + 12 particles + connection lines (Splash)
 *            'subtle' → glow + 5 particles, no lines (Login)
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line as SvgLine } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withRepeat, withTiming, withDelay, withSequence, Easing, cancelAnimation,
} from 'react-native-reanimated';
import { Palette } from '@constants/index';

const { width: W, height: H } = Dimensions.get('window');
const AnimatedLine = Animated.createAnimatedComponent(SvgLine);

// ── Brain glow ────────────────────────────────────────────────────────────────
function BrainGlow() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(t);
  }, [t]);

  const a = useAnimatedStyle(() => ({
    opacity: 0.25 + t.value * 0.30,
    transform: [{ scale: 1 + t.value * 0.15 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.glowWrap, a]}>
      <View style={[styles.glow, styles.glow3]} />
      <View style={[styles.glow, styles.glow2]} />
      <View style={[styles.glow, styles.glow1]} />
    </Animated.View>
  );
}

// ── Particle ────────────────────────────────────────────────────────────────
function Particle({ x, y, size, delay, dur }: { x: number; y: number; size: number; delay: number; dur: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.ease) }), -1, false));
    return () => cancelAnimation(p);
  }, [p, delay, dur]);

  const a = useAnimatedStyle(() => ({
    transform: [{ translateY: -p.value * 48 }],
    opacity: p.value < 0.5 ? p.value * 1.2 : (1 - p.value) * 1.2,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { left: x, top: y, width: size, height: size, borderRadius: size / 2 },
        a,
      ]}
    />
  );
}

// ── Connection lines ──────────────────────────────────────────────────────────
const NODES = {
  smartpad:   { x: 0.13, y: 0.09 }, school:    { x: 0.47, y: 0.10 }, brain:     { x: 0.85, y: 0.11 },
  constel:    { x: 0.12, y: 0.30 }, network:   { x: 0.83, y: 0.30 }, teacher:   { x: 0.83, y: 0.48 },
  parent:     { x: 0.11, y: 0.60 }, analytics: { x: 0.83, y: 0.72 }, idcard:    { x: 0.13, y: 0.82 },
  bluetooth:  { x: 0.47, y: 0.88 },
};
const EDGES: Array<[keyof typeof NODES, keyof typeof NODES]> = [
  ['smartpad', 'school'], ['school', 'brain'], ['brain', 'network'],
  ['network', 'teacher'], ['teacher', 'analytics'], ['analytics', 'bluetooth'],
  ['bluetooth', 'idcard'], ['idcard', 'parent'], ['parent', 'constel'], ['constel', 'smartpad'],
];

function ConnectionLine({ x1, y1, x2, y2, delay }: { x1: number; y1: number; x2: number; y2: number; delay: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const draw = useSharedValue(len);
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    draw.value = withDelay(delay, withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }));
    pulse.value = withDelay(delay + 500, withRepeat(withTiming(0.6, { duration: 1800 }), -1, true));
    return () => { cancelAnimation(draw); cancelAnimation(pulse); };
  }, [draw, pulse, delay]);

  const props = useAnimatedProps(() => ({ strokeDashoffset: draw.value, strokeOpacity: pulse.value }));
  return (
    <AnimatedLine
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={Palette.blueBright} strokeWidth={0.8}
      strokeDasharray={len} animatedProps={props}
    />
  );
}

function Constellation() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      {EDGES.map(([a, b], i) => {
        const n1 = NODES[a], n2 = NODES[b];
        return (
          <ConnectionLine
            key={i}
            x1={n1.x * W} y1={n1.y * H} x2={n2.x * W} y2={n2.y * H}
            delay={300 + i * 160}
          />
        );
      })}
    </Svg>
  );
}

// ── Overlay ────────────────────────────────────────────────────────────────────
const PARTICLES_FULL = [
  { x: 0.20, y: 0.25, s: 3 }, { x: 0.78, y: 0.20, s: 2 }, { x: 0.35, y: 0.45, s: 2 },
  { x: 0.62, y: 0.38, s: 3 }, { x: 0.15, y: 0.55, s: 2 }, { x: 0.88, y: 0.52, s: 2 },
  { x: 0.45, y: 0.62, s: 3 }, { x: 0.72, y: 0.68, s: 2 }, { x: 0.28, y: 0.72, s: 2 },
  { x: 0.55, y: 0.78, s: 3 }, { x: 0.82, y: 0.82, s: 2 }, { x: 0.38, y: 0.30, s: 2 },
];

export function AnimatedDarkOverlay({ intensity = 'full' }: { intensity?: 'full' | 'subtle' }) {
  const particles = intensity === 'full' ? PARTICLES_FULL : PARTICLES_FULL.slice(0, 5);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {intensity === 'full' ? <Constellation /> : null}
      {particles.map((p, i) => (
        <Particle
          key={i}
          x={p.x * W} y={p.y * H} size={p.s}
          delay={i * 600} dur={6000 + (i % 4) * 1200}
        />
      ))}
      <BrainGlow />
    </View>
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    position: 'absolute',
    top: H * 0.06, right: W * 0.04,
    width: 130, height: 130,
    alignItems: 'center', justifyContent: 'center',
  },
  glow:  { position: 'absolute', borderRadius: 999 },
  glow1: { width: 60,  height: 60,  backgroundColor: 'rgba(245,166,35,0.45)' },
  glow2: { width: 96,  height: 96,  backgroundColor: 'rgba(245,166,35,0.22)' },
  glow3: { width: 130, height: 130, backgroundColor: 'rgba(245,166,35,0.10)' },
  particle: { position: 'absolute', backgroundColor: Palette.blueBright },
});
