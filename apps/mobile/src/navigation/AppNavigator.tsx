import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuthStore} from '@store/authStore';
import {SplashScreen} from '@screens/Auth/SplashScreen';
import {navigationRef, consumePendingDeepLink} from '@lib/deepLink';
import {getDeviceId} from '@lib/device';
import {
  setupNotificationChannels,
  setupFCMForegroundHandler,
  setupFCMTokenRefresh,
  registerFCMToken,
} from '@lib/notifications';
import type {RootStackParamList} from './types';
import {LoginScreen} from '@screens/Auth/LoginScreen';
import {OTPScreen} from '@screens/Auth/OTPScreen';
import {TeacherNavigator} from './TeacherNavigator';
import {ProfileScreen} from '@screens/Teacher/ProfileScreen';
import {AttendanceScreen} from '@screens/Teacher/AttendanceScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading       = useAuthStore(s => s.isLoading);
  const loadFromStorage = useAuthStore(s => s.loadFromStorage);
  const schoolId        = useAuthStore(s => s.schoolId);

  // Minimum splash duration so the animated splash always plays (loadFromStorage
  // can resolve in <100ms, which would otherwise skip the splash entirely).
  const [minSplashDone, setMinSplashDone] = useState(false);

  useEffect(() => {
    loadFromStorage();
    // 7 s — long enough for the stage animation (all 4 cards connect at ~6.5 s)
    // but short enough that the user isn't forced to wait the full 10.5 s loop.
    // The Pressable on SplashScreen lets an impatient user skip at any time.
    const t = setTimeout(() => setMinSplashDone(true), 7000);
    return () => clearTimeout(t);
  }, [loadFromStorage]);

  useEffect(() => {
    // Notification channels are idempotent — safe to call every launch
    setupNotificationChannels().catch(() => {});

    const unsubForeground = setupFCMForegroundHandler();

    if (isAuthenticated && schoolId) {
      // Pre-load device ID so getDeviceIdSync() works during attendance signature
      getDeviceId().then(() => {
        registerFCMToken(schoolId);
      }).catch(() => {});
      const unsubRefresh = setupFCMTokenRefresh(schoolId);
      return () => {
        unsubForeground();
        unsubRefresh();
      };
    }

    return () => { unsubForeground(); };
  }, [isAuthenticated, schoolId]);

  if (isLoading || !minSplashDone) {
    return <SplashScreen onComplete={() => setMinSplashDone(true)} />;
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={consumePendingDeepLink}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="TeacherApp" component={TeacherNavigator} />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{presentation: 'card', animation: 'slide_from_right'}}
            />
            <Stack.Screen
              name="AttendanceMark"
              component={AttendanceScreen}
              options={{
                animation: 'slide_from_right',
                gestureEnabled: true,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTP" component={OTPScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
