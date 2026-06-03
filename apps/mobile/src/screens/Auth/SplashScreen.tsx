/**
 * SplashScreen — Neural Intelligence Intro Sequence v2
 *
 * Premium design:
 *   • 3 rings — outer (22 s), middle (16 s CCW, blue comet), inner (10 s, gold comet)
 *   • 4 data-pulse dots travel from outer cards toward the brain on connection
 *   • Brain scales + glows on each incoming connection
 *   • Grand celebration glow when all nodes are linked
 *   • 3-D card icons with SVG gradients and depth faces
 *   • 10.5-second loop so every frame plays before restart
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Pressable, StyleSheet, Dimensions, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withRepeat, withSequence, withSpring,
  Easing, cancelAnimation, interpolate,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {
  Circle as SvgCircle, Line as SvgLine, Ellipse as SvgEllipse,
  Path as SvgPath, Defs, Marker, Polygon, Rect, Stop,
  LinearGradient as SvgGrad,
} from 'react-native-svg';

import { GoldWordmark } from '@components/ui/GoldWordmark';
import { Text } from '@components/ui/Text';
import { rv } from '@lib/responsive';

// ─── Module-level geometry (stable across renders) ────────────────────────────

const { width: W, height: H } = Dimensions.get('window');
const STAGE = Math.min(260, W - 40);
const SC    = STAGE / 280;
const CARD  = Math.round(56 * SC);
const HALF  = STAGE / 2;
const s     = (n: number): number => Math.round(n * SC);

// Dot paths — all travel FROM outer card TOWARD the brain
const DOT_PATHS = [
  { sx: s(140), sy: s(52),  ex: s(140), ey: s(108), color: '#4a8fff' }, // top card ↓
  { sx: s(228), sy: s(140), ex: s(172), ey: s(140), color: '#4a8fff' }, // right card ←
  { sx: s(140), sy: s(220), ex: s(140), ey: s(172), color: '#D4A847' }, // bottom card ↑
  { sx: s(52),  sy: s(140), ex: s(108), ey: s(140), color: '#D4A847' }, // left card  →
] as const;

const MSGS = [
  'Arjun: sign error in Ch.4 — flagged 3×',
  'Priya: +18% this week · parent alert sent',
  'Grade 8-A: 2 AT-RISK students detected',
  'Neural network synchronised',
  'every student known',
];

const PILLS = ['Edge AI On-Device', 'NeuraID', 'Offline-First', 'Telugu + English', 'NeuraSphere'];

interface Props { onComplete: () => void }

// ─── Particle ────────────────────────────────────────────────────────────────

function Particle({ x, size, dur, delay, mo }: {
  x: number; size: number; dur: number; delay: number; mo: number;
}) {
  const ty = useSharedValue(H);
  useEffect(() => {
    ty.value = withDelay(delay, withRepeat(withTiming(-50, { duration: dur, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(ty);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: interpolate(ty.value, [H, H * 0.6, H * 0.1, -50], [0, mo, mo * 0.5, 0]),
  }));
  return <Animated.View style={[styles.particle, { left: x, width: size, height: size, borderRadius: size / 2 }, style]} />;
}

// ─── 3-D Card Icons ───────────────────────────────────────────────────────────

/** SmartPad — tablet with glowing screen, slight 3-D extrusion */
function IconSmartPad() {
  return (
    <Svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <Defs>
        <SvgGrad id="spBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#60a5fa" /><Stop offset="1" stopColor="#1d4ed8" />
        </SvgGrad>
        <SvgGrad id="spScr" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0f1e5c" /><Stop offset="1" stopColor="#050d2e" />
        </SvgGrad>
      </Defs>
      {/* depth shadow */}
      <Rect x="7.5" y="5" width="13" height="19" rx="2.5" fill="rgba(0,0,0,0.35)" />
      {/* right extrusion face */}
      <SvgPath d="M20 4.5 L22 6 L22 22.5 L20 24 Z" fill="#1e3a8a" opacity="0.85" />
      {/* bottom extrusion face */}
      <SvgPath d="M6 24 L8 25.5 L22 25.5 L20 24 Z" fill="#1e3a8a" opacity="0.65" />
      {/* main body */}
      <Rect x="6" y="4" width="14" height="20" rx="2.5" fill="url(#spBody)" />
      {/* screen */}
      <Rect x="8" y="6" width="10" height="13" rx="1" fill="url(#spScr)" />
      {/* data lines on screen */}
      <SvgLine x1="9.5" y1="9"  x2="16.5" y2="9"  stroke="#60a5fa" strokeWidth="1"   opacity="0.8" />
      <SvgLine x1="9.5" y1="11" x2="14.5" y2="11" stroke="#60a5fa" strokeWidth="0.9" opacity="0.55" />
      <SvgLine x1="9.5" y1="13" x2="15.5" y2="13" stroke="#D4A847" strokeWidth="0.9" opacity="0.7" />
      {/* AI cursor dot */}
      <SvgCircle cx="16" cy="10" r="1.6" fill="#D4A847" opacity="0.95" />
      {/* home button */}
      <SvgCircle cx="13" cy="21.5" r="1.2" fill="rgba(148,196,253,0.35)" stroke="#60a5fa" strokeWidth="0.6" />
      {/* top specular highlight */}
      <Rect x="6" y="4" width="14" height="1.2" rx="1" fill="rgba(255,255,255,0.28)" />
    </Svg>
  );
}

/** Teacher Insights — person with graduation cap + 3-D analytics bars */
function IconTeacher() {
  return (
    <Svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <Defs>
        <SvgGrad id="tBod" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#60a5fa" /><Stop offset="1" stopColor="#2563eb" />
        </SvgGrad>
      </Defs>
      {/* ground shadow */}
      <SvgEllipse cx="11" cy="27" rx="6" ry="1.2" fill="rgba(0,0,0,0.25)" />
      {/* body */}
      <SvgPath d="M6 25c0-4.5 2.2-6.5 5-6.5s5 2 5 6.5H6Z" fill="url(#tBod)" />
      <SvgPath d="M16 25c0-4.5-2.2-6.5-5-6.5v6.5c1.5-0.2 5-0.5 5-6.5Z" fill="#1d4ed8" opacity="0.6" />
      {/* head */}
      <SvgCircle cx="11" cy="11" r="5" fill="url(#tBod)" />
      <SvgPath d="M11 6a5 5 0 010 10c2.8 0 5-2.2 5-5s-2.2-5-5-5Z" fill="#1d4ed8" opacity="0.5" />
      {/* cap brim */}
      <SvgPath d="M5.5 9.5L11 7L16.5 9.5L11 12Z" fill="#1e40af" />
      <SvgPath d="M5.5 9.5L11 7L16.5 9.5" stroke="rgba(255,255,255,0.3)" strokeWidth="0.7" fill="none" />
      {/* 3D bars — right side, gold */}
      <Rect x="17.5" y="19" width="2.2" height="5" rx="0.6" fill="#fbbf24" />
      <SvgPath d="M19.7 19 L20.9 19.8 L20.9 24.8 L19.7 24 Z" fill="#d97706" opacity="0.8" />
      <Rect x="17.5" y="19" width="2.2" height="0.9" rx="0.5" fill="rgba(255,255,255,0.4)" />

      <Rect x="20.5" y="16" width="2.2" height="8" rx="0.6" fill="#f59e0b" />
      <SvgPath d="M22.7 16 L23.9 16.8 L23.9 24.8 L22.7 24 Z" fill="#b45309" opacity="0.8" />
      <Rect x="20.5" y="16" width="2.2" height="0.9" rx="0.5" fill="rgba(255,255,255,0.38)" />

      <Rect x="23.5" y="13.5" width="2.2" height="10.5" rx="0.6" fill="#D4A847" />
      <SvgPath d="M25.7 13.5 L26.9 14.3 L26.9 24.8 L25.7 24 Z" fill="#92400e" opacity="0.8" />
      <Rect x="23.5" y="13.5" width="2.2" height="0.9" rx="0.5" fill="rgba(255,255,255,0.38)" />
    </Svg>
  );
}

/** Parent Update — phone in 3-D with notification badge */
function IconParent() {
  return (
    <Svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <Defs>
        <SvgGrad id="ph" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fcd34d" /><Stop offset="1" stopColor="#d97706" />
        </SvgGrad>
        <SvgGrad id="scr2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0d1b4e" /><Stop offset="1" stopColor="#060e2e" />
        </SvgGrad>
      </Defs>
      {/* shadow */}
      <Rect x="6.5" y="5" width="13" height="20" rx="2.5" fill="rgba(0,0,0,0.3)" />
      {/* right extrusion */}
      <SvgPath d="M19 4.5 L21 6 L21 23.5 L19 25 Z" fill="#92400e" opacity="0.75" />
      <SvgPath d="M6 25 L8 26.5 L21 26.5 L19 25 Z" fill="#92400e" opacity="0.55" />
      {/* body */}
      <Rect x="5" y="3.5" width="14" height="22" rx="2.5" fill="url(#ph)" />
      {/* screen */}
      <Rect x="7" y="6" width="10" height="15" rx="1" fill="url(#scr2)" />
      {/* message lines */}
      <SvgLine x1="8.5" y1="10" x2="15.5" y2="10" stroke="#D4A847" strokeWidth="1"   opacity="0.8" />
      <SvgLine x1="8.5" y1="12" x2="13.5" y2="12" stroke="#fbbf24" strokeWidth="0.9" opacity="0.55" />
      <SvgLine x1="8.5" y1="14" x2="15.5" y2="14" stroke="#fbbf24" strokeWidth="0.9" opacity="0.6" />
      {/* check-mark */}
      <SvgPath d="M9 17L11 19L15.5 14.5" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* home circle */}
      <SvgCircle cx="12" cy="23" r="1.3" fill="rgba(253,211,77,0.35)" stroke="#fcd34d" strokeWidth="0.6" />
      {/* notification badge */}
      <SvgCircle cx="19" cy="5" r="4.5" fill="rgba(26,79,255,0.2)" stroke="#4a8fff" strokeWidth="1" />
      <SvgPath d="M17.5 4.8C17.5 3.8 19 3 19 3S20.5 3.8 20.5 4.8V6H17.5V4.8Z" fill="#4a8fff" />
      <SvgLine x1="17.5" y1="6" x2="20.5" y2="6" stroke="#4a8fff" strokeWidth="0.8" />
      {/* specular */}
      <Rect x="5" y="3.5" width="14" height="1.2" rx="1" fill="rgba(255,255,255,0.3)" />
    </Svg>
  );
}

/** Principal Dashboard — 3-D building with analytics overlay */
function IconPrincipal() {
  return (
    <Svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <Defs>
        <SvgGrad id="bld" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fcd34d" /><Stop offset="1" stopColor="#b45309" />
        </SvgGrad>
        <SvgGrad id="bld2" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#fcd34d" /><Stop offset="1" stopColor="#d97706" />
        </SvgGrad>
      </Defs>
      {/* shadow */}
      <SvgEllipse cx="12" cy="27.5" rx="9" ry="1.3" fill="rgba(0,0,0,0.25)" />
      {/* right extrusion face */}
      <SvgPath d="M20 7 L23 8.5 L23 25.5 L20 24 Z" fill="#92400e" opacity="0.75" />
      {/* building front */}
      <Rect x="3" y="7" width="17" height="18" rx="0.5" fill="url(#bld)" />
      {/* roof / top face */}
      <SvgPath d="M3 7 L6 5 L23 5 L20 7 Z" fill="url(#bld2)" />
      {/* windows — 3×3 grid with glow */}
      {[10, 13.5, 17].map((cy, row) =>
        [5, 9, 13, 17].map((cx, col) => (
          <Rect
            key={`w${row}${col}`}
            x={cx} y={cy} width="2.5" height="2"
            rx="0.4"
            fill={row === 0 && col === 2 ? '#fbbf24' : 'rgba(12,30,90,0.85)'}
            stroke={row === 0 && col === 2 ? '#fcd34d' : 'rgba(253,211,77,0.3)'}
            strokeWidth="0.5"
          />
        ))
      )}
      {/* door */}
      <Rect x="9" y="19.5" width="4" height="5.5" rx="0.5" fill="rgba(12,30,90,0.9)" stroke="rgba(253,211,77,0.4)" strokeWidth="0.5" />
      {/* analytics trend line overlay */}
      <SvgPath d="M4.5 15 L8 13 L11 14.5 L15 11 L19 9.5" stroke="#4a8fff" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <SvgCircle cx="19" cy="9.5" r="1.5" fill="#4a8fff" opacity="0.9" />
      {/* specular on roof */}
      <SvgPath d="M3 7 L6 5 L23 5 L20 7" fill="rgba(255,255,255,0.2)" />
    </Svg>
  );
}

const CARD_ICONS    = [IconSmartPad, IconTeacher, IconParent, IconPrincipal];
const CARD_LABELS   = [['Student', 'SmartPad'], ['Teacher', 'Insights'], ['Parent', 'Update'], ['Principal', 'Dashboard']];
const CARD_GLOW_CLR = ['#4a8fff', '#4a8fff', '#D4A847', '#D4A847'];

// ─── Brain SVG ────────────────────────────────────────────────────────────────

function BrainSvg({ size }: { size: number }) {
  return (
    <Svg width={size} height={size * 0.91} viewBox="0 0 44 40" fill="none">
      <Defs>
        <SvgGrad id="brG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#93c5fd" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#4a8fff" stopOpacity="0.7" />
        </SvgGrad>
      </Defs>
      <SvgEllipse cx="22" cy="20" rx="16" ry="14" stroke="url(#brG)" strokeWidth="1.8" />
      <SvgPath d="M22 6C14 6 8 12 8 20"  stroke="#93c5fd" strokeWidth="1.4" />
      <SvgPath d="M22 6C30 6 36 12 36 20" stroke="#93c5fd" strokeWidth="1.4" />
      <SvgLine x1="22" y1="6"  x2="22" y2="34" stroke="#60a5fa" strokeWidth="1"   opacity="0.5" />
      <SvgLine x1="10" y1="20" x2="34" y2="20" stroke="#60a5fa" strokeWidth="1"   opacity="0.5" />
      <SvgCircle cx="16" cy="14" r="2.4" fill="#D4A847" />
      <SvgCircle cx="28" cy="14" r="2.4" fill="#D4A847" />
      <SvgCircle cx="12" cy="22" r="1.8" fill="#60a5fa" opacity="0.9" />
      <SvgCircle cx="22" cy="12" r="1.8" fill="#60a5fa" opacity="0.9" />
      <SvgCircle cx="32" cy="22" r="1.8" fill="#60a5fa" opacity="0.9" />
      <SvgCircle cx="22" cy="26" r="1.8" fill="#D4A847" opacity="0.9" />
      {/* specular highlight on top */}
      <SvgEllipse cx="18" cy="12" rx="5" ry="2.5" fill="rgba(255,255,255,0.12)" />
    </Svg>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function SplashScreen({ onComplete }: Props) {
  const insets = useSafeAreaInsets();

  // ── Shared values ────────────────────────────────────────────────────────────
  const ring1Rot     = useSharedValue(0);
  const ring2Rot     = useSharedValue(0);
  const ring3Rot     = useSharedValue(0);
  const glowOp       = useSharedValue(0.45);
  const glowSc       = useSharedValue(1);
  const brainPulse   = useSharedValue(1);
  const bigGlowOp    = useSharedValue(0);
  const bigGlowSc    = useSharedValue(1);
  const ailOp        = useSharedValue(0);
  // Cards
  const c0o = useSharedValue(0); const c0s = useSharedValue(0.35);
  const c1o = useSharedValue(0); const c1s = useSharedValue(0.35);
  const c2o = useSharedValue(0); const c2s = useSharedValue(0.35);
  const c3o = useSharedValue(0); const c3s = useSharedValue(0.35);
  // Lines
  const l0o = useSharedValue(0); const l1o = useSharedValue(0);
  const l2o = useSharedValue(0); const l3o = useSharedValue(0);
  // Data-pulse dots (progress 0→1 = card → brain)
  const d0p = useSharedValue(0); const d1p = useSharedValue(0);
  const d2p = useSharedValue(0); const d3p = useSharedValue(0);
  // Logo section
  const logoOp   = useSharedValue(0);
  const logoSc   = useSharedValue(0.82);
  const logoY    = useSharedValue(18);
  const subOp    = useSharedValue(0);
  const divOp    = useSharedValue(0);
  const capOp    = useSharedValue(0);
  const pillsOp  = useSharedValue(0);

  // ── React state (JS side) ────────────────────────────────────────────────────
  const [cardLit, setCardLit]       = useState([false, false, false, false]);
  const [bubbleText, setBubble]     = useState('');
  const [bubbleVis, setBubbleVis]   = useState(false);

  // ── Animated styles ──────────────────────────────────────────────────────────
  const ring1Style      = useAnimatedStyle(() => ({ transform: [{ rotate: `${ring1Rot.value}deg` }] }));
  const ring2Style      = useAnimatedStyle(() => ({ transform: [{ rotate: `${ring2Rot.value}deg` }] }));
  const ring3Style      = useAnimatedStyle(() => ({ transform: [{ rotate: `${ring3Rot.value}deg` }] }));

  // Comet on ring-2 (CCW, blue)
  const ring2CometStyle = useAnimatedStyle(() => {
    const a = ring2Rot.value * (Math.PI / 180);
    const r = Math.round(98 * SC);
    return { transform: [{ translateX: HALF + r * Math.cos(a) - 3 }, { translateY: HALF + r * Math.sin(a) - 3 }] };
  });
  // Comet on ring-3 (CW, gold)
  const ring3CometStyle = useAnimatedStyle(() => {
    const a = ring3Rot.value * (Math.PI / 180);
    const r = Math.round(74 * SC);
    return { transform: [{ translateX: HALF + r * Math.cos(a) - 2.5 }, { translateY: HALF + r * Math.sin(a) - 2.5 }] };
  });

  const glowStyle   = useAnimatedStyle(() => ({ opacity: glowOp.value, transform: [{ scale: glowSc.value }] }));
  const pulseStyle  = useAnimatedStyle(() => ({ transform: [{ scale: brainPulse.value }] }));
  const bigGlStyle  = useAnimatedStyle(() => ({ opacity: bigGlowOp.value, transform: [{ scale: bigGlowSc.value }] }));
  const ailStyle    = useAnimatedStyle(() => ({ opacity: ailOp.value }));

  const c0Style = useAnimatedStyle(() => ({ opacity: c0o.value, transform: [{ scale: c0s.value }] }));
  const c1Style = useAnimatedStyle(() => ({ opacity: c1o.value, transform: [{ scale: c1s.value }] }));
  const c2Style = useAnimatedStyle(() => ({ opacity: c2o.value, transform: [{ scale: c2s.value }] }));
  const c3Style = useAnimatedStyle(() => ({ opacity: c3o.value, transform: [{ scale: c3s.value }] }));
  const cardStyles = [c0Style, c1Style, c2Style, c3Style];

  const l0Style = useAnimatedStyle(() => ({ opacity: l0o.value }));
  const l1Style = useAnimatedStyle(() => ({ opacity: l1o.value }));
  const l2Style = useAnimatedStyle(() => ({ opacity: l2o.value }));
  const l3Style = useAnimatedStyle(() => ({ opacity: l3o.value }));
  const lineStyles = [l0Style, l1Style, l2Style, l3Style];

  // Traveling dots — each is a View at absolute (0,0) moved via transform
  const dot0Style = useAnimatedStyle(() => {
    const p = d0p.value;
    const { sx, sy, ex, ey } = DOT_PATHS[0];
    return {
      opacity: interpolate(p, [0, 0.08, 0.92, 1], [0, 1, 1, 0]),
      transform: [{ translateX: sx + (ex - sx) * p - 4 }, { translateY: sy + (ey - sy) * p - 4 }],
    };
  });
  const dot1Style = useAnimatedStyle(() => {
    const p = d1p.value;
    const { sx, sy, ex, ey } = DOT_PATHS[1];
    return {
      opacity: interpolate(p, [0, 0.08, 0.92, 1], [0, 1, 1, 0]),
      transform: [{ translateX: sx + (ex - sx) * p - 4 }, { translateY: sy + (ey - sy) * p - 4 }],
    };
  });
  const dot2Style = useAnimatedStyle(() => {
    const p = d2p.value;
    const { sx, sy, ex, ey } = DOT_PATHS[2];
    return {
      opacity: interpolate(p, [0, 0.08, 0.92, 1], [0, 1, 1, 0]),
      transform: [{ translateX: sx + (ex - sx) * p - 4 }, { translateY: sy + (ey - sy) * p - 4 }],
    };
  });
  const dot3Style = useAnimatedStyle(() => {
    const p = d3p.value;
    const { sx, sy, ex, ey } = DOT_PATHS[3];
    return {
      opacity: interpolate(p, [0, 0.08, 0.92, 1], [0, 1, 1, 0]),
      transform: [{ translateX: sx + (ex - sx) * p - 4 }, { translateY: sy + (ey - sy) * p - 4 }],
    };
  });
  const dotStyles = [dot0Style, dot1Style, dot2Style, dot3Style];

  const logoStyle  = useAnimatedStyle(() => ({
    opacity: logoOp.value,
    transform: [{ scale: logoSc.value }, { translateY: logoY.value }],
  }));
  const subStyle   = useAnimatedStyle(() => ({ opacity: subOp.value }));
  const divStyle   = useAnimatedStyle(() => ({ opacity: divOp.value }));
  const capStyle   = useAnimatedStyle(() => ({ opacity: capOp.value }));
  const pillsStyle = useAnimatedStyle(() => ({ opacity: pillsOp.value }));

  // ── Sequence ──────────────────────────────────────────────────────────────────

  const timers   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive    = useRef(true);

  useEffect(() => {
    const sched = (ms: number, fn: () => void) => {
      const id = setTimeout(() => { if (alive.current) fn(); }, ms);
      timers.current.push(id);
    };

    const pop = (
      opV: typeof c0o, scV: typeof c0s,
    ) => {
      opV.value = withTiming(1, { duration: 550 });
      scV.value = withSequence(
        withTiming(1.15, { duration: 340, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 14, stiffness: 240 }),
      );
    };

    const brainReact = (big = false) => {
      const target = big ? 1.3 : 1.18;
      brainPulse.value = withSequence(
        withTiming(target, { duration: 160, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 12, stiffness: 280 }),
      );
    };

    const fireDot = (dpV: typeof d0p) => {
      dpV.value = 0;
      dpV.value = withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) });
    };

    const reset = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      [c0o, c1o, c2o, c3o].forEach(v => { v.value = 0; });
      [c0s, c1s, c2s, c3s].forEach(v => { v.value = 0.35; });
      [l0o, l1o, l2o, l3o].forEach(v => { v.value = 0; });
      [d0p, d1p, d2p, d3p].forEach(v => { v.value = 0; });
      ailOp.value = 0;
      bigGlowOp.value = 0;
      bigGlowSc.value = 1;
      brainPulse.value = 1;
      setCardLit([false, false, false, false]);
      setBubble('');
      setBubbleVis(false);
    };

    // ── 10.5-second sequence ──────────────────────────────────────────────────
    const seq = () => {
      reset();

      // 0.2s — brain label + top card appears
      sched(200, () => {
        ailOp.value = withTiming(1, { duration: 300 });
        pop(c0o, c0s);
      });

      // 0.9s — line 0 + dot 0 travels toward brain
      sched(900, () => {
        l0o.value = withTiming(1, { duration: 400 });
      });
      sched(1050, () => fireDot(d0p));

      // 1.6s — brain reacts to connection
      sched(1620, brainReact);

      // 1.8s — right card (Teacher) appears + glows
      sched(1800, () => {
        pop(c1o, c1s);
        setCardLit([false, true, false, false]);
        setBubble(MSGS[0]);
        setBubbleVis(true);
      });

      // 2.5s — line 1 + dot 1
      sched(2500, () => { l1o.value = withTiming(1, { duration: 400 }); });
      sched(2650, () => fireDot(d1p));

      // 3.2s — brain reacts; right card cools
      sched(3250, () => {
        brainReact();
        setCardLit([false, false, false, false]);
      });

      // 3.4s — bottom card (Parent) appears + glows
      sched(3450, () => {
        pop(c2o, c2s);
        setCardLit([false, false, true, false]);
        setBubble(MSGS[1]);
      });

      // 4.1s — line 2 + dot 2
      sched(4100, () => { l2o.value = withTiming(1, { duration: 400 }); });
      sched(4250, () => fireDot(d2p));

      // 4.85s — brain reacts; bottom card cools
      sched(4850, () => {
        brainReact();
        setCardLit([false, false, false, false]);
      });

      // 5.0s — left card (Principal) appears + glows
      sched(5050, () => {
        pop(c3o, c3s);
        setCardLit([false, false, false, true]);
        setBubble(MSGS[2]);
      });

      // 5.7s — line 3 + dot 3
      sched(5700, () => { l3o.value = withTiming(1, { duration: 400 }); });
      sched(5850, () => fireDot(d3p));

      // 6.4s — ALL nodes connected — grand celebration
      sched(6450, () => {
        brainReact(true);
        setCardLit([true, true, true, true]);
        setBubble(MSGS[3]);
        bigGlowOp.value = withSequence(
          withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
          withDelay(1400, withTiming(0, { duration: 700 })),
        );
        bigGlowSc.value = withSequence(
          withTiming(1.6, { duration: 500, easing: Easing.out(Easing.cubic) }),
          withDelay(1400, withTiming(1, { duration: 700 })),
        );
      });

      // 8.0s — final message
      sched(8000, () => { setBubble(MSGS[4]); });

      // 9.0s — cards fade out glow
      sched(9200, () => { setCardLit([false, false, false, false]); });

      // 10.5s — restart
      sched(10500, seq);
    };

    // ── Continuous animations ─────────────────────────────────────────────────
    ring1Rot.value = withRepeat(withTiming(360,  { duration: 22000, easing: Easing.linear }), -1, false);
    ring2Rot.value = withRepeat(withTiming(-360, { duration: 16000, easing: Easing.linear }), -1, false);
    ring3Rot.value = withRepeat(withTiming(360,  { duration: 10000, easing: Easing.linear }), -1, false);

    glowOp.value = withRepeat(withSequence(
      withTiming(0.95, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.4,  { duration: 1300, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);
    glowSc.value = withRepeat(withSequence(
      withTiming(1.45, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0,  { duration: 1300, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);

    // Logo + UI reveal
    logoOp.value  = withDelay(2000, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    logoSc.value  = withDelay(2000, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    logoY.value   = withDelay(2000, withTiming(0, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    subOp.value   = withDelay(2300, withTiming(1, { duration: 900 }));
    divOp.value   = withDelay(2900, withTiming(1, { duration: 500 }));
    capOp.value   = withDelay(3100, withTiming(1, { duration: 900 }));
    pillsOp.value = withDelay(3400, withTiming(1, { duration: 900 }));

    seq();

    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
      cancelAnimation(ring1Rot); cancelAnimation(ring2Rot); cancelAnimation(ring3Rot);
      cancelAnimation(glowOp);   cancelAnimation(glowSc);
    };
  }, []);

  // ── Card positions ────────────────────────────────────────────────────────────
  const cardPos = [
    { top: Math.round(12 * SC), left: (STAGE - CARD) / 2 },              // top center
    { top: (STAGE - CARD) / 2, right: Math.round(12 * SC) },             // right middle
    { bottom: Math.round(12 * SC), left: (STAGE - CARD) / 2 },           // bottom center
    { top: (STAGE - CARD) / 2, left: Math.round(12 * SC) },              // left middle
  ];

  // ── Particles ─────────────────────────────────────────────────────────────────
  const pts = [
    { x: W*0.05, size:1.5, dur:4200, delay:0,    mo:0.30 },
    { x: W*0.16, size:0.9, dur:3800, delay:620,  mo:0.22 },
    { x: W*0.28, size:1.6, dur:5100, delay:1120, mo:0.28 },
    { x: W*0.41, size:0.8, dur:3500, delay:220,  mo:0.20 },
    { x: W*0.54, size:1.3, dur:4600, delay:880,  mo:0.30 },
    { x: W*0.65, size:0.7, dur:3200, delay:440,  mo:0.18 },
    { x: W*0.76, size:1.4, dur:4900, delay:1500, mo:0.25 },
    { x: W*0.87, size:0.9, dur:3900, delay:700,  mo:0.20 },
    { x: W*0.11, size:1.0, dur:4100, delay:1850, mo:0.22 },
    { x: W*0.50, size:1.5, dur:5200, delay:300,  mo:0.28 },
    { x: W*0.72, size:0.7, dur:3600, delay:1220, mo:0.18 },
    { x: W*0.93, size:1.3, dur:4700, delay:560,  mo:0.22 },
  ];

  // ── Line definitions for active bright SVG overlays ──────────────────────────
  const brightLines = [
    { x1: s(140), y1: s(52),  x2: s(140), y2: s(108), stroke: 'rgba(74,143,255,0.85)' },
    { x1: s(172), y1: s(140), x2: s(228), y2: s(140), stroke: 'rgba(74,143,255,0.85)' },
    { x1: s(140), y1: s(172), x2: s(140), y2: s(220), stroke: 'rgba(212,168,71,0.80)' },
    { x1: s(52),  y1: s(140), x2: s(108), y2: s(140), stroke: 'rgba(212,168,71,0.80)' },
  ];

  const ringDim = (px: number) => Math.round(px * SC);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Pressable style={styles.root} onPress={onComplete}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Background ── */}
      <LinearGradient
        colors={['#0a1a5c', '#040d2e', '#020818']}
        locations={[0, 0.38, 1]}
        start={{ x: 0.2, y: 0.08 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* ambient stage glow — fake radial */}
      <View style={[styles.nebulaGlow, {
        width: STAGE * 1.4, height: STAGE * 1.4,
        borderRadius: STAGE * 0.7,
        top: H * 0.5 - STAGE * 0.7 - 40,
        left: W / 2 - STAGE * 0.7,
      }]} />

      {/* ── Particles ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {pts.map((p, i) => <Particle key={i} x={p.x} size={p.size} dur={p.dur} delay={p.delay} mo={p.mo} />)}
      </View>

      {/* ── Content column ── */}
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 10) }]}>

        {/* ══════════════ ANIMATION STAGE ══════════════ */}
        <View style={[styles.stage, { width: STAGE, height: STAGE }]}>

          {/* Ring 1 — outermost, dim, slow clockwise */}
          <Animated.View style={[styles.ring, {
            width: ringDim(240), height: ringDim(240), borderRadius: ringDim(120),
            borderColor: 'rgba(26,79,255,0.18)',
            top: (STAGE - ringDim(240)) / 2, left: (STAGE - ringDim(240)) / 2,
          }, ring1Style]} />

          {/* Ring 2 — middle, CCW, blue comet */}
          <Animated.View style={[styles.ring, {
            width: ringDim(196), height: ringDim(196), borderRadius: ringDim(98),
            borderColor: 'rgba(74,143,255,0.30)',
            top: (STAGE - ringDim(196)) / 2, left: (STAGE - ringDim(196)) / 2,
          }, ring2Style]} />
          <Animated.View style={[styles.comet, {
            width: 7, height: 7, borderRadius: 3.5,
            backgroundColor: '#60a5fa',
            shadowColor: '#60a5fa', shadowRadius: 6, elevation: 8,
          }, ring2CometStyle]} />

          {/* Ring 3 — inner, CW, gold comet */}
          <Animated.View style={[styles.ring, {
            width: ringDim(148), height: ringDim(148), borderRadius: ringDim(74),
            borderColor: 'rgba(212,168,71,0.42)',
            top: (STAGE - ringDim(148)) / 2, left: (STAGE - ringDim(148)) / 2,
          }, ring3Style]} />
          <Animated.View style={[styles.comet, {
            width: 5, height: 5, borderRadius: 2.5,
            backgroundColor: '#D4A847',
            shadowColor: '#D4A847', shadowRadius: 5, elevation: 7,
          }, ring3CometStyle]} />

          {/* Base infrastructure lines — always dim */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width={STAGE} height={STAGE}>
              {brightLines.map((l, i) => (
                <SvgLine key={i}
                  x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={i < 2 ? 'rgba(26,79,255,0.10)' : 'rgba(212,168,71,0.08)'}
                  strokeWidth="1" strokeDasharray="3,5"
                />
              ))}
            </Svg>
          </View>

          {/* Active bright lines — 4 animated opacity overlays */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {brightLines.map((l, i) => (
              <Animated.View key={i} style={[StyleSheet.absoluteFill, lineStyles[i]]}>
                <Svg width={STAGE} height={STAGE}>
                  <Defs>
                    <Marker id={`mk${i}`} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                      <Polygon points="0,0 7,3.5 0,7" fill={i < 2 ? 'rgba(74,143,255,0.8)' : 'rgba(212,168,71,0.8)'} />
                    </Marker>
                  </Defs>
                  <SvgLine
                    x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                    stroke={l.stroke} strokeWidth="1.8" strokeDasharray="5,4"
                    markerEnd={`url(#mk${i})`}
                  />
                </Svg>
              </Animated.View>
            ))}
          </View>

          {/* Traveling data-pulse dots */}
          {([dot0Style, dot1Style, dot2Style, dot3Style] as const).map((ds, i) => (
            <Animated.View key={i} style={[
              styles.dataDot,
              {
                backgroundColor: DOT_PATHS[i].color,
                shadowColor: DOT_PATHS[i].color,
              },
              ds,
            ]} />
          ))}

          {/* Brain center */}
          <View style={[styles.brainWrap, {
            width: ringDim(72), height: ringDim(72),
            top: (STAGE - ringDim(72)) / 2, left: (STAGE - ringDim(72)) / 2,
          }]}>
            {/* Grand celebration glow */}
            <Animated.View style={[styles.bigGlow, {
              width: ringDim(72), height: ringDim(72), borderRadius: ringDim(36),
            }, bigGlStyle]} />
            {/* Pulsing ambient glow */}
            <Animated.View style={[styles.brainGlow, {
              width: ringDim(72), height: ringDim(72), borderRadius: ringDim(36),
            }, glowStyle]} />
            {/* Brain with reaction scale */}
            <Animated.View style={[styles.brainInner, pulseStyle]}>
              <BrainSvg size={ringDim(46)} />
            </Animated.View>
            {/* EDGE AI label */}
            <Animated.View style={[styles.ailWrap, ailStyle]}>
              <Text variant="caption" color="#4a8fff" style={styles.ail}>EDGE AI</Text>
            </Animated.View>
          </View>

          {/* 4 Satellite cards */}
          {([0, 1, 2, 3] as const).map(i => {
            const Icon = CARD_ICONS[i];
            const lit  = cardLit[i];
            return (
              <Animated.View key={i} style={[
                styles.card,
                { width: CARD, height: CARD, borderRadius: Math.round(13 * SC) },
                cardPos[i] as object,
                lit && {
                  borderColor: CARD_GLOW_CLR[i],
                  shadowColor: CARD_GLOW_CLR[i],
                  shadowOpacity: 0.7,
                  shadowRadius: 14,
                  elevation: 16,
                },
                cardStyles[i],
              ]}>
                {/* glass top highlight */}
                <View style={[styles.cardShine, { borderRadius: Math.round(13 * SC) }]} />
                <Icon />
                <Text variant="caption" color="rgba(200,215,255,0.65)" style={styles.cardLabel}>
                  {CARD_LABELS[i][0]}{'\n'}{CARD_LABELS[i][1]}
                </Text>
              </Animated.View>
            );
          })}

          {/* Info bubble */}
          <View style={styles.bubbleRow} pointerEvents="none">
            <View style={[styles.bubble, { opacity: bubbleVis ? 1 : 0 }]}>
              <Text variant="caption" color="rgba(210,225,255,0.80)" style={styles.bubbleText} numberOfLines={1}>
                {bubbleText}
              </Text>
            </View>
          </View>
        </View>

        {/* ══════════════ LOGO ══════════════ */}
        <Animated.View style={[styles.logoBlock, logoStyle]}>
          <GoldWordmark text="NeuraLife" fontSize={rv(44, 50, 56)} />
          <Animated.View style={subStyle}>
            <Text variant="caption" color="rgba(168,185,220,0.62)" style={styles.logoSub}>
              LEARNING INTELLIGENCE PLATFORM
            </Text>
          </Animated.View>
        </Animated.View>

        {/* ══════════════ DIVIDER ══════════════ */}
        <Animated.View style={[styles.dividerWrap, divStyle]}>
          <LinearGradient
            colors={['transparent', '#C49A22', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.dividerLine}
          />
        </Animated.View>

        {/* ══════════════ CAPTION — single line ══════════════ */}
        <Animated.View style={[styles.captionRow, capStyle]}>
          <Text variant="body" color="#D4A847" style={styles.capGold} numberOfLines={1}>
            every grade remembered,{'  '}
          </Text>
          <Text variant="body" color="rgba(255,255,255,0.44)" style={styles.capWhite} numberOfLines={1}>
            every student known
          </Text>
        </Animated.View>

        {/* ══════════════ PILLS ══════════════ */}
        <Animated.View style={[styles.pills, pillsStyle]}>
          {PILLS.map(p => (
            <View key={p} style={styles.pill}>
              <Text variant="caption" color="rgba(185,205,255,0.75)" style={styles.pillText}>{p}</Text>
            </View>
          ))}
        </Animated.View>

      </View>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020818' },

  nebulaGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(26,79,255,0.07)',
    shadowColor: '#1a4fff',
    shadowOpacity: 0.35,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: 14,
    paddingHorizontal: 16,
  },

  stage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  ring: {
    position: 'absolute',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },

  comet: {
    position: 'absolute',
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
  },

  brainWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  brainGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(26,79,255,0.28)',
    shadowColor: '#1a4fff',
    shadowOpacity: 0.9,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },

  bigGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(100,160,255,0.22)',
    shadowColor: '#60a5fa',
    shadowOpacity: 0.95,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },

  brainInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  ailWrap: {
    position: 'absolute',
    bottom: -22,
  },
  ail: {
    fontSize: 7,
    letterSpacing: 1.2,
    fontWeight: '600',
  },

  card: {
    position: 'absolute',
    backgroundColor: 'rgba(5,14,60,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(26,79,255,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  cardShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    zIndex: 1,
  },
  cardLabel: {
    fontSize: 7,
    textAlign: 'center',
    lineHeight: 10.5,
    letterSpacing: 0.2,
  },

  dataDot: {
    position: 'absolute',
    top: 0, left: 0,
    width: 8, height: 8,
    borderRadius: 4,
    shadowOpacity: 0.95,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },

  bubbleRow: {
    position: 'absolute',
    bottom: -4,
    left: 0, right: 0,
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: 'rgba(4,12,52,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(26,79,255,0.38)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  bubbleText: { fontSize: 9 },

  logoBlock: { alignItems: 'center', gap: 10 },
  logoSub: {
    fontSize: 10,
    letterSpacing: 2.8,
    textAlign: 'center',
  },

  dividerWrap: { width: 72 },
  dividerLine: { height: 1 },

  captionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    paddingHorizontal: 6,
  },
  capGold: {
    fontSize: rv(12, 13, 14),
    fontFamily: 'serif',
    fontStyle: 'normal',
  },
  capWhite: {
    fontSize: rv(12, 13, 14),
    fontFamily: 'serif',
    fontStyle: 'italic',
  },

  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    maxWidth: 340,
  },
  pill: {
    backgroundColor: 'rgba(14,26,92,0.72)',
    borderWidth: 0.5,
    borderColor: 'rgba(40,80,220,0.40)',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  pillText: { fontSize: 9, letterSpacing: 0.3 },

  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(26,79,255,0.9)',
  },
});
