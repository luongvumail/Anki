import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export function useAudio() {
  const soundRef = useRef<Audio.Sound | null>(null);

  const playAudio = async (url: string | null | undefined) => {
    if (!url) return;

    try {
      // Unload previous sound if it exists
      if (soundRef.current) {
        const soundToUnload = soundRef.current;
        soundRef.current = null; // Clear reference immediately
        await soundToUnload.unloadAsync().catch(() => {});
      }

      // Configure audio session for iOS and Android
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });

      soundRef.current = newSound;
    } catch (error) {
      console.error('Failed to load or play audio:', error);
    }
  };

  // Clean up sound resource when hook unmounts
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current
          .unloadAsync()
          .catch((err) => console.log('Error unloading sound on unmount:', err));
      }
    };
  }, []);

  return { playAudio };
}
