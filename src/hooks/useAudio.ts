import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';

export function useAudio() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const playAudio = async (url: string | null | undefined) => {
    if (!url) return;

    try {
      // Unload previous sound if it exists
      if (sound) {
        await sound.unloadAsync();
      }

      // Configure audio session for iOS and Android
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );

      setSound(newSound);
    } catch (error) {
      console.error('Failed to load or play audio:', error);
    }
  };

  // Clean up sound resource when hook unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch((err) => console.log('Error unloading sound:', err));
      }
    };
  }, [sound]);

  return { playAudio };
}
