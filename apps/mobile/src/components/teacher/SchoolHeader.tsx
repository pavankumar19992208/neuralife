import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import Animated from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Badge } from '@components/ui/Badge';
import { Border, TextColor, Space, RadiusToken } from '@constants/index';
import { Palette, Shadow, Surface } from '@constants/theme';
import { Typography } from '@constants/typography';
import { useTitleAnimation, useEntryAnimation } from '@hooks/useEntryAnimation';
import { haptic } from '@lib/haptics';
import { rv } from '@lib/responsive';

interface Props {
  schoolName: string;
  schoolLogoUrl: string | null;
  teacherName: string;
  roles: string[];
  classSection: string | null;
  todayDate: string;
  accentColor: string;
  onProfilePress: () => void;
}

function SchoolBadge({ name, accentColor }: { name: string; accentColor: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  return (
    <View style={[styles.badge, { backgroundColor: accentColor + '22', borderColor: accentColor + '44' }]}>
      <Text style={[styles.badgeInitials, { color: accentColor }]}>{initials}</Text>
    </View>
  );
}

export const SchoolHeader = React.memo(function SchoolHeader({
  schoolName, schoolLogoUrl, teacherName, roles, classSection, todayDate, accentColor, onProfilePress,
}: Props) {
  const titleAnim  = useTitleAnimation(0);
  const badgeAnim  = useEntryAnimation({ delay: 120 });

  const isClassTeacher = roles.includes('CLASS_TEACHER') || !!classSection;
  const isPrincipal    = roles.includes('PRINCIPAL');

  return (
    <View style={styles.container}>
      {/* Row 1: school logo + name + profile */}
      <View style={styles.row1}>
        <View style={styles.logoRow}>
          {schoolLogoUrl ? (
            <FastImage
              source={{ uri: schoolLogoUrl }}
              style={styles.logo}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : (
            <SchoolBadge name={schoolName} accentColor={accentColor} />
          )}
          <Text style={styles.schoolName} numberOfLines={1}>{schoolName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => { haptic.light(); onProfilePress(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.profileBtn}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Teacher name */}
      <Animated.Text style={[styles.teacherName, titleAnim]}>
        {teacherName}
      </Animated.Text>

      {/* Role badges + date row */}
      <Animated.View style={[styles.metaRow, badgeAnim.animatedStyle]}>
        <View style={styles.badgeRow}>
          {isClassTeacher && classSection && (
            <Badge label={`Class Teacher · ${classSection}`} color={accentColor} />
          )}
          <Badge
            label={isPrincipal ? 'Principal' : 'Teacher'}
            variant="default"
          />
        </View>
        <Text style={styles.date}>{todayDate}</Text>
      </Animated.View>

      <View style={styles.divider} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Surface.cardLight,
    paddingHorizontal: rv(Space.lg, Space.xxl),
    paddingTop: Space.lg,
    paddingBottom: Space.md,
    marginHorizontal: rv(Space.md, Space.lg),
    marginTop: Space.sm,
    borderRadius: RadiusToken.lg,
    ...Shadow.md,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.sm,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Space.sm,
  },
  logo: {
    width: 40, height: 40,
    borderRadius: RadiusToken.md,
    marginRight: Space.md,
    ...Shadow.sm,
  },
  badge: {
    width: 40, height: 40,
    borderRadius: RadiusToken.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.md,
    ...Shadow.sm,
  },
  badgeInitials: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  schoolName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.neuralBlue,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  profileBtn: {
    minWidth: 44, minHeight: 44,
    alignItems: 'center', justifyContent: 'center',
    padding: Space.xs,
    borderRadius: RadiusToken.md,
    backgroundColor: 'rgba(30, 64, 175, 0.08)',
  },
  profileIcon: { fontSize: 22, opacity: 0.8 },
  teacherName: {
    fontSize: 24,
    fontWeight: '700',
    color: TextColor.lightPrimary,
    letterSpacing: -0.3,
    marginBottom: Space.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Space.sm,
    flexWrap: 'wrap'
  },
  date: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '500',
    color: Palette.neuralBlue,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  divider: {
    height: 2,
    backgroundColor: 'rgba(30, 64, 175, 0.1)',
    marginHorizontal: -rv(Space.lg, Space.xxl),
    marginTop: Space.sm,
  },
});
