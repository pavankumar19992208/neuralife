import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View, SectionList, RefreshControl, StyleSheet, TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {BackgroundView} from '@components/ui/BackgroundView';

import {SyncPill} from '@components/ui/SyncPill';
import {CardSkeleton} from '@components/ui/Skeleton';
import {EmptyState} from '@components/ui/EmptyState';
import {ErrorState} from '@components/ui/ErrorState';
import {NetworkBanner} from '@components/ui/NetworkBanner';
import {SchoolHeader} from '@components/teacher/SchoolHeader';
import {KpiStrip} from '@components/teacher/KpiStrip';
import {ContextBar} from '@components/teacher/ContextBar';
import {PeriodCard} from '@components/teacher/PeriodCard';
import {AlertItem} from '@components/teacher/AlertItem';
import {PeriodActionSheet} from '@components/teacher/PeriodActionSheet';
import {StackedCoverageSheet, type PendingPeriod} from '@components/coverage/StackedCoverageSheet';
import {Text} from '@components/ui/Text';
import {WeekGrid} from '@components/teacher/WeekGrid';

import {useHomeData} from '@hooks/useHomeData';
import {useWeekTimetable} from '@hooks/useWeekTimetable';
import {usePeriodStatus} from '@hooks/usePeriodStatus';
import {useNotifications} from '@hooks/useNotifications';
import {useAuthStore} from '@store/authStore';
import {useBranding} from '@lib/branding';
import {haptic} from '@lib/haptics';
import {rv} from '@lib/responsive';
import {showToast, showErrorToast} from '@lib/toast';
import {
  cancelTodayReminders,
  scheduleAttendanceReminder,
  scheduleCoverageReminder,
} from '@lib/notifications';
import {api, ApiError} from '@lib/api';
import {todayIST} from '@lib/dates';
import {Colors, Spacing, Radius, TextColor, Brand, Space, RadiusToken} from '@constants/index';
import {Surface, Palette, Border, Shadow} from '@constants/theme';
import {Typography} from '@constants/typography';

import type {PeriodCard as PeriodCardType, AlertItem as AlertItemType} from '@apptypes/home';

// ─── Section data types ────────────────────────────────────────────────────────

type SectionItem =
  | {type: 'period'; item: PeriodCardType}
  | {type: 'alert';  item: AlertItemType};

interface HomeSection {
  title: string;
  sectionType: 'schedule' | 'alerts';
  data: SectionItem[];
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  showToggle,
  isWeekView,
  onToggle,
}: {
  title: string;
  showToggle?: boolean;
  isWeekView?: boolean;
  onToggle?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="mono" color={TextColor.muted} style={styles.sectionTitle}>{title}</Text>
      {showToggle && (
        <TouchableOpacity
          onPress={onToggle}
          style={styles.weekToggle}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          activeOpacity={0.7}>
          <Text variant="label" color={Brand.indigo} style={styles.toggleText}>
            {isWeekView ? 'Today 📅' : 'Full Week 📅'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function HomeSkeleton({accentColor}: {accentColor: string}) {
  return (
    <BackgroundView variant="light" scrim="soft" style={styles.container}>
      <SafeAreaView style={{flex:1}} edges={['top']}>
      {/* Skeleton header */}
      <View style={styles.skeletonHeader}>
        <CardSkeleton />
      </View>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      </SafeAreaView>
    </BackgroundView>
  );
}

// ─── HomeScreen ────────────────────────────────────────────────────────────────

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const {data, isLoading, isError, error, refetch, isRefetching} = useHomeData();
  const {accentColor} = useBranding();
  const isClassTeacher = useAuthStore(s => s.isClassTeacher);

  const [refreshing, setRefreshing]         = useState(false);
  const [selectedPeriod, setSelected]       = useState<PeriodCardType | null>(null);
  const [sheetVisible, setSheetVisible]     = useState(false);
  const [pendingCoverage, setPendingCoverage] = useState<PendingPeriod[]>([]);
  const [coverageSheetVisible, setCoverageSheetVisible] = useState(false);
  const [isWeekViewVisible, setWeekViewVisible] = useState(false);

  const {weekData, isLoading: isWeekLoading, refetch: refetchWeek} = useWeekTimetable({
    enabled: isWeekViewVisible,
  });

  const isNetworkError = isError && error instanceof ApiError && error.code === 'NETWORK_ERROR';

  // Toast on first network failure; banner stays visible while error persists.
  const toastedRef = useRef(false);
  useEffect(() => {
    if (isError && !toastedRef.current) {
      toastedRef.current = true;
      showErrorToast(error);
    }
    if (!isError) {
      toastedRef.current = false;
    }
  }, [isError, error]);

  // Live period status — ticks every 60s
  const periods = data?.periods ?? [];
  const {contextState, contextPeriod, nextPeriod, periodStatuses} = usePeriodStatus(periods);

  // Push notifications — fires attendance + coverage triggers at the right moment
  useNotifications(periods, periodStatuses);

  // Schedule local notifications and fetch pending coverage when home data loads
  useEffect(() => {
    if (!data?.periods?.length) return;

    const today = todayIST().toISOString().split('T')[0];
    void (async () => {
      try {
        await cancelTodayReminders();
        for (const period of data.periods) {
          if (period.periodType !== 'REGULAR') continue;
          const startISO = `${today}T${period.startTime}:00+05:30`;
          const endISO   = `${today}T${period.endTime}:00+05:30`;
          await scheduleAttendanceReminder({
            periodId: period.id, subject: period.subject,
            classYear: period.classYear, section: period.section,
            startTimeISO: startISO,
          });
          await scheduleCoverageReminder({
            periodId: period.id, subject: period.subject,
            classYear: period.classYear, section: period.section,
            endTimeISO: endISO,
          });
        }
      } catch { /* non-fatal */ }

      // Fetch pending coverage
      try {
        const res = await api.get<{pendingCount: number; periods: PendingPeriod[]}>('/teacher/coverage/pending');
        setPendingCoverage(res.periods ?? []);
      } catch { /* non-fatal */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.periods]);

  const handleRefresh = useCallback(async () => {
    haptic.light();
    setRefreshing(true);
    await Promise.all([
      refetch(),
      isWeekViewVisible ? refetchWeek() : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [refetch, refetchWeek, isWeekViewVisible]);

  const handlePeriodPress = useCallback((period: PeriodCardType) => {
    setSelected(period);
    setSheetVisible(true);
  }, []);

  const handleAlertPress = useCallback((alert: AlertItemType) => {
    showToast(`${alert.actionLabel} — opens in next build`);
  }, []);

  const handleContextAction = useCallback((action: string, period: PeriodCardType | null) => {
    if (action === 'MARK_ATTENDANCE' && period) {
      setSelected(period);
      setSheetVisible(true);
    } else if (action === 'MARK_COVERAGE') {
      setCoverageSheetVisible(true);
    } else if (action === 'VIEW_DOUBTS') {
      navigation.navigate('Chat' as never);
    }
  }, [navigation]);

  const handleSheetAction = useCallback((actionKey: string, period: PeriodCardType) => {
    setSheetVisible(false);
    setSelected(null);
    showToast(`${actionKey.replace(/_/g, ' ')} — opens in next build`);
  }, []);

  const handleWeekToggle = useCallback(() => {
    haptic.light();
    setWeekViewVisible(prev => !prev);
  }, []);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading && !data) {
    return <HomeSkeleton accentColor={accentColor} />;
  }

  // ── Error state (no cached data at all) ─────────────────────────────────────
  if (isError && !data) {
    return (
      <BackgroundView variant="light" scrim="soft" style={styles.container}>
        <SafeAreaView style={{flex:1}} edges={['top']}>
        <SyncPill />
        <ErrorState
          message={
            isNetworkError
              ? "Can't reach server.\nIs the API running? Check .env.development API_URL."
              : (error?.message ?? 'Failed to load')
          }
          onRetry={refetch}
        />
        </SafeAreaView>
      </BackgroundView>
    );
  }

  // ── Not a working day ────────────────────────────────────────────────────────
  if (data && !data.isWorkingDay) {
    return (
      <BackgroundView variant="light" scrim="soft" style={styles.container}>
        <SafeAreaView style={{flex:1}} edges={['top']}>
        <SyncPill />
        <SchoolHeader
          schoolName={data.schoolName}
          schoolLogoUrl={data.schoolLogoUrl}
          teacherName={data.teacherName}
          roles={data.roles}
          classSection={data.classSection}
          todayDate={data.todayDate}
          accentColor={accentColor}
          onProfilePress={() => navigation.navigate('Profile')}
        />
        <EmptyState
          icon="🌤️"
          title={`No classes scheduled today`}
          subtitle={`Enjoy your Sunday, ${data.firstName}.`}
        />
        </SafeAreaView>
      </BackgroundView>
    );
  }

  // ── Empty timetable (working day, no timetable built yet) ────────────────────
  if (data && data.periods.length === 0) {
    return (
      <BackgroundView variant="light" scrim="soft" style={styles.container}>
        <SafeAreaView style={{flex:1}} edges={['top']}>
        <SyncPill />
        <SchoolHeader
          schoolName={data.schoolName}
          schoolLogoUrl={data.schoolLogoUrl}
          teacherName={data.teacherName}
          roles={data.roles}
          classSection={data.classSection}
          todayDate={data.todayDate}
          accentColor={accentColor}
          onProfilePress={() => navigation.navigate('Profile')}
        />
        <EmptyState
          icon="📅"
          title="No periods assigned yet"
          subtitle="Check with your school admin to set up the timetable."
        />
        </SafeAreaView>
      </BackgroundView>
    );
  }

  // ── Main content ─────────────────────────────────────────────────────────────
  const homeData = data!;

  // CHRONOLOGICAL ORDER: sort all periods by startTime ascending (Period 1 at top).
  // This is the PERMANENT rule — never invert, never auto-scroll to NOW.
  const sortedPeriods = [...homeData.periods].sort((a, b) => {
    const [ah, am] = a.startTime.split(':').map(Number);
    const [bh, bm] = b.startTime.split(':').map(Number);
    return (ah ?? 0) * 60 + (am ?? 0) - ((bh ?? 0) * 60 + (bm ?? 0));
  });

  const sections: HomeSection[] = [
    {
      title: "TODAY'S SCHEDULE",
      sectionType: 'schedule',
      data: isWeekViewVisible ? [] : sortedPeriods.map(p => ({type: 'period' as const, item: p})),
    },
    ...(homeData.alerts.length > 0
      ? [{
          title: 'ALERTS',
          sectionType: 'alerts' as const,
          data: homeData.alerts.map(a => ({type: 'alert' as const, item: a})),
        }]
      : []),
  ];

  return (
    <BackgroundView variant="light" scrim="soft" style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

      {/* Network error banner — slides in from top, shows API_URL for debugging */}
      <NetworkBanner visible={isNetworkError} />

      {/* ── Fixed sticky header (SchoolHeader + KpiStrip + ContextBar) ── */}
      <View style={[styles.stickyHeader, isNetworkError && styles.stickyHeaderOffset]}>
        <SyncPill />
        <SchoolHeader
          schoolName={homeData.schoolName}
          schoolLogoUrl={homeData.schoolLogoUrl}
          teacherName={homeData.teacherName}
          roles={homeData.roles}
          classSection={homeData.classSection}
          todayDate={homeData.todayDate}
          accentColor={accentColor}
          onProfilePress={() => navigation.navigate('Profile')}
        />
        <KpiStrip
          kpis={homeData.kpis}
          isClassTeacher={isClassTeacher || !!homeData.classSection}
          accentColor={accentColor}
          onHwPress={() => navigation.navigate('MyClasses')}
          onAbsentPress={() => navigation.navigate('MyClass')}
        />
        <View style={styles.contextBarWrapper}>
          <ContextBar
            contextState={contextState}
            contextPeriod={contextPeriod}
            nextPeriod={nextPeriod}
            firstName={homeData.firstName}
            doubtsPending={homeData.kpis.doubtsPending}
            pendingCoverageCount={pendingCoverage.length}
            accentColor={accentColor}
            onAction={handleContextAction}
          />
        </View>
      </View>

      {/* ── Week Grid (when toggle is active) ── */}
      {isWeekViewVisible && (
        <View style={styles.weekGridContainer}>
          <SectionHeader
            title="WEEK TIMETABLE"
            showToggle={true}
            isWeekView={isWeekViewVisible}
            onToggle={handleWeekToggle}
          />
          <WeekGrid
            weekData={weekData?.days || []}
            isLoading={isWeekLoading}
            onPeriodPress={handlePeriodPress}
          />
        </View>
      )}

      {/* ── Scrollable content: periods + alerts ── */}
      <SectionList<SectionItem, HomeSection>
        sections={sections}
        keyExtractor={item => item.type === 'period' ? item.item.id : item.item.id}
        stickySectionHeadersEnabled={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching}
            onRefresh={handleRefresh}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
        renderSectionHeader={({section}) => (
          <SectionHeader
            title={section.title}
            showToggle={section.sectionType === 'schedule'}
            isWeekView={isWeekViewVisible}
            onToggle={handleWeekToggle}
          />
        )}
        renderItem={({item, index}) => {
          if (item.type === 'period') {
            const statusInfo = periodStatuses[item.item.id] ?? {status: 'UPCOMING' as const, elapsedPct: 0};
            return (
              <PeriodCard
                period={item.item}
                status={statusInfo.status}
                elapsedPct={statusInfo.elapsedPct}
                index={index}
                onPress={handlePeriodPress}
              />
            );
          }
          return (
            <AlertItem
              alert={item.item}
              index={index}
              onPress={handleAlertPress}
            />
          );
        }}
      />

      {/* ── Period action sheet ── */}
      <PeriodActionSheet
        visible={sheetVisible}
        period={selectedPeriod}
        onClose={() => { setSheetVisible(false); setSelected(null); }}
        onAction={handleSheetAction}
      />

      {/* ── Coverage sheet ── */}
      <StackedCoverageSheet
        visible={coverageSheetVisible}
        pendingPeriods={pendingCoverage}
        onClose={() => setCoverageSheetVisible(false)}
        onSubmitted={(count) => {
          setPendingCoverage(prev => prev.slice(count));
          void refetch();
        }}
      />
      </SafeAreaView>
    </BackgroundView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  stickyHeader: {
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: Border.lightDefault,
    zIndex: 10,
    ...Shadow.soft,
  },
  stickyHeaderOffset: {
    marginTop: 48,
  },
  contextBarWrapper: {
    marginBottom: Space.md,
    paddingHorizontal: rv(Space.lg, Space.xxl),
  },
  listContent: {
    paddingBottom: Space.massive,
    paddingTop: Space.sm,
  },
  sectionHeader: {
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    paddingHorizontal: rv(Space.lg, Space.xxl),
    paddingTop: Space.lg,
    paddingBottom: Space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Border.lightDefault,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.neuralBlue,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  skeletonHeader: {
    paddingHorizontal: rv(Space.lg, Space.xxl),
    paddingTop: Space.lg,
  },
  weekToggle: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderRadius: RadiusToken.md,
    backgroundColor: 'rgba(30, 64, 175, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(30, 64, 175, 0.15)',
    ...Shadow.sm,
  },
  toggleText: {
    fontSize: 9,
    fontWeight: '600',
    color: Palette.neuralBlue,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  weekGridContainer: {
    backgroundColor: 'transparent',
    marginBottom: Space.lg,
    paddingHorizontal: rv(Space.lg, Space.xxl),
  },
});
