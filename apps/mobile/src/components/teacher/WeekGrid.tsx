import React from 'react';
import {View, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import Animated from 'react-native-reanimated';
import {Text} from '@components/ui/Text';
import {Badge} from '@components/ui/Badge';
import {CardSkeleton} from '@components/ui/Skeleton';
import {
  Surface,
  Border,
  Brand,
  Semantic,
  TextColor,
  Space,
  RadiusToken,
  Shadow,
} from '@constants/index';
import {useStaggerAnimation} from '@hooks/useEntryAnimation';
import {haptic} from '@lib/haptics';
import {rv} from '@lib/responsive';
import type {WeekDay, WeekSlot} from '@hooks/useWeekTimetable';
import type {PeriodCard as PeriodCardType} from '@apptypes/home';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  weekData: WeekDay[];
  isLoading?: boolean;
  onPeriodPress: (period: PeriodCardType) => void;
}

// ── Time Labels Column ─────────────────────────────────────────────────────────

const TIME_LABELS = [
  {label: 'P1', time: '08:30\n09:15', height: 52},
  {label: 'P2', time: '09:15\n10:00', height: 52},
  {label: 'BRK', time: '10:00\n10:15', height: 28},
  {label: 'P3', time: '10:15\n11:00', height: 52},
  {label: 'P4', time: '11:00\n11:45', height: 52},
  {label: 'BRK', time: '11:45\n12:00', height: 28},
  {label: 'LCH', time: '12:00\n13:00', height: 32},
  {label: 'P5', time: '13:00\n13:45', height: 52},
  {label: 'P6', time: '13:45\n14:30', height: 52},
];

function TimeLabelsColumn() {
  return (
    <View style={styles.timeColumn}>
      {TIME_LABELS.map((item, index) => (
        <View key={index} style={[styles.timeLabel, {height: item.height}]}>
          <Text variant="mono" color={TextColor.muted} style={styles.timeLabelText}>
            {item.time}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Day Column Header ──────────────────────────────────────────────────────────

function DayHeader({day}: {day: WeekDay}) {
  const entryAnim = useStaggerAnimation(0);

  const dayNum = new Date(day.date + 'T00:00:00').getDate();
  const textColor = day.isToday ? Brand.indigo : TextColor.muted;

  return (
    <Animated.View style={[styles.dayHeader, entryAnim.animatedStyle]}>
      <Text variant="label" color={textColor} style={styles.dayLabel}>
        {day.shortLabel}
      </Text>
      <View style={styles.dateContainer}>
        <Text variant="mono" color={textColor} style={styles.dateNumber}>
          {dayNum}
        </Text>
        {day.isToday && <View style={styles.todayDot} />}
      </View>
    </Animated.View>
  );
}

// ── Period Cell ────────────────────────────────────────────────────────────────

function PeriodCell({
  slot,
  dayIndex,
  onPress,
}: {
  slot: WeekSlot;
  dayIndex: number;
  onPress: (period: PeriodCardType) => void;
}) {
  const entryAnim = useStaggerAnimation(dayIndex * 50);

  const handlePress = () => {
    if (slot.slotType === 'REGULAR') {
      haptic.light();
      // Convert WeekSlot to PeriodCardType for compatibility
      const period: PeriodCardType = {
        id: slot.id,
        periodNumber: slot.periodNumber || 0,
        subject: slot.subject || 'FREE',
        classYear: slot.classYear || 0,
        section: slot.section || '',
        roomNumber: slot.roomNumber,
        startTime: slot.startTime,
        endTime: slot.endTime,
        studentCount: slot.studentCount || 0,
        periodType: slot.slotType as any,
        attendanceMarked: slot.attendanceMarked,
        coverageMarked: slot.coverageMarked,
        isSubstitute: false,
        substituteForName: null,
      };
      onPress(period);
    }
  };

  // Get cell styling based on slot type and status
  const getCellStyle = () => {
    if (slot.slotType === 'BREAK') {
      return [styles.breakCell, {height: 28}];
    }
    if (slot.slotType === 'LUNCH') {
      return [styles.breakCell, {height: 32}];
    }

    // Regular period cell - using custom colors for dynamic styling
    let dynamicStyle = {};

    switch (slot.status) {
      case 'PAST':
        if (slot.attendanceMarked) {
          dynamicStyle = {
            backgroundColor: 'rgba(16,185,129,0.20)', // success green
            borderColor: 'rgba(16,185,129,0.40)',
            borderWidth: 1,
          };
        } else {
          dynamicStyle = {
            backgroundColor: 'rgba(245,158,11,0.15)', // amber warning
            borderColor: 'rgba(245,158,11,0.35)',
            borderWidth: 1,
          };
        }
        break;
      case 'NOW':
        dynamicStyle = {
          backgroundColor: 'rgba(99,102,241,0.22)', // indigo accent
          borderColor: '#4f46e5', // Brand.indigo equivalent
          borderWidth: 1.5,
        };
        break;
      case 'UPCOMING':
        dynamicStyle = {
          backgroundColor: 'rgba(255,255,255,0.80)', // Surface.glass equivalent
          borderColor: 'rgba(15,23,42,0.06)', // Border.glass equivalent
          borderWidth: 1,
        };
        break;
      case 'NOT_TODAY':
        dynamicStyle = {
          backgroundColor: 'rgba(15,37,87,0.10)', // dimmed
          borderColor: 'rgba(15,23,42,0.06)', // Border.subtle equivalent
          borderWidth: 1,
        };
        break;
    }

    return [styles.regularCell, dynamicStyle];
  };

  const getSubjectAbbreviation = (subject: string | null) => {
    if (!subject || subject === 'FREE') return '—';
    const map: Record<string, string> = {
      MATHEMATICS: 'MTH',
      ENGLISH: 'ENG',
      PHYSICAL_SCIENCE: 'PHY',
      BIOLOGICAL_SCIENCE: 'BIO',
      SOCIAL_STUDIES: 'SOC',
      TELUGU: 'TEL',
      HINDI: 'HIN',
    };
    return map[subject] || subject.slice(0, 3).toUpperCase();
  };

  const StatusIndicator = () => {
    if (slot.slotType !== 'REGULAR') return null;

    switch (slot.status) {
      case 'PAST':
        return slot.attendanceMarked ? (
          <View style={styles.statusIcon}>
            <Text variant="mono" color={Semantic.success} style={styles.checkIcon}>
              ✓
            </Text>
          </View>
        ) : (
          <View style={[styles.statusIcon, styles.warningDot]} />
        );
      case 'NOW':
        return (
          <View style={[styles.statusIcon, styles.liveDot]}>
            <View style={styles.liveDotInner} />
          </View>
        );
      default:
        return null;
    }
  };

  if (slot.slotType === 'BREAK') {
    return (
      <Animated.View style={[getCellStyle(), entryAnim.animatedStyle]}>
        <Text variant="caption" color={TextColor.muted}>
          BREAK
        </Text>
      </Animated.View>
    );
  }

  if (slot.slotType === 'LUNCH') {
    return (
      <Animated.View style={[getCellStyle(), entryAnim.animatedStyle]}>
        <Text variant="caption" color={TextColor.muted}>
          LUNCH
        </Text>
      </Animated.View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={slot.slotType !== 'REGULAR'}>
      <Animated.View style={[getCellStyle(), entryAnim.animatedStyle]}>
        <StatusIndicator />
        <View style={styles.cellContent}>
          <Text variant="mono" color={TextColor.primary} style={styles.subjectText}>
            {getSubjectAbbreviation(slot.subject)}
          </Text>
          {slot.classYear && slot.section && (
            <Text variant="mono" color={TextColor.muted} style={styles.classText}>
              {slot.classYear}-{slot.section}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Day Column ─────────────────────────────────────────────────────────────────

function DayColumn({
  day,
  dayIndex,
  onPeriodPress,
}: {
  day: WeekDay;
  dayIndex: number;
  onPeriodPress: (period: PeriodCardType) => void;
}) {
  // Get slots for each time slot position
  const getSlotForTimeIndex = (timeIndex: number): WeekSlot | null => {
    // Map time indexes to period numbers/types
    const timeMapping = [
      {periods: [1], type: 'REGULAR'},
      {periods: [2], type: 'REGULAR'},
      {periods: [-1, -2], type: 'BREAK'}, // Any break period
      {periods: [3], type: 'REGULAR'},
      {periods: [4], type: 'REGULAR'},
      {periods: [-1, -2], type: 'BREAK'}, // Any break period
      {periods: [-100, -104], type: 'LUNCH'}, // Any lunch period
      {periods: [5], type: 'REGULAR'},
      {periods: [6], type: 'REGULAR'},
    ];

    const mapping = timeMapping[timeIndex];
    if (!mapping) return null;

    if (mapping.type === 'BREAK') {
      return {
        id: `break-${dayIndex}-${timeIndex}`,
        periodNumber: null,
        slotType: 'BREAK',
        startTime: TIME_LABELS[timeIndex].time.split('\n')[0],
        endTime: TIME_LABELS[timeIndex].time.split('\n')[1],
        subject: null,
        classYear: null,
        section: null,
        roomNumber: null,
        studentCount: null,
        attendanceMarked: false,
        coverageMarked: false,
        status: 'NOT_TODAY',
      };
    }

    if (mapping.type === 'LUNCH') {
      return {
        id: `lunch-${dayIndex}-${timeIndex}`,
        periodNumber: null,
        slotType: 'LUNCH',
        startTime: TIME_LABELS[timeIndex].time.split('\n')[0],
        endTime: TIME_LABELS[timeIndex].time.split('\n')[1],
        subject: null,
        classYear: null,
        section: null,
        roomNumber: null,
        studentCount: null,
        attendanceMarked: false,
        coverageMarked: false,
        status: 'NOT_TODAY',
      };
    }

    // Find matching regular period
    const slot = day.slots.find(s =>
      mapping.periods.includes(s.periodNumber || 0) && s.slotType === 'REGULAR',
    );

    return slot || null;
  };

  return (
    <View style={styles.dayColumn}>
      <DayHeader day={day} />
      {TIME_LABELS.map((_, timeIndex) => {
        const slot = getSlotForTimeIndex(timeIndex);
        return slot ? (
          <PeriodCell
            key={timeIndex}
            slot={slot}
            dayIndex={dayIndex}
            onPress={onPeriodPress}
          />
        ) : (
          <View key={timeIndex} style={[styles.emptyCell, {height: TIME_LABELS[timeIndex].height}]} />
        );
      })}
    </View>
  );
}

// ── Loading Grid ───────────────────────────────────────────────────────────────

function LoadingGrid() {
  return (
    <View style={styles.container}>
      <TimeLabelsColumn />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
        <View style={styles.daysContainer}>
          {[1, 2, 3, 4, 5, 6].map(day => (
            <View key={day} style={styles.dayColumn}>
              <View style={styles.dayHeader}>
                <CardSkeleton />
              </View>
              {TIME_LABELS.map((_, index) => (
                <View key={index} style={[styles.skeletonCell, {height: TIME_LABELS[index].height}]}>
                  <CardSkeleton />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function WeekGrid({weekData, isLoading, onPeriodPress}: Props) {
  if (isLoading || !weekData?.length) {
    return <LoadingGrid />;
  }

  return (
    <View style={styles.container}>
      <TimeLabelsColumn />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
        <View style={styles.daysContainer}>
          {weekData.map((day, index) => (
            <DayColumn key={day.dayOfWeek} day={day} dayIndex={index} onPeriodPress={onPeriodPress} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    marginHorizontal: rv(Space.lg, Space.xxl),
    marginBottom: Space.lg,
  },
  timeColumn: {
    width: 56,
    backgroundColor: 'transparent',
  },
  timeLabel: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Border.subtle,
  },
  timeLabelText: {
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 11,
  },
  daysScroll: {
    flex: 1,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: Space.xs,
  },
  dayColumn: {
    width: 68,
    backgroundColor: 'transparent',
  },
  dayHeader: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Border.subtle,
  },
  dayLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  dateNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.indigo,
    marginTop: 1,
  },
  regularCell: {
    height: 52,
    borderWidth: 1,
    borderRadius: RadiusToken.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
    position: 'relative',
  },
  breakCell: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  emptyCell: {
    marginBottom: 1,
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  classText: {
    fontSize: 10,
    marginTop: 1,
    textAlign: 'center',
  },
  statusIcon: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
  },
  checkIcon: {
    fontSize: 10,
  },
  warningDot: {
    backgroundColor: Semantic.warning,
    borderRadius: 4,
  },
  liveDot: {
    backgroundColor: Brand.indigo,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDotInner: {
    width: 4,
    height: 4,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  skeletonCell: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
    paddingHorizontal: Space.xs,
  },
});