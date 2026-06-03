/**
 * FloatingIconsLayer — ambient branded watermark for all light-variant screens.
 *
 * 8 hand-drawn SVG icons, each drifting at its own speed and direction.
 * Opacity is low enough (0.065) that they read as background texture, never
 * as UI elements competing with content.
 *
 * Rules:
 *  - React.memo — mounts once per screen, never re-renders
 *  - 1 SharedValue per icon — minimal Reanimated overhead
 *  - All icons are absolute-positioned outside the default content column
 *    so they never sit directly behind primary interactive zones
 */

import React, {useEffect} from 'react';
import {StyleSheet, View, Dimensions} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
  Easing, cancelAnimation,
} from 'react-native-reanimated';
import Svg, {
  Path, Circle, Line, Rect, Ellipse,
  G, Polyline,
} from 'react-native-svg';

const {width: W, height: H} = Dimensions.get('window');

// ─── Icon colour ──────────────────────────────────────────────────────────────
// Deep brand blue at very low opacity — blends with the light gradient
const IC = '#1a4baa';
const SW = '1.6'; // stroke width

// ─── SVG Icon components ──────────────────────────────────────────────────────

/** Open book — learning content */
function BookIcon({size}: {size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M4 6C4 6 10 4 16 6C22 4 28 6 28 6V26C22 24 16 26 10 26C8 26 6 26 4 26V6Z"
        stroke={IC} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M16 6V26" stroke={IC} strokeWidth={SW} />
      <Path d="M8 10C10 9.2 13 9 16 10" stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M8 14C10 13.2 13 13 16 14" stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M8 18C10 17.2 13 17 16 18" stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M24 10C22 9.2 19 9 16 10" stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M24 14C22 13.2 19 13 16 14" stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M24 18C22 17.2 19 17 16 18" stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
}

/** Graduation mortarboard — academic achievement */
function CapIcon({size}: {size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M16 6L30 12L16 18L2 12Z" stroke={IC} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M8 15V23C8 23 11 27 16 27C21 27 24 23 24 23V15"
        stroke={IC} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M28 12V20" stroke={IC} strokeWidth={SW} strokeLinecap="round" />
      <Circle cx="28" cy="21.5" r="1.5" stroke={IC} strokeWidth="1.2" />
    </Svg>
  );
}

/** Brain outline — AI / NeuraLife intelligence */
function BrainIcon({size}: {size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 8C12 8 8 11 8 15C8 17.5 9 19.5 11 21C10 21.5 9 22.5 9 24C9 25.7 10.3 27 12 27C13 27 13.8 26.5 14.5 25.8"
        stroke={IC} strokeWidth={SW} strokeLinecap="round" />
      <Path
        d="M16 8C20 8 24 11 24 15C24 17.5 23 19.5 21 21C22 21.5 23 22.5 23 24C23 25.7 21.7 27 20 27C19 27 18.2 26.5 17.5 25.8"
        stroke={IC} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M16 8V27" stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M11 14C11 12.3 13.2 11 16 11C18.8 11 21 12.3 21 14"
        stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
      <Circle cx="12" cy="16.5" r="1.5" stroke={IC} strokeWidth="1.2" />
      <Circle cx="20" cy="16.5" r="1.5" stroke={IC} strokeWidth="1.2" />
      <Circle cx="16" cy="20" r="1" stroke={IC} strokeWidth="1.2" />
    </Svg>
  );
}

/** Bar chart — performance analytics */
function ChartIcon({size}: {size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M4 26H28" stroke={IC} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M4 26V4" stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
      {/* bars */}
      <Rect x="6"  y="18" width="5" height="8" rx="1" stroke={IC} strokeWidth="1.4" />
      <Rect x="13" y="12" width="5" height="14" rx="1" stroke={IC} strokeWidth="1.4" />
      <Rect x="20" y="7"  width="5" height="19" rx="1" stroke={IC} strokeWidth="1.4" />
      {/* trend line */}
      <Polyline points="8.5,18 15.5,12 22.5,7"
        stroke={IC} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="22.5" cy="7" r="1.5" fill={IC} fillOpacity="0.6" />
    </Svg>
  );
}

/** Pencil — homework and note-taking */
function PencilIcon({size}: {size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M7 22L6 26L10 25L25 10L22 7L7 22Z"
        stroke={IC} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M22 7L25 10" stroke={IC} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M19 10L22 13" stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M6 26L10 25" stroke={IC} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

/** Atom — STEM / science subjects */
function AtomIcon({size}: {size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="16" r="2.5" stroke={IC} strokeWidth={SW} />
      {/* 3 orbital ellipses */}
      <Ellipse cx="16" cy="16" rx="12" ry="5" stroke={IC} strokeWidth="1.3" />
      <Ellipse cx="16" cy="16" rx="12" ry="5"
        stroke={IC} strokeWidth="1.3"
        transform="rotate(60 16 16)" />
      <Ellipse cx="16" cy="16" rx="12" ry="5"
        stroke={IC} strokeWidth="1.3"
        transform="rotate(-60 16 16)" />
    </Svg>
  );
}

/** Clipboard with checkmark — attendance */
function ClipboardIcon({size}: {size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Rect x="7" y="7" width="18" height="22" rx="2" stroke={IC} strokeWidth={SW} />
      <Path
        d="M12 5C12 4.4 13.3 4 16 4C18.7 4 20 4.4 20 5V9H12V5Z"
        stroke={IC} strokeWidth="1.3" strokeLinejoin="round" />
      {/* check mark */}
      <Path d="M11 17L14.5 21L21 13"
        stroke={IC} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* lines */}
      <Line x1="11" y1="25" x2="21" y2="25" stroke={IC} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
}

/** Trending-up line — student progress / growth */
function TrendIcon({size}: {size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M4 26L11 17L16 21L23 11L28 6"
        stroke={IC} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 6H28V12"
        stroke={IC} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      {/* axis */}
      <Path d="M4 26H28" stroke={IC} strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
      <Path d="M4 6V26" stroke={IC} strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
    </Svg>
  );
}

// ─── Icon config ──────────────────────────────────────────────────────────────
// Each entry: x/y in screen-fraction, drift in px, duration ms, delay ms, size px
// Positioned near edges and away from the main content column

const ICONS = [
  { Icon: BookIcon,      x: 0.04,  y: 0.08,  dx:  22, dy:  14, dur: 13000, delay: 0,     sz: 44 },
  { Icon: CapIcon,       x: 0.74,  y: 0.06,  dx: -16, dy:  18, dur: 11500, delay: 800,   sz: 40 },
  { Icon: BrainIcon,     x: 0.82,  y: 0.30,  dx: -20, dy:  12, dur: 14500, delay: 1600,  sz: 42 },
  { Icon: ChartIcon,     x: 0.06,  y: 0.50,  dx:  18, dy: -16, dur: 12000, delay: 400,   sz: 38 },
  { Icon: PencilIcon,    x: 0.78,  y: 0.62,  dx: -14, dy: -20, dur: 10500, delay: 1200,  sz: 36 },
  { Icon: AtomIcon,      x: 0.05,  y: 0.76,  dx:  16, dy:  -8, dur: 15500, delay: 2000,  sz: 44 },
  { Icon: ClipboardIcon, x: 0.70,  y: 0.82,  dx: -18, dy:  10, dur: 11000, delay: 600,   sz: 38 },
  { Icon: TrendIcon,     x: 0.35,  y: 0.90,  dx:  10, dy: -14, dur: 13500, delay: 1800,  sz: 40 },
];

// ─── Single floating icon ────────────────────────────────────────────────────

interface FloatingProps {
  Icon: (p: {size: number}) => JSX.Element;
  x: number; y: number;
  dx: number; dy: number;
  dur: number; delay: number;
  sz: number;
}

const FloatingIcon = React.memo(function FloatingIcon({
  Icon, x, y, dx, dy, dur, delay, sz,
}: FloatingProps) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1,  {duration: dur * 0.55, easing: Easing.inOut(Easing.ease)}),
          withTiming(-0.3, {duration: dur * 0.45, easing: Easing.inOut(Easing.ease)}),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(anim);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      {translateX: anim.value * dx},
      {translateY: anim.value * dy},
    ],
  }));

  return (
    <Animated.View style={[styles.icon, {left: W * x, top: H * y}, style]}>
      <Icon size={sz} />
    </Animated.View>
  );
});

// ─── Layer component ──────────────────────────────────────────────────────────

function FloatingIconsLayerImpl() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ICONS.map((cfg, i) => (
        <FloatingIcon key={i} {...cfg} />
      ))}
    </View>
  );
}

export const FloatingIconsLayer = React.memo(FloatingIconsLayerImpl);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  icon: {
    position: 'absolute',
    opacity: 0.065,
  },
});
