import React, {useState} from 'react';
import {View, TextInput, StyleSheet} from 'react-native';
import {Text} from '@components/ui/Text';
import {Button} from '@components/ui/Button';
import {Chip} from '@components/ui/Chip';
import {SheetContainer} from '@components/ui/SheetContainer';
import {TextColor, Border, Surface, Space, RadiusToken} from '@constants/index';
import {haptic} from '@lib/haptics';
import {showToast} from '@lib/toast';
import {api} from '@lib/api';

const TIME_PRESETS = ['10 min late', '30 min late', 'After break', 'Custom'];
const REASON_OPTIONS = ['Medical', 'Family', 'No reason', 'Other'];

interface Props {
  visible: boolean;
  student: {neuraId: string; name: string; originalAttendanceId: string};
  onClose: () => void;
  onSubmitted: () => void;
}

export function LateArrivalSheet({visible, student, onClose, onSubmitted}: Props) {
  const [selectedTime, setSelectedTime] = useState('');
  const [customTime, setCustomTime]     = useState('');
  const [reason, setReason]             = useState('');
  const [isLoading, setIsLoading]       = useState(false);

  const handleSubmit = async () => {
    const arrivalTime = selectedTime === 'Custom' ? customTime : selectedTime;
    if (!arrivalTime) { showToast('Select an arrival time', 'short'); return; }
    haptic.medium();
    setIsLoading(true);
    try {
      await api.post('/teacher/attendance/correct', {
        originalAttendanceId: student.originalAttendanceId,
        neuraId:              student.neuraId,
        correctedStatus:      'LATE',
        reason:               reason || undefined,
        actualArrivalTime:    arrivalTime,
        correctedAt:          new Date().toISOString(),
      });
      haptic.success();
      showToast('Late arrival recorded · Parent notified ✓', 'long');
      onSubmitted();
      onClose();
    } catch {
      haptic.error();
      showToast('Correction failed — try again', 'short');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SheetContainer visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text variant="h3">Late Arrival Correction</Text>
        <Text variant="small" color={TextColor.secondary} style={{marginTop: 2}}>
          {student.name} was marked Absent. Record their actual arrival.
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="label" color={TextColor.muted}>ACTUAL ARRIVAL TIME</Text>
        <View style={styles.row}>
          {TIME_PRESETS.map(p => (
            <Chip key={p} label={p} active={selectedTime === p} onPress={() => setSelectedTime(p)} />
          ))}
        </View>
        {selectedTime === 'Custom' && (
          <TextInput
            value={customTime}
            onChangeText={setCustomTime}
            placeholder="HH:MM"
            placeholderTextColor={TextColor.muted}
            keyboardType="numeric"
            maxLength={5}
            style={styles.timeInput}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text variant="label" color={TextColor.muted}>REASON</Text>
        <View style={styles.row}>
          {REASON_OPTIONS.map(r => (
            <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Button label={isLoading ? 'Recording…' : 'Record Late Arrival'} onPress={handleSubmit} loading={isLoading} style={styles.btn} />
        <Button label="Cancel" variant="ghost" onPress={onClose} style={styles.btn} />
        <Text variant="caption" color={TextColor.muted} style={styles.note}>
          Original 'Absent' record preserved. Both entries visible in audit log.
        </Text>
      </View>
    </SheetContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Space.lg, paddingBottom: Space.md,
    borderBottomWidth: 1, borderBottomColor: Border.subtle,
  },
  section:   { paddingHorizontal: Space.lg, paddingTop: Space.md, gap: Space.sm },
  row:       { flexDirection: 'row', gap: Space.sm, flexWrap: 'wrap' },
  timeInput: {
    height: 44, borderWidth: 1, borderColor: Border.default, borderRadius: RadiusToken.md,
    paddingHorizontal: Space.md, color: TextColor.primary, fontSize: 16, marginTop: Space.xs,
    backgroundColor: Surface.input,
  },
  actions: { paddingHorizontal: Space.lg, paddingTop: Space.lg, gap: Space.sm },
  btn:     { width: '100%' },
  note:    { textAlign: 'center', fontStyle: 'italic', paddingVertical: Space.sm },
});
