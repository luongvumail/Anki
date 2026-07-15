import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
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

      const playableUri = await normalizeLocalAudioUri(url, fallbackText);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: playableUri },
        { shouldPlay: true },
      );

      soundRef.current = newSound;
    } catch (error) {
      console.warn('Failed to load or play audio:', error);

      // Clean up corrupt/unsupported local files so they will be re-downloaded next time
      try {
        const playableUri = await normalizeLocalAudioUri(url, fallbackText).catch(() => null);
        if (playableUri && playableUri.startsWith('file:')) {
          await FileSystem.deleteAsync(playableUri, { idempotent: true });
        }
      } catch (cleanupError) {
        console.warn('Failed to clean up corrupt audio file:', cleanupError);
      }

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

async function normalizeLocalAudioUri(uri: string, fallbackText?: string): Promise<string> {
  const browserHeaders = {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    },
  };

  if (uri.startsWith('file:')) {
    // Extract filename to resolve sandbox path dynamically
    const parts = uri.split('/');
    const filename = parts[parts.length - 1];
    const currentUri = `${FileSystem.documentDirectory}${filename}`;

    const fileInfo = await FileSystem.getInfoAsync(currentUri);
    if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
      return currentUri;
    }

    // Handle legacy extensionless local files
    const hasValidExtension = /\.(mp3|m4a|aac|wav|caf|aiff)$/i.test(filename);
    if (!hasValidExtension) {
      const mp3Uri = `${currentUri}.mp3`;
      const mp3FileInfo = await FileSystem.getInfoAsync(mp3Uri);
      if (mp3FileInfo.exists && mp3FileInfo.size && mp3FileInfo.size > 0) {
        return mp3Uri;
      }

      const legacyFileInfo = await FileSystem.getInfoAsync(currentUri);
      if (legacyFileInfo.exists && legacyFileInfo.size && legacyFileInfo.size > 0) {
        await FileSystem.copyAsync({ from: currentUri, to: mp3Uri });
        return mp3Uri;
      }
    }

    // If local file does not exist or is empty, and we have the fallback text, download it from Youdao
    if (fallbackText) {
      const downloadTarget = hasValidExtension ? currentUri : `${currentUri}.mp3`;
      try {
        const remoteUrl = `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(fallbackText)}`;
        const downloadResult = await FileSystem.downloadAsync(
          remoteUrl,
          downloadTarget,
          browserHeaders,
        );
        if (downloadResult.status === 200) {
          const contentType = (
            downloadResult.headers['content-type'] ||
            downloadResult.headers['Content-Type'] ||
            ''
          ).toLowerCase();
          if (contentType.includes('text/html') || contentType.includes('application/json')) {
            await FileSystem.deleteAsync(downloadTarget, { idempotent: true });
            throw new Error('Downloaded fallback content is not an audio file: ' + contentType);
          }
          return downloadResult.uri;
        } else {
          await FileSystem.deleteAsync(downloadTarget, { idempotent: true });
          throw new Error('HTTP Status ' + downloadResult.status);
        }
      } catch (downloadError) {
        console.warn('Failed to download fallback remote audio:', downloadError);
      }
    }

    return currentUri;
  } else {
    // Remote URL
    const urlPath = uri.split('?')[0];
    const hasValidExtension = /\.(mp3|m4a|aac|wav|caf|aiff)$/i.test(urlPath);
    if (hasValidExtension) {
      return uri;
    }

    // If it is a remote URL without a valid extension, download and cache it locally with .mp3 extension.
    try {
      const filename = `audio_temp_${hashString(uri)}.mp3`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;

      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
        return localUri;
      }

      const downloadResult = await FileSystem.downloadAsync(uri, localUri, browserHeaders);
      if (downloadResult.status === 200) {
        const contentType = (
          downloadResult.headers['content-type'] ||
          downloadResult.headers['Content-Type'] ||
          ''
        ).toLowerCase();
        if (contentType.includes('text/html') || contentType.includes('application/json')) {
          await FileSystem.deleteAsync(localUri, { idempotent: true });
          throw new Error('Downloaded remote content is not an audio file: ' + contentType);
        }
        return downloadResult.uri;
      } else {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
        throw new Error('HTTP Status ' + downloadResult.status);
      }
    } catch (error) {
      console.warn('Failed to download/cache remote audio on-the-fly:', error);
      return uri;
    }
  }
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}
