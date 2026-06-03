import React, {useState, useCallback, useEffect} from 'react';
import {View, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import {BackgroundView} from '@components/ui/BackgroundView';
import {Text} from '@components/ui/Text';
import {SyncPill} from '@components/ui/SyncPill';
import {CardSkeleton} from '@components/ui/Skeleton';
import {ErrorState} from '@components/ui/ErrorState';
import {EmptyState} from '@components/ui/EmptyState';
import {Card} from '@components/ui/Card';

import {useMyClasses, type TeacherClass} from '@hooks/useMyClasses';
import {usePeriodStatus} from '@hooks/usePeriodStatus';
import {useStaggerAnimation} from '@hooks/useEntryAnimation';
import {haptic} from '@lib/haptics';
import {rv} from '@lib/responsive';
import {
  Surface,
  Border,
  TextColor,
  Brand,
  Semantic,
  Space,
  RadiusToken,
  Shadow,
} from '@constants/index';

// ── Types ──────────────────────────────────────────────────────────────────────

type SubTab = 'students' | 'homework' | 'marks' | 'syllabus' | 'doubts';

// ── Subject abbreviation mapping ──────────────────────────────────────────────

function getSubjectAbbreviation(subject: string): string {
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
}

// ── Class Chip Component ──────────────────────────────────────────────────────

function ClassChip({
  teacherClass,
  isActive,
  index,
  onPress,
}: {
  teacherClass: TeacherClass;
  isActive: boolean;
  index: number;
  onPress: () => void;
}) {
  const entryAnim = useStaggerAnimation(index * 60);

  const handlePress = useCallback(() => {
    haptic.light();
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View style={[styles.classChip, isActive && styles.classChipActive, entryAnim.animatedStyle]}>
        <Text
          variant="label"
          color={isActive ? 'white' : TextColor.secondary}
          style={styles.classChipLabel}>
          {getSubjectAbbreviation(teacherClass.subject)} {teacherClass.classYear}-{teacherClass.section}
        </Text>
        <Text
          variant="caption"
          color={isActive ? 'rgba(255,255,255,0.8)' : TextColor.muted}
          style={styles.classChipInfo}>
          {teacherClass.studentCount} students
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Sub-Tab Bar ───────────────────────────────────────────────────────────────

function SubTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: SubTab;
  onTabChange: (tab: SubTab) => void;
}) {
  const tabs: Array<{key: SubTab; label: string}> = [
    {key: 'students', label: 'Students'},
    {key: 'homework', label: 'Homework'},
    {key: 'marks', label: 'Marks'},
    {key: 'syllabus', label: 'Syllabus'},
    {key: 'doubts', label: 'Doubts'},
  ];

  return (
    <View style={styles.subTabBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabScroll}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                haptic.light();
                onTabChange(tab.key);
              }}
              style={[styles.subTab, isActive && styles.subTabActive]}
              activeOpacity={0.7}>
              <Text
                variant="bodyMedium"
                color={isActive ? 'white' : TextColor.muted}
                style={styles.subTabText}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.subTabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Coming Soon Sub-Tab ───────────────────────────────────────────────────────

function ComingSoonSubTab({tabName}: {tabName: string}) {
  const getTabInfo = (name: string) => {
    switch (name) {
      case 'homework':
        return {
          icon: '📋',
          title: 'Homework Manager',
          subtitle: 'Review, grade and track student submissions.\nParent notifications · Chapter-linked assignments\n· E-library integration. Coming next build.',
        };
      case 'doubts':
        return {
          icon: '🧠',
          title: 'Smart Doubts',
          subtitle: 'Student questions from SmartPad, auto-detected\nby GAP-AI. Statistics, common doubts, resolution\ntracking. Coming next build.',
        };
      default:
        return {
          icon: '🚀',
          title: 'Feature Coming Soon',
          subtitle: 'This feature is being built and will be available in the next update.',
        };
    }
  };

  const {icon, title, subtitle} = getTabInfo(tabName);

  return (
    <View style={styles.comingSoonContainer}>
      <Card style={styles.comingSoonCard}>
        <Text variant="h1" style={styles.comingSoonIcon}>
          {icon}
        </Text>
        <Text variant="h3" color={TextColor.primary} style={styles.comingSoonTitle}>
          {title}
        </Text>
        <Text variant="small" color={TextColor.secondary} style={styles.comingSoonSubtitle}>
          {subtitle}
        </Text>
        <View style={styles.buildingBadge}>
          <Text variant="label" color={Brand.indigo} style={styles.buildingText}>
            BUILDING
          </Text>
        </View>
      </Card>
    </View>
  );
}

// ── Loading Screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <BackgroundView variant="light" style={styles.container}>
      <SafeAreaView style={{flex: 1}} edges={['top']}>
        <SyncPill />
        <View style={styles.header}>
          <Text variant="h2" color={TextColor.primary}>
            My Classes
          </Text>
        </View>
        <View style={styles.classChipContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classChipScroll}>
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.skeletonChip}>
                <CardSkeleton />
              </View>
            ))}
          </ScrollView>
        </View>
        <View style={styles.loadingContent}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    </BackgroundView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function MyClassesScreen() {
  const {classes, isLoading, isError, error, refetch} = useMyClasses();

  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [activeTab, setActiveTab] = useState<SubTab>('students');

  // Auto-select the first class when data loads
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  const handleClassSelect = useCallback((teacherClass: TeacherClass) => {
    setSelectedClass(teacherClass);
  }, []);

  const handleTabChange = useCallback((tab: SubTab) => {
    setActiveTab(tab);
  }, []);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading && !classes.length) {
    return <LoadingScreen />;
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError && !classes.length) {
    return (
      <BackgroundView variant="light" style={styles.container}>
        <SafeAreaView style={{flex: 1}} edges={['top']}>
          <SyncPill />
          <View style={styles.header}>
            <Text variant="h2" color={TextColor.primary}>
              My Classes
            </Text>
          </View>
          <ErrorState message={error?.message || 'Failed to load classes'} onRetry={refetch} />
        </SafeAreaView>
      </BackgroundView>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!classes.length) {
    return (
      <BackgroundView variant="light" style={styles.container}>
        <SafeAreaView style={{flex: 1}} edges={['top']}>
          <SyncPill />
          <View style={styles.header}>
            <Text variant="h2" color={TextColor.primary}>
              My Classes
            </Text>
          </View>
          <EmptyState
            icon="📚"
            title="No classes assigned"
            subtitle="Contact your school admin to assign classes to your timetable."
          />
        </SafeAreaView>
      </BackgroundView>
    );
  }

  // ── Main content ─────────────────────────────────────────────────────────────
  return (
    <BackgroundView variant="light" style={styles.container}>
      <SafeAreaView style={{flex: 1}} edges={['top']}>
        <SyncPill />

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text variant="h2" color={TextColor.primary}>
            My Classes
          </Text>
        </View>

        {/* ── Class Selector ── */}
        <View style={styles.classChipContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classChipScroll}>
            <View style={styles.classChipContent}>
              {classes.map((teacherClass, index) => (
                <ClassChip
                  key={`${teacherClass.classYear}-${teacherClass.section}-${teacherClass.subject}`}
                  teacherClass={teacherClass}
                  isActive={
                    selectedClass?.classYear === teacherClass.classYear &&
                    selectedClass?.section === teacherClass.section &&
                    selectedClass?.subject === teacherClass.subject
                  }
                  index={index}
                  onPress={() => handleClassSelect(teacherClass)}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* ── Sub-Tab Bar ── */}
        <SubTabBar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* ── Tab Content ── */}
        <View style={styles.tabContent}>
          {activeTab === 'students' && selectedClass && (
            <EmptyState
              icon="👥"
              title="Students Tab"
              subtitle="Student roster and details coming in next build."
            />
          )}
          {activeTab === 'marks' && selectedClass && (
            <EmptyState
              icon="📊"
              title="Marks Tab"
              subtitle="Exam schedules and marks entry coming in next build."
            />
          )}
          {activeTab === 'syllabus' && selectedClass && (
            <EmptyState
              icon="📖"
              title="Syllabus Tab"
              subtitle="Chapter coverage and progress tracking coming in next build."
            />
          )}
          {(activeTab === 'homework' || activeTab === 'doubts') && (
            <ComingSoonSubTab tabName={activeTab} />
          )}
        </View>
      </SafeAreaView>
    </BackgroundView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: rv(Space.xl, Space.xxl),
    paddingTop: Space.lg,
    paddingBottom: Space.md,
  },
  classChipContainer: {
    paddingBottom: Space.md,
  },
  classChipScroll: {
    paddingLeft: rv(Space.xl, Space.xxl),
  },
  classChipContent: {
    flexDirection: 'row',
    gap: Space.sm,
    paddingRight: rv(Space.xl, Space.xxl),
  },
  classChip: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: RadiusToken.lg,
    backgroundColor: Surface.glass,
    borderWidth: 1,
    borderColor: Border.glass,
    minWidth: 88,
    alignItems: 'center',
  },
  classChipActive: {
    backgroundColor: Brand.indigo,
    borderColor: Brand.indigo,
    ...Shadow.glow,
  },
  classChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  classChipInfo: {
    fontSize: 9,
    marginTop: 1,
    textAlign: 'center',
  },
  subTabBar: {
    borderBottomWidth: 1,
    borderBottomColor: Border.subtle,
    marginHorizontal: rv(Space.xl, Space.xxl),
    marginBottom: Space.lg,
  },
  subTabScroll: {
    gap: Space.md,
  },
  subTab: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    position: 'relative',
  },
  subTabActive: {
    // Active styles handled by text color and indicator
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  subTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: Space.md,
    right: Space.md,
    height: 2,
    backgroundColor: Brand.indigo,
    borderRadius: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: rv(Space.xl, Space.xxl),
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Space.xxxl,
  },
  comingSoonCard: {
    padding: Space.xxxl,
    alignItems: 'center',
    maxWidth: 320,
  },
  comingSoonIcon: {
    fontSize: 48,
    marginBottom: Space.lg,
  },
  comingSoonTitle: {
    textAlign: 'center',
    marginBottom: Space.md,
  },
  comingSoonSubtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Space.lg,
  },
  buildingBadge: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderRadius: RadiusToken.full,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.20)',
  },
  buildingText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  loadingContent: {
    flex: 1,
    paddingHorizontal: rv(Space.xl, Space.xxl),
    gap: Space.md,
  },
  skeletonChip: {
    width: 88,
    height: 48,
    marginRight: Space.sm,
  },
});
