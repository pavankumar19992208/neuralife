import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {Text} from '@components/ui/Text';
import {SheetContainer} from '@components/ui/SheetContainer';
import {Colors, Spacing, Radius} from '@constants/index';
import {haptic} from '@lib/haptics';
import {rv} from '@lib/responsive';
import {todayIST} from '@lib/dates';
import type {PeriodCard} from '@apptypes/home';
import type {RootStackParamList} from '@navigation/types';
const SPRING = {tension: 80, friction: 12, useNativeDriver: true};

interface ActionRowProps {
  icon: string;
  label: string;
  done?: boolean;
  onPress: () => void;
}

function ActionRow({icon, label, done, onPress}: ActionRowProps) {
  const handlePress = () => {
    haptic.light();
    onPress();
  };
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.actionRow, done && styles.actionRowDone]}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text variant="body" color={done ? Colors.textMuted : Colors.textPrimary} style={styles.actionLabel}>
        {label}
      </Text>
      {done ? (
        <Text style={styles.checkmark}>✓</Text>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

interface Props {
  visible: boolean;
  period: PeriodCard | null;
  onClose: () => void;
  onAction: (actionKey: string, period: PeriodCard) => void;
}

export function PeriodActionSheet({visible, period, onClose, onAction}: Props) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const act = (key: string) => {
    if (!period) return;
    haptic.medium();
    if (key === 'MARK_ATTENDANCE') {
      onClose();
      navigation.navigate('AttendanceMark', {
        classYear:    period.classYear,
        section:      period.section,
        subject:      period.subject,
        date:         todayIST().toISOString().split('T')[0],
        periodNumber: period.periodNumber > 0 ? period.periodNumber : undefined,
      });
      return;
    }
    onAction(key, period);
  };

  return (
    <SheetContainer visible={visible} onClose={onClose}>
        {/* Header */}
        {period && (
          <View style={styles.header}>
            <View>
              <Text variant="h3">
                {period.subject.replace(/_/g, ' ')} · Class {period.classYear}-{period.section}
              </Text>
              <Text variant="bodySmall" color={Colors.textSecondary}>
                {period.startTime}–{period.endTime}
                {period.roomNumber ? ` · Room ${period.roomNumber}` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <ActionRow
            icon="👥" label="Mark Attendance"
            done={period?.attendanceMarked}
            onPress={() => act('MARK_ATTENDANCE')}
          />
          <ActionRow
            icon="📋" label="Mark Coverage"
            done={period?.coverageMarked}
            onPress={() => act('MARK_COVERAGE')}
          />
          <ActionRow
            icon="📝" label="Assign Homework"
            onPress={() => act('ASSIGN_HOMEWORK')}
          />
          <ActionRow
            icon="👁️" label="View Students"
            onPress={() => act('VIEW_STUDENTS')}
          />
        </View>

        {/* Cancel */}
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text variant="label" color={Colors.textMuted} style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
    </SheetContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: rv(Spacing.lg, Spacing.xxl),
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  actions: {paddingTop: Spacing.sm},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rv(Spacing.lg, Spacing.xxl),
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    gap: Spacing.md,
  },
  actionRowDone: {opacity: 0.5},
  actionIcon:  {fontSize: 22, width: 28},
  actionLabel: {flex: 1},
  checkmark:   {color: Colors.success, fontSize: 18},
  chevron:     {color: Colors.textMuted, fontSize: 20},
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xs,
  },
  cancelText: {},
  iosSpacer: {height: 20},
});
