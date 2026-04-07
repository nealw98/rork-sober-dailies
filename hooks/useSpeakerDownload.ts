import { useState, useEffect, useCallback, useRef } from 'react';
import * as FileSystem from 'expo-file-system';

const { documentDirectory } = FileSystem;
type DownloadResumable = FileSystem.DownloadResumable;
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DownloadStatus = 'not_downloaded' | 'downloading' | 'downloaded';

interface DownloadRecord {
  downloaded: boolean;
  localPath: string;
  downloadedAt: string;
}

type DownloadMap = Record<string, DownloadRecord>;

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'speaker_downloads';

function getLocalPath(speakerId: string): string {
  return `${documentDirectory}speaker_${speakerId}.m4a`;
}

// ─── Shared AsyncStorage helpers ─────────────────────────────────────────────

async function loadDownloadMap(): Promise<DownloadMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveDownloadMap(map: DownloadMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// ─── Hook: useSpeakerDownload (single speaker) ──────────────────────────────

export function useSpeakerDownload(speakerId: string, audioUrl: string) {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('not_downloaded');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const downloadResumableRef = useRef<DownloadResumable | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    checkDownloadState();
    return () => {
      mountedRef.current = false;
    };
  }, [speakerId]);

  const checkDownloadState = useCallback(async () => {
    try {
      const map = await loadDownloadMap();
      const record = map[speakerId];

      if (record?.downloaded && record.localPath) {
        const info = await FileSystem.getInfoAsync(record.localPath);
        if (info.exists) {
          if (mountedRef.current) {
            setDownloadStatus('downloaded');
            setLocalPath(record.localPath);
          }
          return;
        }
        // File gone — clean up stale record
        delete map[speakerId];
        await saveDownloadMap(map);
      }

      if (mountedRef.current) {
        setDownloadStatus('not_downloaded');
        setLocalPath(null);
      }
    } catch (err) {
      console.warn('[Download] Error checking state:', speakerId, err);
    }
  }, [speakerId]);

  const startDownload = useCallback(async () => {
    if (downloadStatus === 'downloading') return;

    const filePath = getLocalPath(speakerId);

    // Check if file already exists
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        const map = await loadDownloadMap();
        map[speakerId] = {
          downloaded: true,
          localPath: filePath,
          downloadedAt: new Date().toISOString(),
        };
        await saveDownloadMap(map);
        if (mountedRef.current) {
          setDownloadStatus('downloaded');
          setLocalPath(filePath);
        }
        return;
      }
    } catch {
      // Continue to download
    }

    if (mountedRef.current) {
      setDownloadStatus('downloading');
      setDownloadProgress(0);
    }

    const progressCallback = (data: FileSystem.DownloadProgressData) => {
      if (!mountedRef.current) return;
      if (data.totalBytesExpectedToWrite > 0) {
        const pct = Math.round(
          (data.totalBytesWritten / data.totalBytesExpectedToWrite) * 100
        );
        setDownloadProgress(pct);
      }
    };

    const resumable = FileSystem.createDownloadResumable(audioUrl, filePath, {}, progressCallback);
    downloadResumableRef.current = resumable;

    try {
      console.log('[Download] Starting:', speakerId);
      const result = await resumable.downloadAsync();

      if (!result) {
        if (mountedRef.current) {
          setDownloadStatus('not_downloaded');
          setDownloadProgress(0);
        }
        return;
      }

      const map = await loadDownloadMap();
      map[speakerId] = {
        downloaded: true,
        localPath: filePath,
        downloadedAt: new Date().toISOString(),
      };
      await saveDownloadMap(map);

      if (mountedRef.current) {
        setDownloadStatus('downloaded');
        setLocalPath(filePath);
        setDownloadProgress(100);
      }

      console.log('[Download] Complete:', speakerId);
    } catch (err) {
      console.error('[Download] Failed:', speakerId, err);
      try {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      } catch {
        // Ignore cleanup errors
      }
      if (mountedRef.current) {
        setDownloadStatus('not_downloaded');
        setDownloadProgress(0);
      }
    } finally {
      downloadResumableRef.current = null;
    }
  }, [speakerId, audioUrl, downloadStatus]);

  const cancelDownload = useCallback(async () => {
    if (downloadResumableRef.current) {
      try {
        await downloadResumableRef.current.pauseAsync();
      } catch {
        // Ignore
      }
      downloadResumableRef.current = null;
    }

    const filePath = getLocalPath(speakerId);
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch {
      // Ignore
    }

    if (mountedRef.current) {
      setDownloadStatus('not_downloaded');
      setDownloadProgress(0);
    }
  }, [speakerId]);

  const deleteDownload = useCallback(async () => {
    const filePath = getLocalPath(speakerId);

    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch {
      // Ignore
    }

    try {
      const map = await loadDownloadMap();
      delete map[speakerId];
      await saveDownloadMap(map);
    } catch {
      // Ignore
    }

    if (mountedRef.current) {
      setDownloadStatus('not_downloaded');
      setLocalPath(null);
      setDownloadProgress(0);
    }
  }, [speakerId]);

  return {
    downloadStatus,
    downloadProgress,
    startDownload,
    cancelDownload,
    deleteDownload,
    localPath,
    checkDownloadState,
  };
}

// ─── Hook: useDownloadedSpeakerIds (browse screen) ──────────────────────────

export function useDownloadedSpeakerIds() {
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const map = await loadDownloadMap();
      const ids = new Set<string>();

      for (const [id, record] of Object.entries(map)) {
        if (record.downloaded && record.localPath) {
          const info = await FileSystem.getInfoAsync(record.localPath);
          if (info.exists) {
            ids.add(id);
          }
        }
      }

      if (mountedRef.current) {
        setDownloadedIds(ids);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { downloadedIds, refresh };
}

// ─── Helper: resolve audio URI for playback ──────────────────────────────────

export async function resolveAudioUri(
  speakerId: string,
  remoteUrl: string
): Promise<string> {
  try {
    const map = await loadDownloadMap();
    const record = map[speakerId];
    if (record?.downloaded && record.localPath) {
      const info = await FileSystem.getInfoAsync(record.localPath);
      if (info.exists) {
        return record.localPath;
      }
      delete map[speakerId];
      await saveDownloadMap(map);
    }
  } catch {
    // Fall through to remote
  }
  return remoteUrl;
}
