import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';

export function useAudio() {
  const soundRef = useRef<Audio.Sound | null>(null);

  const playAudio = async (url: string | null | undefined, fallbackText?: string) => {
    if (!url) {
      speakFallback(fallbackText);
      return;
    }

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

      const playableUri = await normalizeLocalAudioUri(url);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: playableUri },
        { shouldPlay: true },
      );

      soundRef.current = newSound;
    } catch (error) {
      console.error('Failed to load or play audio:', error);
      speakFallback(fallbackText);
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

function speakFallback(text?: string) {
  if (!text) return;

  Speech.stop();
  Speech.speak(text, {
    language: 'zh-CN',
    rate: 0.75,
    useApplicationAudioSession: false,
  });
}

async function normalizeLocalAudioUri(uri: string): Promise<string> {
  if (!uri.startsWith('file:') || /\.(mp3|m4a|aac|wav|caf|aiff)$/i.test(uri.split('?')[0])) {
    return uri;
  }

  // Older builds cached Youdao's query URL as an extensionless local file.
  // AVFoundation then cannot determine that the bytes are MP3 audio.
  const legacyUri = uri.split('?')[0];
  const mp3Uri = `${legacyUri}.mp3`;

  const migratedFile = await FileSystem.getInfoAsync(mp3Uri);
  if (migratedFile.exists) return mp3Uri;

  const legacyFile = await FileSystem.getInfoAsync(legacyUri);
  if (!legacyFile.exists) return uri;

  await FileSystem.copyAsync({ from: legacyUri, to: mp3Uri });
  return mp3Uri;
}
