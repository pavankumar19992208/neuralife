import React, {useCallback, useRef} from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';

import {Text} from '@components/ui/Text';
import {SegmentHeader} from '@components/ui/SegmentHeader';
import {SyncPill} from '@components/ui/SyncPill';
import {CardSkeleton} from '@components/ui/Skeleton';
import {EmptyState} from '@components/ui/EmptyState';
import {ErrorState} from '@components/ui/ErrorState';
import {Badge} from '@components/ui/Badge';
import {BackgroundView} from '@components/ui/BackgroundView';

import {api} from '@lib/api';
import {haptic} from '@lib/haptics';
import {useBranding} from '@lib/branding';
import {todayIST, formatDate} from '@lib/dates';
import {Colors, Spacing, Radius} from '@constants/index';
import {useAuthStore} from '@store/authStore';
import type {RootStackParamList} from '@navigation/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassEntry {
  slotId: string;
  classYear: number;
  section: string;
  subject: string;
  startTime: string;
  endTime: string;
  periodNumber: number;
  studentCount: number;
  attendanceStatus: 'NOT_MARKED' | 'MARKED';
  presentCount: number;
  absentCount: number;
  lateCount: number;
  isCurrentlyActive: boolean;
  isSubstitute: boolean;
  originalTeacherName: string | null;
}

interface ClassesTodayData {
  attendanceMode: 'ONCE_PER_DAY' | 'PER_PERIOD';
  todayDate: string;
  currentTimeIST: string;
  classes: ClassEntry[];
}

// Subject colour map
const SUBJECT_COLORS: Record<string, string> = {
  MATHEMATICS: Colors.info,
  ENGLISH:     Colors.warning,
  SCIENCE:     Colors.success,
  TELUGU:      Colors.danger,
  SOCIAL:      '#8b5cf6',
  HINDI:       '#ec4899',
  PHYSICS:     '#0ea5e9',
  CHEMISTRY:   '#f97316',
  BIOLOGY:     '#84cc16',
};

function subjectColor(subject: string): string {
  const key = subject.toUpperCase().replace(/\s+/g, '_');
  return SUBJECT_COLORS[key] ?? Colors.accent;
}

// ─── ClassCard ─────────────────────────────────────────────────────────────────

function ClassCard({entry, onPress}: {entry: ClassEntry; onPress: () => void}) {
  const isMarked = entry.attendanceStatus === 'MARKED';
  const color    = subjectColor(entry.subject);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
        entry.isCurrentlyActive && styles.cardActive,
      ]}>
      {/* Left accent bar */}
      <View style={[styles.cardAccent, {backgroundColor: color}]} />

      {/* Subject icon */}
      <View style={[styles.subjectPill, {backgroundColor: color + '22'}]}>
        <Text style={[styles.subjectInitial, {color}]}>
          {entry.subject[0]}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <View style={styles.cardRow}>
          <Text variant="h3" style={styles.classTitle}>
            {entry.subject.replace(/_/g, ' ')} — Class {entry.classYear}-{entry.section}
          </Text>
          {entry.isCurrentlyActive && (
            <View style={styles.nowPill}>
              <Text variant="caption" color={Colors.warning} style={styles.nowText}>NOW</Text>
            </View>
          )}
        </View>
        <Text variant="bodySmall" color={Colors.textSecondary}>
          {entry.startTime} – {entry.endTime}
          {entry.isSubstitute ? ' · Substitute' : ''}
        </Text>
        <Text variant="caption" color={Colors.textMuted}>
          {entry.studentCount} students
        </Text>
      </View>

      {/* Status badge */}
      <View style={styles.statusCol}>
        {isMarked ? (
          <View>
            <Badge label="Done" variant="success" />
            <Text variant="caption" color={Colors.textMuted} style={styles.countText}>
              {entry.presentCount}P · {entry.absentCount}A · {entry.lateCount}L
            </Text>
          </View>
        ) : (
          <View style={[styles.pendingBadge, entry.isCurrentlyActive && styles.pendingBadgeActive]}>
            <Text variant="caption" color={entry.isCurrentlyActive ? Colors.warning : Colors.textMuted}>
              {entry.isCurrentlyActive ? '⚠️ Pending' : 'Pending'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── ClassPickerScreen ─────────────────────────────────────────────────────────

export function ClassPickerScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const {accentColor} = useBranding();
  const firstName = useAuthStore(s => s.teacherId);
  const todayDate = todayIST().toISOString().split('T')[0];
  const flatListRef = useRef<FlatList<ClassEntry>>(null);

  const {data, isLoading, error, refetch, isRefetching} = useQuery<ClassesTodayData>({
    queryKey: ['attendance', 'classes-today', todayDate],
    queryFn: () => api.get<ClassesTodayData>('/teacher/attendance/classes-today'),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleClassPress = useCallback((entry: ClassEntry) => {
    haptic.light();
    navigation.navigate('AttendanceMark', {
      classYear:    entry.classYear,
      section:      entry.section,
      subject:      entry.subject,
      date:         todayDate,
      periodNumber: entry.periodNumber,
    });
  }, [navigation, todayDate]);

  if (isLoading && !data) {
    return (
      <BackgroundView variant="light" style={styles.container}><SafeAreaView style={{flex:1}} edges={['top']}>
        <SegmentHeader title="Attendance" caption="Select a class to mark attendance" />
        <SyncPill />
        <CardSkeleton /><CardSkeleton /><CardSkeleton />
      </SafeAreaView></BackgroundView>
    );
  }

  if (error && !data) {
    return (
      <BackgroundView variant="light" style={styles.container}><SafeAreaView style={{flex:1}} edges={['top']}>
        <ErrorState message="Could not load today's classes" onRetry={refetch} />
      </SafeAreaView></BackgroundView>
    );
  }

  const classes = data?.classes ?? [];
  const allMarked = classes.length > 0 && classes.every(c => c.attendanceStatus === 'MARKED');
  const totalPresent = classes.reduce((s, c) => s + c.presentCount, 0);

  if (classes.length === 0) {
    return (
      <BackgroundView variant="light" style={styles.container}><SafeAreaView style={{flex:1}} edges={['top']}>
        <SegmentHeader title="Attendance" caption="Select a class to mark attendance" />
        <SyncPill />
        <EmptyState icon="🌤️" title="No classes today" subtitle="Enjoy your day!" />
      </SafeAreaView></BackgroundView>
    );
  }

  if (allMarked) {
    return (
      <BackgroundView variant="light" style={styles.container}><SafeAreaView style={{flex:1}} edges={['top']}>
        <SegmentHeader title="Attendance" caption="Select a class to mark attendance" />
        <SyncPill />
        <EmptyState
          icon="✅"
          title="All attendance marked!"
          subtitle={`Great work today — ${totalPresent} students present`}
        />
      </SafeAreaView></BackgroundView>
    );
  }

  return (
    <BackgroundView variant="light" style={styles.container}><SafeAreaView style={{flex:1}} edges={['top']}>
      <SegmentHeader
        title="Attendance"
        caption={`${formatDate(new Date(todayDate))} · ${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`}
      />
      <SyncPill />
      <FlatList
        ref={flatListRef}
        data={classes}
        keyExtractor={item => item.slotId}
        renderItem={({item}) => (
          <ClassCard
            entry={item}
            onPress={() => handleClassPress(item)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
      />
    </SafeAreaView></BackgroundView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {paddingBottom: Spacing.huge},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    minHeight: 72,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardActive: {
    borderColor: Colors.warning + '88',
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: Colors.warning,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  cardAccent: {width: 4, alignSelf: 'stretch'},
  subjectPill: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: Spacing.md,
  },
  subjectInitial: {fontSize: 18, fontWeight: '700'},
  cardContent: {flex: 1, paddingVertical: 10, gap: 2},
  cardRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.xs},
  classTitle: {fontSize: 14, flex: 1},
  nowPill: {
    backgroundColor: Colors.warning + '22',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.warning + '55',
  },
  nowText: {fontSize: 10, fontWeight: '700'},
  statusCol: {paddingHorizontal: Spacing.md, alignItems: 'flex-end', gap: 4},
  countText: {marginTop: 2, textAlign: 'right'},
  pendingBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  pendingBadgeActive: {backgroundColor: Colors.warning + '22'},
});
