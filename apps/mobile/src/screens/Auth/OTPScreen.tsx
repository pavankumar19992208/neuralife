import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, withSpring,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackgroundView } from '@components/ui/BackgroundView';
import { Button } from '@components/ui/Button';
import { Text } from '@components/ui/Text';
import { api, ApiError } from '@lib/api';
import { useAuthStore, TEACHER_APP_ROLES } from '@store/authStore';
import { haptic } from '@lib/haptics';
import { Dark, Brand, Semantic, Space, RadiusToken, SpringConfig, Font } from '@constants/index';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OTP'>;
interface VerifyResponse { accessToken: string; refreshToken: string; role: string; expiresIn: number }

const OTP_LEN = 6;
const RESEND_SECONDS = 30;
const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

export function OTPScreen({ route, navigation }: Props) {
  const { mobile, devOtp } = route.params;
  const [digits, setDigits]   = useState<string[]>(Array(OTP_LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const inputs = useRef<Array<TextInput | null>>([]);

  const code   = useMemo(() => digits.join(''), [digits]);
  const masked = `+91 ${mobile.slice(-10, -5)} ${mobile.slice(-5)}`;

  useEffect(() => { if (devOtp && devOtp.length === OTP_LEN) setDigits(devOtp.split('')); }, [devOtp]);
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const bodyOpacity = useSharedValue(0);
  const bodyY = useSharedValue(20);
  useEffect(() => {
    bodyOpacity.value = withDelay(100, withTiming(1, { duration: 360 }));
    bodyY.value = withDelay(100, withSpring(0, SpringConfig.gentle));
  }, []);
  const bodyAnim = useAnimatedStyle(() => ({ opacity: bodyOpacity.value, transform: [{ translateY: bodyY.value }] }));

  const shake = useSharedValue(0);
  const shakeAnim = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const triggerShake = () => {
    shake.value = withSequence(
      withTiming(-8, { duration: 55 }), withTiming(8, { duration: 55 }),
      withTiming(-6, { duration: 50 }), withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 45 }),
    );
  };

  const submit = async (value: string) => {
    if (value.length !== OTP_LEN || loading) return;
    setLoading(true); setError(null); haptic.medium();
    try {
      const res = await api.post<VerifyResponse>('/auth/otp/verify', { mobile, otp: value });
      if (!(TEACHER_APP_ROLES as readonly string[]).includes(res.role)) {
        setError('This app is for teachers and principals only.'); haptic.error(); triggerShake(); return;
      }
      haptic.success();
      await useAuthStore.getState().setSession({ accessToken: res.accessToken, refreshToken: res.refreshToken, mobile });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Verification failed. Try again.');
      haptic.error(); triggerShake();
      setDigits(Array(OTP_LEN).fill('')); inputs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleChange = (index: number, text: string) => {
    const clean = text.replace(/\D/g, '');
    if (clean.length > 1) {
      const next = clean.slice(0, OTP_LEN).split('');
      const filled = Array(OTP_LEN).fill('').map((_, i) => next[i] ?? '');
      setDigits(filled);
      inputs.current[Math.min(clean.length, OTP_LEN) - 1]?.focus();
      if (filled.join('').length === OTP_LEN) submit(filled.join(''));
      return;
    }
    const next = [...digits]; next[index] = clean; setDigits(next);
    if (clean && index < OTP_LEN - 1) inputs.current[index + 1]?.focus();
    if (next.join('').length === OTP_LEN) submit(next.join(''));
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const handleResend = async () => {
    if (countdown > 0) return; setError(null); haptic.light();
    try { await api.post('/auth/otp/request', { mobile }); setCountdown(RESEND_SECONDS); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not resend OTP.'); }
  };

  return (
    <BackgroundView variant="light">
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={hitSlop} style={styles.back}>
            <Text variant="h2" color={Dark.text} style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <Animated.View style={[styles.body, bodyAnim]}>
            <View style={styles.heading}>
              <Text variant="h2" color={Dark.text}>Verify your number</Text>
              <Text variant="monoLg" color={Dark.gold} style={styles.mobile}>{masked}</Text>
              <Text variant="small" color={Dark.textSecondary}>Enter the 6-digit OTP</Text>
            </View>

            <Animated.View style={[styles.boxes, shakeAnim]}>
              {digits.map((d, i) => (
                <View key={i} style={[
                  styles.box,
                  focusedIdx === i && styles.boxFocused,
                  !!error && styles.boxError,
                ]}>
                  <TextInput
                    ref={el => { inputs.current[i] = el; }}
                    style={styles.boxInput}
                    value={d}
                    onChangeText={t => handleChange(i, t)}
                    onKeyPress={e => handleKeyPress(i, e.nativeEvent.key)}
                    onFocus={() => setFocusedIdx(i)}
                    keyboardType="number-pad"
                    maxLength={OTP_LEN}
                    selectTextOnFocus
                    autoFocus={i === 0}
                  />
                </View>
              ))}
            </Animated.View>

            {error ? <Text variant="caption" color={Semantic.danger} style={styles.error}>{error}</Text> : null}

            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text variant="small" color={Dark.textMuted}>Resend in {countdown}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend} hitSlop={hitSlop}>
                  <Text variant="smallMedium" color={Dark.accent}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            <Button label={loading ? 'Verifying…' : 'Verify'} variant="primary" size="lg" loading={loading} disabled={code.length !== OTP_LEN} onPress={() => submit(code)} style={styles.cta} />
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1, paddingHorizontal: Space.xl },
  back: { paddingTop: Space.md, paddingBottom: Space.lg, width: 44 },
  backArrow: { fontSize: 34, lineHeight: 36 },
  body: { flex: 1 },
  heading: { marginBottom: Space.xxxl },
  mobile: { marginVertical: Space.xs, letterSpacing: 1 },
  boxes: { flexDirection: 'row', gap: Space.sm, justifyContent: 'center', marginBottom: Space.xl },
  box: {
    width: 50, height: 62, borderRadius: RadiusToken.xl, borderWidth: 1.5,
    borderColor: Dark.border, backgroundColor: Dark.input,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  boxFocused: { borderColor: Brand.indigoSoft, backgroundColor: 'rgba(99,102,241,0.14)' },
  boxError: { borderColor: Semantic.dangerBorder },
  boxInput: { width: '100%', height: '100%', textAlign: 'center', fontFamily: Font.bold, fontSize: 22, color: Dark.text, paddingVertical: 0 },
  error: { textAlign: 'center', marginBottom: Space.lg },
  resendRow: { alignItems: 'center', marginBottom: Space.xl },
  cta: { width: '100%' },
});
