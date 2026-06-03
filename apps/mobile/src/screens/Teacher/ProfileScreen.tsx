import React, {useState} from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@components/ui/Text';
import {SyncPill} from '@components/ui/SyncPill';
import {BackgroundView} from '@components/ui/BackgroundView';
import {Colors, Spacing, Radius} from '@constants/index';
import {useAuthStore} from '@store/authStore';
import {useSchoolStore} from '@store/schoolStore';
import {haptic} from '@lib/haptics';

export function ProfileScreen() {
  const {teacherId, mobile, baseRole, classSection, logout} = useAuthStore();
  const {schoolName, accentColor} = useSchoolStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = mobile?.slice(-4) ?? '??';

  const handleLogout = () => {
    haptic.medium();
    Alert.alert(
      'Log out',
      'You will need to log in again.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
          },
        },
      ],
    );
  };

  return (
    <BackgroundView variant="light" style={styles.container}>
      <SafeAreaView style={{flex:1}} edges={['top']}>
      <SyncPill />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar + info */}
        <View style={styles.hero}>
          <View style={[styles.avatar, {backgroundColor: accentColor}]}>
            <Text variant="h2" color="#fff">{initials}</Text>
          </View>
          <Text variant="h3" style={styles.role}>{baseRole ?? 'TEACHER'}</Text>
          {classSection && (
            <View style={[styles.classChip, {borderColor: accentColor}]}>
              <Text variant="label" color={accentColor}>Class Teacher · {classSection}</Text>
            </View>
          )}
          <Text variant="bodySmall" color={Colors.textMuted}>{schoolName}</Text>
          {mobile && (
            <Text variant="mono" color={Colors.textMuted} style={styles.mobile}>+91 {mobile.replace('+91', '')}</Text>
          )}
        </View>

        {/* Placeholder sections */}
        <View style={styles.section}>
          <Text variant="label" color={Colors.textMuted} style={styles.sectionLabel}>COMING SOON</Text>
          {['Teaching History', 'Leave Balance', 'Salary Details', 'Settings'].map(item => (
            <View key={item} style={styles.row}>
              <Text variant="body" color={Colors.textSecondary}>{item}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          style={styles.logoutBtn}
          activeOpacity={0.8}>
          <Text variant="label" color={Colors.danger} style={styles.logoutText}>
            {loggingOut ? 'Logging out…' : '↩  Log out'}
          </Text>
        </TouchableOpacity>

        <Text variant="caption" color={Colors.textMuted} style={styles.version}>
          NeuraLife Teacher · v0.1.0 (dev)
        </Text>
      </ScrollView>
      </SafeAreaView>
    </BackgroundView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content:   {padding: Spacing.lg, paddingBottom: Spacing.massive},
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  role: {textTransform: 'uppercase', letterSpacing: 1},
  classChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1,
  },
  mobile: {marginTop: Spacing.xs},
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  sectionLabel: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.cardBorder,
  },
  chevron:    {color: Colors.textMuted, fontSize: 20},
  logoutBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.danger + '15',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.danger + '40',
    marginBottom: Spacing.lg,
  },
  logoutText: {fontSize: 15},
  version:    {textAlign: 'center'},
});
