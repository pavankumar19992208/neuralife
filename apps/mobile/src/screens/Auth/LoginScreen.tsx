import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring, Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackgroundView } from '@components/ui/BackgroundView';
import { GoldWordmark } from '@components/ui/GoldWordmark';
import { Button } from '@components/ui/Button';
import { Text } from '@components/ui/Text';
import { useSchoolStore } from '@store/schoolStore';
import { api, ApiError } from '@lib/api';
import { showErrorToast } from '@lib/toast';
import { haptic } from '@lib/haptics';
import { Dark, Brand, Semantic, Space, RadiusToken, SpringConfig, Font } from '@constants/index';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
interface OtpRequestResponse { message: string; expiresIn: number; devOtp?: string }

const POWERS = [
  'Your classroom, finally understood.',
  'Less paperwork. More teaching.',
  'The notebook that thinks.',
  'Every absence, signed and certain.',
  'Insight before the exam, not after.',
];

function istDate(): string {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${mon[d.getUTCMonth()]}`;
}

export function LoginScreen({ navigation }: Props) {
  const { schoolName } = useSchoolStore();
  const [digits, setDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [powerIdx, setPowerIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const powerOpacity = useSharedValue(1);
  useEffect(() => {
    const id = setInterval(() => {
      powerOpacity.value = withTiming(0, { duration: 280, easing: Easing.in(Easing.ease) }, () => {
        powerOpacity.value = withTiming(1, { duration: 420 });
      });
      setTimeout(() => setPowerIdx(i => (i + 1) % POWERS.length), 280);
    }, 2800);
    return () => clearInterval(id);
  }, [powerOpacity]);

  const heroOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formY = useSharedValue(24);
  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 400 });
    formOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    formY.value       = withDelay(300, withSpring(0, SpringConfig.gentle));
  }, []);

  const heroAnim = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
  const formAnim = useAnimatedStyle(() => ({ opacity: formOpacity.value, transform: [{ translateY: formY.value }] }));
  const powerAnim = useAnimatedStyle(() => ({ opacity: powerOpacity.value }));

  const isValid = /^[6-9]\d{9}$/.test(digits);

  const handleSendOtp = async () => {
    if (!isValid || loading) return;
    setLoading(true); setError(null); haptic.medium();
    const mobile = `+91${digits}`;
    try {
      const res = await api.post<OtpRequestResponse>('/auth/otp/request', { mobile });
      haptic.success();
      navigation.navigate('OTP', { mobile, devOtp: res.devOtp });
    } catch (e) {
      const msg = e instanceof ApiError
        ? (e.code === 'NETWORK_ERROR' ? "Can't reach server — check your connection" : e.message)
        : 'Could not send OTP. Try again.';
      setError(msg); showErrorToast(e); haptic.error();
    } finally { setLoading(false); }
  };

  return (
    <BackgroundView variant="light">
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          <Animated.View style={[styles.hero, heroAnim]}>
            <View style={styles.brandRow}>
              <GoldWordmark text="NeuraLife" fontSize={20} />
              <Text variant="label" color={Dark.textMuted} style={styles.brandTeacher}>TEACHER</Text>
            </View>

            <View style={styles.greetWrap}>
              <Text variant="h1" color={Dark.text}>Good morning,</Text>
              <Text variant="small" color={Dark.textSecondary} style={styles.date}>{istDate()}</Text>
              <Animated.View style={powerAnim}>
                <Text variant="power" color={Dark.textSecondary} style={styles.power}>{POWERS[powerIdx]}</Text>
              </Animated.View>
            </View>
          </Animated.View>

          <View style={styles.divider} />

          <Animated.View style={[styles.form, formAnim]}>
            <Text variant="label" color={Dark.textMuted} style={styles.fieldLabel}>MOBILE NUMBER</Text>
            <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
              <Text style={styles.prefix} color={Dark.gold}>+91</Text>
              <View style={styles.prefixSep} />
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={digits}
                onChangeText={t => setDigits(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad"
                placeholder="98765 43210"
                placeholderTextColor={Dark.textMuted}
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>
            {error ? <Text variant="caption" color={Semantic.danger} style={styles.error}>{error}</Text> : null}
            <Button label={loading ? 'Sending…' : 'Send OTP'} variant="primary" size="lg" loading={loading} disabled={!isValid} onPress={handleSendOtp} style={styles.cta} />
            <Text variant="caption" color={Dark.textMuted} style={styles.terms}>
              By continuing you agree to NeuraLife's Terms of Use
            </Text>
          </Animated.View>

          <View style={styles.footer}>
            <Text variant="caption" color={Dark.textMuted}>{schoolName}</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, paddingHorizontal: Space.xl },
  hero: { flex: 1, justifyContent: 'center', paddingTop: Space.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, position: 'absolute', top: Space.md, left: 0 },
  brandTeacher: { letterSpacing: 3 },
  greetWrap: { marginTop: Space.huge },
  date: { marginTop: 4, letterSpacing: 0.3 },
  power: { marginTop: Space.xl, minHeight: 48 },
  divider: { height: 1, backgroundColor: Dark.borderSubtle, marginVertical: Space.lg },
  form: { paddingBottom: Space.lg },
  fieldLabel: { marginBottom: Space.sm, letterSpacing: 1.4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: RadiusToken.xl,
    backgroundColor: Dark.input, borderWidth: 1.5, borderColor: Dark.border,
    paddingHorizontal: Space.lg, marginBottom: Space.md,
  },
  inputWrapFocused: { borderColor: Brand.indigoSoft, backgroundColor: 'rgba(99,102,241,0.12)' },
  prefix: { fontFamily: Font.semibold, fontSize: 15, marginRight: Space.sm },
  prefixSep: { width: 1, height: 20, backgroundColor: Dark.borderSubtle, marginRight: Space.sm },
  input: { flex: 1, color: Dark.text, fontFamily: Font.semibold, fontSize: 16, letterSpacing: 1.5, paddingVertical: 0 },
  error: { marginBottom: Space.sm },
  cta: { marginTop: Space.sm, width: '100%' },
  terms: { textAlign: 'center', marginTop: Space.xxl },
  footer: { paddingBottom: Space.lg, alignItems: 'center' },
});
