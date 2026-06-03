import React, {memo, useRef, useState, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import {Text} from '@components/ui/Text';
import {Avatar} from '@components/ui/Avatar';
import {Colors, Spacing, Radius} from '@constants/index';
import {haptic} from '@lib/haptics';
import type {StudentDraft} from '@db/models/AttendanceDraft';

type AttStatus = 'PRESENT' | 'ABSENT' | 'LATE';

// Pixel offset for each segment in the 114px wide toggle
const SEGMENT_X: Record<AttStatus, number> = {PRESENT: 2, ABSENT: 38, LATE: 74};
const SEGMENT_BG: Record<AttStatus, string> = {
  PRESENT: 'rgba(16,185,129,0.15)',
  ABSENT:  'rgba(239,68,68,0.15)',
  LATE:    'rgba(245,158,11,0.15)',
};
const SEGMENT_COLOR: Record<AttStatus, string> = {
  PRESENT: Colors.success,
  ABSENT:  Colors.danger,
  LATE:    Colors.warning,
};

const REASON_OPTIONS = ['Medical', 'Family', 'No reason', 'Other'];

// ─── ThreeSegmentToggle ───────────────────────────────────────────────────────

interface ToggleProps {
  status: AttStatus;
  disabled: boolean;
  onChange: (s: AttStatus) => void;
}

function ThreeSegmentToggle({status, disabled, onChange}: ToggleProps) {
  const indicatorX = useRef(new Animated.Value(SEGMENT_X[status])).current;
  const indicatorBg = useRef(new Animated.Value(0)).current;

  const selectStatus = useCallback((s: AttStatus) => {
    if (disabled) return;
    haptic.light();
    Animated.spring(indicatorX, {
      toValue: SEGMENT_X[s],
      damping: 18, stiffness: 280, useNativeDriver: false,
    }).start();
    onChange(s);
  }, [disabled, indicatorX, onChange]);

  return (
    <View style={styles.toggleOuter} pointerEvents={disabled ? 'none' : 'auto'}>
      {/* Sliding indicator */}
      <Animated.View
        style={[
          styles.toggleIndicator,
          {translateX: indicatorX, backgroundColor: SEGMENT_BG[status]},
        ]}
      />
      {/* Segment tap targets */}
      {(['PRESENT', 'ABSENT', 'LATE'] as AttStatus[]).map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => selectStatus(s)}
          activeOpacity={0.7}
          style={styles.toggleSegment}>
          <Text
            variant="mono"
            style={[
              styles.toggleLabel,
              {color: status === s ? SEGMENT_COLOR[s] : Colors.textMuted},
              status === s && styles.toggleLabelActive,
            ]}>
            {s[0]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── StudentRow ────────────────────────────────────────────────────────────────

interface Props {
  student: StudentDraft;
  index: number;
  onStatusChange: (neuraId: string, status: AttStatus, reason?: string) => void;
  isReadOnly: boolean;
  onLateArrivalPress?: (student: StudentDraft) => void;
}

export const StudentRow = memo(function StudentRow({
  student, onStatusChange, isReadOnly, onLateArrivalPress,
}: Props) {
  const [reasonExpanded, setReasonExpanded] = useState(false);
  const [selectedReason, setSelectedReason] = useState(student.reason ?? '');
  const maxHeight = useRef(new Animated.Value(
    (student.status === 'ABSENT' || student.status === 'LATE') ? 72 : 0
  )).current;

  const handleStatusChange = useCallback((s: AttStatus) => {
    onStatusChange(student.neuraId, s, selectedReason);
    const shouldExpand = s === 'ABSENT' || s === 'LATE';
    setReasonExpanded(shouldExpand);
    Animated.spring(maxHeight, {
      toValue: shouldExpand ? 72 : 0,
      damping: 20, stiffness: 200, useNativeDriver: false,
    }).start();
  }, [student.neuraId, selectedReason, onStatusChange, maxHeight]);

  const handleReasonSelect = useCallback((reason: string) => {
    haptic.light();
    setSelectedReason(reason);
    onStatusChange(student.neuraId, student.status as AttStatus, reason);
    // Auto-collapse after 300ms
    setTimeout(() => {
      setReasonExpanded(false);
      Animated.spring(maxHeight, {
        toValue: 0, damping: 20, stiffness: 200, useNativeDriver: false,
      }).start();
    }, 300);
  }, [student.neuraId, student.status, onStatusChange, maxHeight]);

  return (
    <View style={styles.container}>
      {/* Main row */}
      <View style={styles.row}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <Avatar name={student.name} size={40} />
        </View>

        {/* Name + info */}
        <View style={styles.info}>
          <Text variant="body" style={styles.name}>{student.name}</Text>
          <Text variant="caption" color={Colors.textMuted}>
            {selectedReason && !isReadOnly
              ? selectedReason
              : student.rollNumber
              ? `Roll ${student.rollNumber}`
              : ''}
          </Text>
          {/* Late arrival link in read-only mode */}
          {isReadOnly && student.status === 'ABSENT' && onLateArrivalPress && (
            <TouchableOpacity
              onPress={() => { haptic.light(); onLateArrivalPress(student); }}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text variant="caption" color={Colors.accent}>[Late arrival?]</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Toggle or badge */}
        {isReadOnly ? (
          <View style={[styles.readOnlyBadge, {backgroundColor: SEGMENT_BG[student.status as AttStatus] ?? Colors.surface}]}>
            <Text variant="mono" style={{color: SEGMENT_COLOR[student.status as AttStatus] ?? Colors.textMuted, fontWeight: '700', fontSize: 12}}>
              {student.status[0]}
            </Text>
          </View>
        ) : (
          <ThreeSegmentToggle
            status={student.status as AttStatus}
            disabled={isReadOnly}
            onChange={handleStatusChange}
          />
        )}
      </View>

      {/* Reason expand area (absent/late only) */}
      {!isReadOnly && (
        <Animated.View style={[styles.reasonArea, {maxHeight}]}>
          <Text variant="caption" color={Colors.textMuted} style={styles.reasonLabel}>
            Reason (optional)
          </Text>
          <View style={styles.reasonChips}>
            {REASON_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => handleReasonSelect(r)}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  selectedReason === r && styles.chipActive,
                ]}>
                <Text
                  variant="caption"
                  color={selectedReason === r ? '#fff' : Colors.textSecondary}
                  style={styles.chipText}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  avatarWrap: {width: 40, height: 40},
  info: {flex: 1, gap: 2},
  name: {fontWeight: '500'},
  readOnlyBadge: {
    width: 34, height: 34, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  // ── Toggle ──
  toggleOuter: {
    width: 114, height: 34, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1, borderColor: Colors.cardBorder,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  toggleIndicator: {
    position: 'absolute',
    top: 2, width: 36, height: 30,
    borderRadius: Radius.full - 2,
  },
  toggleSegment: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  toggleLabel: {fontSize: 12, fontWeight: '400'},
  toggleLabelActive: {fontWeight: '700'},
  // ── Reason area ──
  reasonArea: {
    overflow: 'hidden',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  reasonLabel: {marginBottom: 6},
  reasonChips: {flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap'},
  chip: {
    paddingHorizontal: Spacing.md, height: 28, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.accent, borderColor: Colors.accent,
  },
  chipText: {fontSize: 11},
});
