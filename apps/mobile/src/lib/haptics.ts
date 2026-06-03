import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const opts = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

export const haptic = {
  light:   () => ReactNativeHapticFeedback.trigger('impactLight', opts),
  medium:  () => ReactNativeHapticFeedback.trigger('impactMedium', opts),
  heavy:   () => ReactNativeHapticFeedback.trigger('impactHeavy', opts),
  success: () => ReactNativeHapticFeedback.trigger('notificationSuccess', opts),
  error:   () => ReactNativeHapticFeedback.trigger('notificationError', opts),
  warning: () => ReactNativeHapticFeedback.trigger('notificationWarning', opts),
};
