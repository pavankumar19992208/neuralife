import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BackgroundView} from '@components/ui/BackgroundView';
import {useQuery, useMutation} from '@tanstack/react-query';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CryptoJS = require('crypto-js');

import {Text} from '@components/ui/Text';
import {Button} from '@components/ui/Button';
import {CardSkeleton} from '@components/ui/Skeleton';
import {ErrorState} from '@components/ui/ErrorState';
import {SyncPill} from '@components/ui/SyncPill';
import {StudentRow} from '@components/attendance/StudentRow';
import {LateArrivalSheet} from '@components/attendance/LateArrivalSheet';

import {api} from '@lib/api';
import {haptic} from '@lib/haptics';
import {showToast, showErrorToast} from '@lib/toast';
import {getDeviceIdSync} from '@lib/device';
import {useAttendanceDraft, type DraftKey} from '@hooks/useAttendanceDraft';
import {useDeepLinkParams} from '@hooks/useDeepLinkParams';
import {Colors, Spacing, Radius} from '@constants/index';
import {useAuthStore} from '@store/authStore';
import {useSchoolStore} from '@store/schoolStore';
import type {RootStackParamList} from '@navigation/types';
import type {StudentDraft} from '@db/models/AttendanceDraft';

type AttendanceScreenRouteProp = RouteProp<RootStackParamList, 'AttendanceMark'>;
type NavProp = StackNavigationProp<RootStackParamList>;

const {height: SCREEN_HEIGHT} = Dimensions.get('window');
const CONFIRM_SHEET_HEIGHT = 280;
const SHEET_SPRING = {tension: 80, friction: 12, useNativeDriver: true};

// ─── Student list from API ────────────────────────────────────────────────────

interface StudentEntry {
  neuraId: string;
  name: string;
  rollNumber: number | null;
  photoUrl: string | null;
  currentStatus: string;
  currentReason: string | null;
  originalAttendanceId: string | null;
}

interface StudentsData {
  attendanceMode: 'ONCE_PER_DAY' | 'PER_PERIOD';
  alreadySubmitted: boolean;
  submittedAt: string | null;
  submittedByName: string | null;
  students: StudentEntry[];
}

// ─── Count strip ──────────────────────────────────────────────────────────────

function CountStrip({drafts}: {drafts: StudentDraft[]}) {
  const presentCount  = drafts.filter(s => s.status === 'PRESENT').length;
  const absentCount   = drafts.filter(s => s.status === 'ABSENT').length;
  const lateCount     = drafts.filter(s => s.status === 'LATE').length;
  const total         = drafts.length;

  return (
    <View style={styles.countStrip}>
      <View style={styles.countItem}>
        <Text variant="h2" color={Colors.success}>{presentCount}</Text>
        <Text variant="caption" color={Colors.textMuted}>P</Text>
        <View style={[styles.countBar, {backgroundColor: Colors.success, width: total ? (presentCount / total) * 60 : 0}]} />
      </View>
      <View style={styles.countDivider} />
      <View style={styles.countItem}>
        <Text variant="h2" color={Colors.danger}>{absentCount}</Text>
        <Text variant="caption" color={Colors.textMuted}>A</Text>
        <View style={[styles.countBar, {backgroundColor: Colors.danger, width: total ? (absentCount / total) * 60 : 0}]} />
      </View>
      <View style={styles.countDivider} />
      <View style={styles.countItem}>
        <Text variant="h2" color={Colors.warning}>{lateCount}</Text>
        <Text variant="caption" color={Colors.textMuted}>L</Text>
        <View style={[styles.countBar, {backgroundColor: Colors.warning, width: total ? (lateCount / total) * 60 : 0}]} />
      </View>
    </View>
  );
}

// ─── Confirm sheet ────────────────────────────────────────────────────────────

interface ConfirmSheetProps {
  visible: boolean;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  classYear: number;
  section: string;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmSheet({visible, presentCount, absentCount, lateCount, classYear, section, isLoading, onConfirm, onClose}: ConfirmSheetProps) {
  const translateY   = useRef(new Animated.Value(CONFIRM_SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {toValue: 0, ...SHEET_SPRING}),
        Animated.timing(backdropOpacity, {toValue: 1, duration: 200, useNativeDriver: true}),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {toValue: CONFIRM_SHEET_HEIGHT, ...SHEET_SPRING}),
        Animated.timing(backdropOpacity, {toValue: 0, duration: 200, useNativeDriver: true}),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.backdrop, {opacity: backdropOpacity}]}>
      <TouchableOpacity style={styles.backdropTap} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.confirmSheet, {transform: [{translateY}]}]}>
        <View style={styles.handleArea}><View style={styles.handle} /></View>
        <View style={styles.confirmContent}>
          <Text variant="h3">Submit attendance for Class {classYear}-{section}?</Text>
          <Text variant="body" color={Colors.textSecondary} style={{marginTop: 4}}>
            {presentCount} Present · {absentCount} Absent · {lateCount} Late
          </Text>
          <Text variant="caption" color={Colors.textMuted} style={styles.signatureNote}>
            This creates a digitally signed record.
          </Text>
        </View>
        <View style={styles.confirmActions}>
          <Button
            label={isLoading ? 'Submitting…' : 'Confirm & Submit'}
            onPress={onConfirm}
            loading={isLoading}
            style={styles.confirmBtn}
          />
          <TouchableOpacity onPress={onClose} style={styles.reviewBtn} activeOpacity={0.7}>
            <Text variant="label" color={Colors.textMuted}>Review Again</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── AttendanceScreen ─────────────────────────────────────────────────────────

export function AttendanceScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<AttendanceScreenRouteProp>();
  const deepLink   = useDeepLinkParams('ATTENDANCE');

  // Resolve params from route or deep-link
  const classYear    = route.params?.classYear    ?? Number(deepLink.classYear ?? 0);
  const section      = route.params?.section      ?? (deepLink.section ?? '');
  const subject      = route.params?.subject      ?? (deepLink.subject  ?? '');
  const date         = route.params?.date         ?? (deepLink.date    ?? new Date().toISOString().split('T')[0]);
  const periodNumber = route.params?.periodNumber;

  const teacherId  = useAuthStore(s => s.teacherId)  ?? '';
  const schoolId   = useSchoolStore(s => s.schoolId) ?? useAuthStore(s => s.schoolId) ?? '';

  const {saveDraft, loadDraft, markSubmitted} = useAttendanceDraft();
  const [studentDrafts,    setStudentDrafts]    = useState<StudentDraft[]>([]);
  const [draftLoaded,      setDraftLoaded]      = useState(false);
  const [resumeBannerMsg,  setResumeBannerMsg]  = useState<string | null>(null);
  const [confirmVisible,   setConfirmVisible]   = useState(false);
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [lateArrivalStudent, setLateArrivalStudent] = useState<{
    neuraId: string; name: string; originalAttendanceId: string;
  } | null>(null);

  const draftKey: DraftKey = {schoolId, classYear, section, attendanceDate: date};

  const {data, isLoading, error, refetch} = useQuery<StudentsData>({
    queryKey: ['attendance', 'students', classYear, section, date],
    queryFn: () => api.get<StudentsData>(`/teacher/attendance/students?classYear=${classYear}&section=${section}&date=${date}`),
    staleTime: 0,
    enabled: !!classYear && !!section,
  });

  // Initialise drafts after data loads
  useEffect(() => {
    if (!data || draftLoaded) return;
    setDraftLoaded(true);

    loadDraft(draftKey).then(savedDraft => {
      if (savedDraft && savedDraft.length === data.students.length) {
        setStudentDrafts(savedDraft);
        const markedCount = savedDraft.filter(s => s.status !== 'NOT_MARKED' as never).length;
        setResumeBannerMsg(`📝 Resuming your draft — ${markedCount}/${savedDraft.length} marked`);
      } else {
        // Default all to PRESENT
        const initial: StudentDraft[] = data.students.map(s => ({
          neuraId:     s.neuraId,
          name:        s.name,
          rollNumber:  s.rollNumber ?? undefined,
          photoUrl:    s.photoUrl  ?? undefined,
          status:      'PRESENT' as const,
          reason:      undefined,
        }));
        setStudentDrafts(initial);
      }
    }).catch(() => {
      const initial: StudentDraft[] = (data?.students ?? []).map(s => ({
        neuraId: s.neuraId, name: s.name,
        rollNumber: s.rollNumber ?? undefined, photoUrl: s.photoUrl ?? undefined,
        status: 'PRESENT' as const, reason: undefined,
      }));
      setStudentDrafts(initial);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, draftLoaded]);

  const handleStatusChange = useCallback((neuraId: string, status: 'PRESENT'|'ABSENT'|'LATE', reason?: string) => {
    setStudentDrafts(prev => {
      const updated = prev.map(s => s.neuraId === neuraId ? {...s, status, reason} : s);
      // Fire-and-forget WatermelonDB write — never blocks UI
      saveDraft(draftKey, updated).catch(() => {});
      return updated;
    });
  }, [draftKey, saveDraft]);

  const handleStartFresh = useCallback(() => {
    const fresh: StudentDraft[] = (data?.students ?? []).map(s => ({
      neuraId: s.neuraId, name: s.name,
      rollNumber: s.rollNumber ?? undefined, photoUrl: s.photoUrl ?? undefined,
      status: 'PRESENT' as const, reason: undefined,
    }));
    setStudentDrafts(fresh);
    setResumeBannerMsg(null);
    saveDraft(draftKey, fresh).catch(() => {});
  }, [data, draftKey, saveDraft]);

  const handleConfirmSubmit = async () => {
    haptic.medium();
    setIsSubmitting(true);

    try {
      const submittedAt = new Date().toISOString();
      const deviceId = getDeviceIdSync();

      // Compute SHA-256 signature
      const sigInput = [
        teacherId, classYear, section, date,
        periodNumber ?? 'null',
        submittedAt,
        deviceId,
      ].join('|');
      const signatureHash = CryptoJS.SHA256(sigInput).toString(CryptoJS.enc.Hex);

      await api.post('/teacher/attendance/submit', {
        classYear,
        section,
        date,
        periodNumber,
        attendanceMode: data?.attendanceMode ?? 'ONCE_PER_DAY',
        records: studentDrafts.map(s => ({
          neuraId: s.neuraId,
          status:  s.status,
          reason:  s.reason,
        })),
        signatureHash,
        deviceId,
        submittedAt,
      });

      await markSubmitted(draftKey, submittedAt);
      haptic.success();
      setConfirmVisible(false);

      showToast(
        `✅ Attendance submitted · ${presentCount}P · ${absentCount}A · ${lateCount}L — Signed & notified 🔔`,
        'long',
      );

      // Reload to show read-only state
      await refetch();
    } catch (e) {
      haptic.error();
      showErrorToast(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Counts
  const presentCount = studentDrafts.filter(s => s.status === 'PRESENT').length;
  const absentCount  = studentDrafts.filter(s => s.status === 'ABSENT').length;
  const lateCount    = studentDrafts.filter(s => s.status === 'LATE').length;

  const isReadOnly = data?.alreadySubmitted ?? false;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <BackgroundView variant="light" scrim="strong" style={styles.container}><SafeAreaView style={{flex:1}} edges={['top']}>
        <View style={styles.screenHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text variant="h3" style={{flex:1}}>
            {subject.replace(/_/g,' ')} · Class {classYear}-{section}
          </Text>
          <SyncPill />
        </View>
        <CardSkeleton /><CardSkeleton /><CardSkeleton />
        <CardSkeleton /><CardSkeleton /><CardSkeleton />
      </SafeAreaView></BackgroundView>
    );
  }

  if (error && !data) {
    return (
      <BackgroundView variant="light" scrim="strong" style={styles.container}><SafeAreaView style={{flex:1}} edges={['top']}>
        <ErrorState message="Could not load students" onRetry={refetch} />
      </SafeAreaView></BackgroundView>
    );
  }

  // ── READ-ONLY (already submitted) ─────────────────────────────────────────
  const submittedStudents: StudentDraft[] = (data?.students ?? []).map(s => ({
    neuraId:    s.neuraId,
    name:       s.name,
    rollNumber: s.rollNumber ?? undefined,
    photoUrl:   s.photoUrl   ?? undefined,
    status:     (s.currentStatus === 'NOT_MARKED' ? 'PRESENT' : s.currentStatus) as 'PRESENT'|'ABSENT'|'LATE',
    reason:     s.currentReason ?? undefined,
  }));

  return (
    <BackgroundView variant="light" scrim="strong" style={styles.container}><SafeAreaView style={{flex:1}} edges={['top']}>
      {/* Screen header */}
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top:8,bottom:8,left:8,right:8}}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{flex:1}}>
          <Text variant="h3">{subject.replace(/_/g,' ')} · Class {classYear}-{section}</Text>
          <Text variant="caption" color={Colors.textMuted}>{date}</Text>
        </View>
        <SyncPill />
      </View>

      {/* Submitted banner */}
      {isReadOnly && data?.submittedAt && (
        <View style={styles.submittedBanner}>
          <Text variant="label" color="#fff">
            ✅ Submitted at {new Date(data.submittedAt).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})}
            {data.submittedByName ? ` by ${data.submittedByName}` : ''}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.8)">
            Signed · Parents notified · Principal notified
          </Text>
        </View>
      )}

      {/* Draft resume banner */}
      {!isReadOnly && resumeBannerMsg && (
        <View style={styles.draftBanner}>
          <Text variant="caption" color={Colors.warning} style={{flex:1}}>{resumeBannerMsg}</Text>
          <TouchableOpacity onPress={handleStartFresh} activeOpacity={0.7}>
            <Text variant="caption" color={Colors.accent}>Start fresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Count strip (not read-only) */}
      {!isReadOnly && studentDrafts.length > 0 && (
        <CountStrip drafts={studentDrafts} />
      )}

      {/* Student list */}
      <FlatList
        data={isReadOnly ? submittedStudents : studentDrafts}
        keyExtractor={item => item.neuraId}
        renderItem={({item, index}) => (
          <StudentRow
            student={item}
            index={index}
            onStatusChange={handleStatusChange}
            isReadOnly={isReadOnly}
            onLateArrivalPress={isReadOnly ? (s) => {
              const original = data?.students.find(st => st.neuraId === s.neuraId);
              if (original?.originalAttendanceId) {
                setLateArrivalStudent({
                  neuraId: s.neuraId,
                  name: s.name,
                  originalAttendanceId: original.originalAttendanceId,
                });
              }
            } : undefined}
          />
        )}
        removeClippedSubviews
        maxToRenderPerBatch={12}
        windowSize={10}
        initialNumToRender={10}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Submit button (not read-only) */}
      {!isReadOnly && (
        <View style={styles.submitArea}>
          <Button
            label={`Submit Attendance · ${date.slice(5)}`}
            onPress={() => { haptic.medium(); setConfirmVisible(true); }}
            style={styles.submitBtn}
          />
        </View>
      )}

      {/* Confirmation sheet */}
      <ConfirmSheet
        visible={confirmVisible}
        presentCount={presentCount}
        absentCount={absentCount}
        lateCount={lateCount}
        classYear={classYear}
        section={section}
        isLoading={isSubmitting}
        onConfirm={handleConfirmSubmit}
        onClose={() => setConfirmVisible(false)}
      />

      {/* Late arrival correction sheet */}
      {lateArrivalStudent && (
        <LateArrivalSheet
          visible={!!lateArrivalStudent}
          student={lateArrivalStudent}
          onClose={() => setLateArrivalStudent(null)}
          onSubmitted={() => { setLateArrivalStudent(null); refetch(); }}
        />
      )}
    </SafeAreaView></BackgroundView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  screenHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
    backgroundColor: '#ffffff',
  },
  backArrow: {fontSize: 22, color: Colors.textPrimary, paddingRight: 4},
  submittedBanner: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.success,
    gap: 2,
  },
  draftBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.warning + '22',
    borderBottomWidth: 1, borderBottomColor: Colors.warning + '44',
    gap: Spacing.md,
  },
  countStrip: {
    flexDirection: 'row', alignItems: 'center',
    height: 52, backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
    gap: Spacing.xl,
  },
  countItem: {alignItems: 'center', gap: 2, flex: 1},
  countBar: {height: 3, borderRadius: 2, maxWidth: 60},
  countDivider: {width: 1, height: 28, backgroundColor: Colors.cardBorder},
  listContent: {paddingBottom: 80},
  submitArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: Colors.cardBorder,
  },
  submitBtn: {width: '100%'},
  // Confirm sheet
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', zIndex: 100,
  },
  backdropTap: {flex: 1},
  confirmSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    height: CONFIRM_SHEET_HEIGHT, overflow: 'hidden',
  },
  handleArea: {alignItems: 'center', paddingTop: Spacing.md, paddingBottom: Spacing.sm},
  handle: {width: 40, height: 4, backgroundColor: Colors.cardBorder, borderRadius: 2},
  confirmContent: {paddingHorizontal: Spacing.lg, flex: 1, paddingTop: Spacing.sm},
  signatureNote: {marginTop: Spacing.sm, fontStyle: 'italic'},
  confirmActions: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.md},
  confirmBtn: {width: '100%'},
  reviewBtn: {alignItems: 'center', paddingVertical: Spacing.sm},
});
