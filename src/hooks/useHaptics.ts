import * as Haptics from 'expo-haptics';

export function useHaptics() {
  const lightHaptic = async () => {
    try {
      // Haptics work on real iOS/Android devices
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fail silently in simulator or unsupported platforms
    }
  };

  const warningHaptic = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Fail silently
    }
  };

  const successHaptic = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Fail silently
    }
  };

  return {
    lightHaptic,
    warningHaptic,
    successHaptic,
  };
}
