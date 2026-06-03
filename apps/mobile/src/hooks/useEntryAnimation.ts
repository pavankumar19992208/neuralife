import {useEffect} from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface EntryAnimationOptions {
  delay?: number;
  duration?: number;
}

export function useEntryAnimation(options: EntryAnimationOptions = {}) {
  const {delay = 0, duration = 300} = options;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, {duration, easing: Easing.out(Easing.quad)}));
    translateY.value = withDelay(delay, withSpring(0, {damping: 20, stiffness: 300}));
    scale.value = withDelay(delay, withSpring(1, {damping: 20, stiffness: 300}));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {translateY: translateY.value},
      {scale: scale.value},
    ],
  }));

  return {animatedStyle};
}

// Card stagger: use delay = index * 50
export function useStaggerAnimation(index: number) {
  return useEntryAnimation({delay: index * 50});
}

// Title rises from bottom
export function useTitleAnimation(delay = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, {duration: 280}));
    translateY.value = withDelay(delay, withSpring(0, {damping: 22, stiffness: 350}));
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{translateY: translateY.value}],
  }));
}
