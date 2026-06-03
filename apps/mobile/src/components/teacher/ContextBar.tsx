import React, {useEffect, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated as RNAnimated} from 'react-native';
import {Text} from '@components/ui/Text';
import {Colors, Spacing, Radius} from '@constants/index';
import {haptic} from '@lib/haptics';
import {rv} from '@lib/responsive';
import type {ContextState, PeriodCard} from '@apptypes/home';

interface Props {
  contextState: ContextState;
  contextPeriod: PeriodCard | null;
  nextPeriod: PeriodCard | null;
  firstName: string;
  doubtsPending: number;
  pendingCoverageCount?: number;
  accentColor: string;
  onAction: (action: string, period: PeriodCard | null) => void;
}

interface BarContent {
  icon: string;
  title: string;
  subtitle: string;
  cta: string | null;
  ctaAction: string | null;
  showPulse: boolean;
  bgTint: string;
  borderColor: string;
}

function getContent(
  state: ContextState,
  period: PeriodCard | null,
  nextPeriod: PeriodCard | null,
  firstName: string,
  doubtsPending: number,
  accentColor: string,
): BarContent {
  switch (state) {
    case 'BEFORE_SCHOOL':
      return {
        icon: '🌅',
        title: `Good morning, ${firstName}`,
        subtitle: period
          ? `First class ${period.startTime} · ${period.subject} ${period.classYear}-${period.section}`
          : 'No classes scheduled today',
        cta: null, ctaAction: null, showPulse: false,
        bgTint: Colors.accent + '18', borderColor: Colors.accent,
      };

    case 'MARK_ATTENDANCE':
      return {
        icon: '👥',
        title: `Mark Attendance · ${period?.classYear}-${period?.section}`,
        subtitle: period
          ? `${period.subject} · ${period.startTime}–${period.endTime} · ${period.studentCount} students`
          : '',
        cta: 'Mark Now', ctaAction: 'MARK_ATTENDANCE', showPulse: true,
        bgTint: Colors.warning + '18', borderColor: Colors.warning,
      };

    case 'MARK_COVERAGE':
      return {
        icon: '📋',
        title: `Mark Coverage · ${period?.subject} ${period?.classYear}-${period?.section}`,
        subtitle: period ? `Class ended ${period.endTime} — what did you teach?` : '',
        cta: 'Mark Coverage', ctaAction: 'MARK_COVERAGE', showPulse: true,
        bgTint: Colors.warning + '18', borderColor: Colors.warning,
      };

    case 'ALL_DONE':
      return {
        icon: '✅',
        title: 'All done for this period',
        subtitle: nextPeriod
          ? `Next: ${nextPeriod.subject} at ${nextPeriod.startTime}`
          : 'Enjoy the rest of your day',
        cta: null, ctaAction: null, showPulse: false,
        bgTint: Colors.success + '14', borderColor: Colors.success,
      };

    case 'FREE_PERIOD':
      return {
        icon: '☕',
        title: 'Free period',
        subtitle: doubtsPending > 0
          ? `${doubtsPending} doubts pending · Next ${nextPeriod?.startTime ?? '—'}`
          : `Take a breather · Next ${nextPeriod?.startTime ?? '—'}`,
        cta: doubtsPending > 0 ? 'View Doubts' : null,
        ctaAction: 'VIEW_DOUBTS', showPulse: false,
        bgTint: Colors.info + '14', borderColor: Colors.info,
      };

    case 'AFTER_SCHOOL':
      return {
        icon: '🌙',
        title: 'School day complete',
        subtitle: 'Sync your SmartPads before leaving',
        cta: null, ctaAction: null, showPulse: false,
        bgTint: Colors.surfaceHigh + 'AA', borderColor: Colors.cardBorder,
      };

    default:
      return {
        icon: '📅', title: 'Today', subtitle: '', cta: null, ctaAction: null, showPulse: false,
        bgTint: Colors.surface, borderColor: Colors.cardBorder,
      };
  }
}

function PulseDot({color}: {color: string}) {
  const scale = useRef(new RNAnimated.Value(1)).current;
  const opacity = useRef(new RNAnimated.Value(0.8)).current;

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.parallel([
          RNAnimated.timing(scale,   {toValue: 1.5, duration: 700, useNativeDriver: true}),
          RNAnimated.timing(opacity, {toValue: 0,   duration: 700, useNativeDriver: true}),
        ]),
        RNAnimated.parallel([
          RNAnimated.timing(scale,   {toValue: 1,   duration: 0,   useNativeDriver: true}),
          RNAnimated.timing(opacity, {toValue: 0.8, duration: 0,   useNativeDriver: true}),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <View style={styles.dotWrapper}>
      <RNAnimated.View style={[styles.dotOuter, {backgroundColor: color, transform: [{scale}], opacity}]} />
      <View style={[styles.dotInner, {backgroundColor: color}]} />
    </View>
  );
}

export const ContextBar = React.memo(function ContextBar({
  contextState, contextPeriod, nextPeriod, firstName, doubtsPending,
  pendingCoverageCount = 0, accentColor, onAction,
}: Props) {
  const prevState = useRef<ContextState | null>(null);
  const fadeAnim  = useRef(new RNAnimated.Value(1)).current;

  // If we have pending coverage, promote the AFTER_SCHOOL/ALL_DONE/FREE state to show coverage CTA
  const effectiveState: ContextState =
    pendingCoverageCount > 0 &&
    (contextState === 'AFTER_SCHOOL' || contextState === 'ALL_DONE' || contextState === 'FREE_PERIOD')
      ? 'MARK_COVERAGE'
      : contextState;

  const content = getContent(effectiveState, contextPeriod, nextPeriod, firstName, doubtsPending, accentColor);

  // Cross-fade when context state changes
  useEffect(() => {
    if (prevState.current !== null && prevState.current !== effectiveState) {
      RNAnimated.sequence([
        RNAnimated.timing(fadeAnim, {toValue: 0, duration: 150, useNativeDriver: true}),
        RNAnimated.timing(fadeAnim, {toValue: 1, duration: 200, useNativeDriver: true}),
      ]).start();
    }
    prevState.current = effectiveState;
  }, [effectiveState, fadeAnim]);

  const handleCta = () => {
    haptic.medium();
    onAction(content.ctaAction ?? '', contextPeriod);
  };

  return (
    <RNAnimated.View
      style={[
        styles.bar,
        {backgroundColor: content.bgTint, borderLeftColor: content.borderColor, opacity: fadeAnim},
      ]}>
      <View style={styles.inner}>
        <View style={styles.left}>
          <Text style={styles.icon}>{content.icon}</Text>
        </View>
        <View style={styles.middle}>
          <Text variant="label" color={Colors.textPrimary} style={styles.title} numberOfLines={1}>
            {content.title}
          </Text>
          <Text variant="bodySmall" color={Colors.textSecondary} numberOfLines={2} style={styles.subtitle}>
            {content.subtitle}
          </Text>
        </View>
        {content.cta && (
          <View style={styles.right}>
            {content.showPulse && <PulseDot color={content.borderColor} />}
            <TouchableOpacity
              onPress={handleCta}
              style={[styles.ctaBtn, {backgroundColor: content.borderColor}]}
              activeOpacity={0.8}>
              <Text variant="label" color="#FFFFFF" style={styles.ctaText}>{content.cta}</Text>
            </TouchableOpacity>
          </View>
        )}
        {!content.cta && content.showPulse && (
          <View style={styles.right}>
            <PulseDot color={content.borderColor} />
          </View>
        )}
      </View>
    </RNAnimated.View>
  );
});

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: rv(Spacing.lg, Spacing.xxl),
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    minHeight: 68,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  left:  {width: 32, alignItems: 'center'},
  icon:  {fontSize: 22},
  middle:{flex: 1},
  right: {alignItems: 'flex-end', gap: Spacing.xs},
  title:   {marginBottom: 2, fontWeight: '600'},
  subtitle:{},
  ctaBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.md,
    minHeight: 30,
    justifyContent: 'center',
  },
  ctaText: {fontSize: 12},
  dotWrapper: {width: 12, height: 12, alignItems: 'center', justifyContent: 'center'},
  dotOuter: {position: 'absolute', width: 12, height: 12, borderRadius: 6},
  dotInner: {width: 6,  height: 6,  borderRadius: 3},
});
