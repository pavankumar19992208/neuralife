/**
 * DEV-ONLY floating time override panel.
 * Rendered only when __DEV__ === true — tree-shaken from production builds.
 */
import React, {useState} from 'react';
import {
  View, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput,
} from 'react-native';
import {Text} from '@components/ui/Text';
import {Colors, Spacing, Radius} from '@constants/index';
import {useDevStore} from '@store/devStore';
import {useQueryClient} from '@tanstack/react-query';
import {haptic} from '@lib/haptics';
import {api} from '@lib/api';
import {showToast} from '@lib/toast';

// ─── Presets ──────────────────────────────────────────────────────────────────

interface DatePreset { label: string; date: string; day: string }
interface TimePreset  { label: string; contextHint: string; hour: number; minute: number }

const DATES: DatePreset[] = [
  {label: 'Mon', day: 'Jun 1',  date: '2026-06-01'},
  {label: 'Tue', day: 'Jun 2',  date: '2026-06-02'},
  {label: 'Wed', day: 'Jun 3',  date: '2026-06-03'},
  {label: 'Thu', day: 'Jun 4',  date: '2026-06-04'},
  {label: 'Fri', day: 'Jun 5',  date: '2026-06-05'},
];

const TIMES: TimePreset[] = [
  {label: '08:20', contextHint: 'Before school',     hour: 8,  minute: 20},
  {label: '08:40', contextHint: 'Assembly',           hour: 8,  minute: 40},
  {label: '08:55', contextHint: 'Period 1 NOW',       hour: 8,  minute: 55},
  {label: '09:38', contextHint: 'Period 2 NOW',       hour: 9,  minute: 38},
  {label: '10:22', contextHint: 'Short Break',        hour: 10, minute: 22},
  {label: '10:45', contextHint: 'Period 3 NOW',       hour: 10, minute: 45},
  {label: '11:20', contextHint: 'Period 4 NOW',       hour: 11, minute: 20},
  {label: '12:10', contextHint: 'Lunch',              hour: 12, minute: 10},
  {label: '12:45', contextHint: 'Period 5 NOW',       hour: 12, minute: 45},
  {label: '13:20', contextHint: 'Period 6 NOW',       hour: 13, minute: 20},
  {label: '14:10', contextHint: 'Period 7 NOW',       hour: 14, minute: 10},
  {label: '15:00', contextHint: 'After school',       hour: 15, minute: 0},
];

// ─── Spinner sub-component (+ / value / −) ────────────────────────────────────

interface SpinnerProps {
  value: number;
  min: number;
  max: number;
  pad: number;        // zero-pad to N digits
  onChange: (v: number) => void;
  onRawChange?: (s: string) => void;
  rawValue?: string;
}

function Spinner({value, min, max, pad, onChange}: SpinnerProps) {
  const inc = () => { haptic.light(); onChange(value >= max ? min : value + 1); };
  const dec = () => { haptic.light(); onChange(value <= min ? max : value - 1); };

  return (
    <View style={sp.wrap}>
      <TouchableOpacity onPress={inc} style={sp.btn} activeOpacity={0.7}>
        <Text variant="h2" color={Colors.textPrimary}>▲</Text>
      </TouchableOpacity>
      <TextInput
        style={sp.input}
        value={String(value).padStart(pad, '0')}
        keyboardType="number-pad"
        maxLength={2}
        onChangeText={t => {
          const n = parseInt(t, 10);
          if (!isNaN(n) && n >= min && n <= max) onChange(n);
        }}
        selectTextOnFocus
      />
      <TouchableOpacity onPress={dec} style={sp.btn} activeOpacity={0.7}>
        <Text variant="h2" color={Colors.textPrimary}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

const sp = StyleSheet.create({
  wrap:  {alignItems: 'center', gap: 4},
  btn:   {padding: 6, minWidth: 44, minHeight: 36, alignItems: 'center', justifyContent: 'center'},
  input: {
    fontSize: 32, fontWeight: '700', fontFamily: 'monospace',
    color: Colors.textPrimary, textAlign: 'center',
    backgroundColor: '#ffffff', borderRadius: Radius.md,
    borderWidth: 1, borderColor: '#e2e8f0',
    width: 72, paddingVertical: 8,
  },
});

// ─── Main component ───────────────────────────────────────────────────────────

export function DevTimePicker() {
  const [open, setOpen] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const {mockDate, mockHour, mockMinute, setMockDateTime, clearMock} = useDevStore();
  const qc = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(DATES[0].date);
  const [customHour,   setCustomHour]   = useState(9);
  const [customMinute, setCustomMinute] = useState(0);

  const sendTestPush = async () => {
    haptic.medium();
    setTestingPush(true);
    try {
      const res = await api.post<{sent: number; total: number; reason?: string}>('/teacher/notify/test', {});
      if (res.sent > 0) {
        showToast(`✅ Push sent to ${res.sent} device(s)`, 'long');
      } else if (res.reason === 'no_tokens_registered') {
        showToast('⚠️ No FCM token registered. Reopen app to register.', 'long');
      } else {
        showToast('⚠️ FCM sent 0 — check ENABLE_FCM_PUSH in .env', 'long');
      }
    } catch {
      showToast('❌ Test push failed — check API logs', 'long');
    } finally {
      setTestingPush(false);
    }
  };

  const isActive = mockDate !== null;

  const applyCustom = () => {
    haptic.medium();
    setMockDateTime(selectedDate, customHour, customMinute);
    qc.invalidateQueries({queryKey: ['teacher', 'home']});
    setOpen(false);
  };

  const applyPreset = (t: TimePreset) => {
    haptic.medium();
    setCustomHour(t.hour);
    setCustomMinute(t.minute);
    setMockDateTime(selectedDate, t.hour, t.minute);
    qc.invalidateQueries({queryKey: ['teacher', 'home']});
    setOpen(false);
  };

  const reset = () => {
    haptic.light();
    clearMock();
    qc.invalidateQueries({queryKey: ['teacher', 'home']});
    setOpen(false);
  };

  // Fab label — shows active mock time
  const activeLabel = isActive && mockHour !== null && mockMinute !== null
    ? `${String(mockHour).padStart(2,'0')}:${String(mockMinute).padStart(2,'0')}`
    : null;

  return (
    <>
      {/* ── Floating trigger ─────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => { haptic.light(); setOpen(true); }}
        style={[styles.fab, isActive && styles.fabActive]}
        activeOpacity={0.8}>
        <Text style={styles.fabIcon}>⏰</Text>
        {activeLabel ? (
          <Text style={styles.fabTime}>{activeLabel}</Text>
        ) : (
          isActive && <View style={styles.activeDot} />
        )}
      </TouchableOpacity>

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.backdropTap} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Text variant="h3">⚙️  Dev Time Override</Text>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text variant="caption" color={Colors.warning}>● ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text variant="caption" color={Colors.textMuted}>
                Pick date + set exact time to test every context state.
              </Text>
              {isActive && mockHour !== null && mockMinute !== null && (
                <Text variant="mono" color={Colors.accent} style={styles.currentMock}>
                  {DATES.find(d => d.date === mockDate)?.label ?? mockDate}
                  {'  '}
                  {String(mockHour).padStart(2,'0')}:{String(mockMinute).padStart(2,'0')}
                </Text>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

              {/* ── Date chips ─────────────────────────────────────────── */}
              <Text variant="label" color={Colors.textMuted} style={styles.sectionLabel}>DATE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}>
                {DATES.map(d => {
                  const sel = selectedDate === d.date;
                  return (
                    <TouchableOpacity
                      key={d.date}
                      onPress={() => { haptic.light(); setSelectedDate(d.date); }}
                      style={[styles.chip, sel && styles.chipSelected]}>
                      <Text variant="label" color={sel ? '#fff' : Colors.textPrimary}>{d.label}</Text>
                      <Text variant="caption" color={sel ? '#ffffffbb' : Colors.textMuted}>{d.day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ── Custom time picker ─────────────────────────────────── */}
              <Text variant="label" color={Colors.textMuted} style={styles.sectionLabel}>
                CUSTOM TIME
              </Text>
              <View style={styles.spinnerRow}>
                <Spinner value={customHour}   min={0} max={23} pad={2} onChange={setCustomHour} />
                <Text variant="h1" color={Colors.textMuted} style={styles.colon}>:</Text>
                <Spinner value={customMinute} min={0} max={59} pad={2} onChange={setCustomMinute} />
                <TouchableOpacity onPress={applyCustom} style={styles.applyBtn} activeOpacity={0.8}>
                  <Text variant="label" color="#fff" style={styles.applyText}>Apply</Text>
                </TouchableOpacity>
              </View>

              {/* ── Quick presets ───────────────────────────────────────── */}
              <Text variant="label" color={Colors.textMuted} style={styles.sectionLabel}>
                QUICK PRESETS
              </Text>
              {TIMES.map(t => (
                <TouchableOpacity
                  key={t.label}
                  onPress={() => applyPreset(t)}
                  style={[
                    styles.timeRow,
                    isActive && mockHour === t.hour && mockMinute === t.minute && styles.timeRowActive,
                  ]}
                  activeOpacity={0.7}>
                  <Text variant="mono" style={styles.timeLabel}
                    color={isActive && mockHour === t.hour && mockMinute === t.minute
                      ? Colors.accent : Colors.textPrimary}>
                    {t.label}
                  </Text>
                  <Text variant="bodySmall" color={Colors.textSecondary} style={styles.timeHint}>
                    {t.contextHint}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}

              {/* ── Test push notification ──────────────────────────────── */}
              <View style={styles.divider} />
              <Text variant="label" color={Colors.textMuted} style={styles.sectionLabel}>
                PUSH NOTIFICATION TEST
              </Text>
              <TouchableOpacity
                onPress={sendTestPush}
                disabled={testingPush}
                style={styles.testPushBtn}
                activeOpacity={0.8}>
                <Text style={styles.testPushIcon}>{testingPush ? '⏳' : '🔔'}</Text>
                <View style={{flex: 1}}>
                  <Text variant="label" color={Colors.textPrimary}>
                    {testingPush ? 'Sending…' : 'Send Test Notification'}
                  </Text>
                  <Text variant="caption" color={Colors.textMuted}>
                    Fires real FCM to this device now
                  </Text>
                </View>
              </TouchableOpacity>

              {/* ── Reset ───────────────────────────────────────────────── */}
              <View style={styles.divider} />
              <TouchableOpacity onPress={reset} style={styles.resetBtn} activeOpacity={0.7}>
                <Text variant="label" color={Colors.danger}>↺  Reset to real time</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 72,
    right: Spacing.lg,
    minWidth: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    elevation: 8,
    paddingHorizontal: Spacing.sm,
  },
  fabActive:  {backgroundColor: Colors.warning + '33', borderColor: Colors.warning},
  fabIcon:    {fontSize: 18},
  fabTime:    {fontSize: 10, fontFamily: 'monospace', color: Colors.warning, fontWeight: '700'},
  activeDot:  {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  backdrop:   {flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end'},
  backdropTap:{flex: 1},
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '92%',
    paddingBottom: Spacing.xxxl,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    gap: Spacing.xs,
  },
  headerRow:   {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  activeBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    backgroundColor: Colors.warning + '22',
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.warning + '66',
  },
  currentMock: {fontSize: 20, marginTop: Spacing.xs},
  body:        {paddingBottom: Spacing.huge},
  sectionLabel:{
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    letterSpacing: 1.5,
    fontSize: 10,
  },
  chipRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1,
    borderColor: '#e2e8f0', backgroundColor: '#ffffff',
    minWidth: 60,
  },
  chipSelected:  {backgroundColor: Colors.accent, borderColor: Colors.accent},
  // Custom time picker
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    backgroundColor: '#ffffff',
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: Spacing.sm,
  },
  colon:      {fontWeight: '700', marginBottom: 4},
  applyBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  applyText: {fontSize: 14},
  // Preset rows
  timeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
    gap: Spacing.md,
  },
  timeRowActive: {backgroundColor: Colors.accent + '18'},
  timeLabel:     {width: 52, fontSize: 14, fontWeight: '700'},
  timeHint:      {flex: 1},
  chevron:       {color: Colors.textMuted, fontSize: 20},
  resetBtn: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  testPushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.accent + '18',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    gap: Spacing.md,
  },
  testPushIcon: {fontSize: 22},
});
