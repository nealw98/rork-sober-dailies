import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { logEvent } from '@/lib/analytics';

/**
 * Global audio player context + hook.
 *
 * Lives at the app root level (_layout.tsx) so audio persists across
 * all screen navigation. Any screen can read playback state (e.g.,
 * SpeakerCard showing "Now Playing") and the player detail screen
 * can control playback.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface AudioPlayerState {
  currentSpeakerId: string | null;
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  rate: number;
  loadError: string | null;
  didJustFinish: boolean;
}

interface AudioPlayerActions {
  load: (speakerId: string, uri: string, autoPlay?: boolean) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
  seekBy: (seconds: number) => Promise<void>;
  setRate: (newRate: number) => Promise<void>;
}

type AudioPlayerContextType = AudioPlayerState & AudioPlayerActions;

const defaultState: AudioPlayerContextType = {
  currentSpeakerId: null,
  isLoaded: false,
  isPlaying: false,
  isBuffering: false,
  positionMs: 0,
  durationMs: 0,
  rate: 1,
  loadError: null,
  didJustFinish: false,
  load: async () => {},
  play: async () => {},
  pause: async () => {},
  stop: async () => {},
  seekTo: async () => {},
  seekBy: async () => {},
  setRate: async () => {},
};

const AudioPlayerContext = createContext<AudioPlayerContextType>(defaultState);

// ─── Provider ────────────────────────────────────────────────────────────────

const LOAD_TIMEOUT_MS = 15000;

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentUriRef = useRef<string | null>(null);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [rate, setRateState] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [didJustFinish, setDidJustFinish] = useState(false);

  // Configure audio mode — called on mount and on every AppState resume
  // to prevent iOS from dropping the audio session after interruptions
  const applyAudioMode = useCallback(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch((err) => {
      console.warn('[AudioPlayer] Failed to set audio mode:', err);
    });
  }, []);

  useEffect(() => {
    applyAudioMode();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') applyAudioMode();
    });
    return () => sub.remove();
  }, [applyAudioMode]);

  // ── Listen-time analytics ────────────────────────────────────────────────
  // Accumulates actual PLAYING time (pauses/buffering excluded) per talk and
  // fires one `speaker_listened` {speaker, duration_seconds} when the listen
  // ends: talk finishes, a different talk loads, stop, or unmount.
  const listenSpeakerRef = useRef<string | null>(null);
  const listenAccumMsRef = useRef(0);
  const playStartRef = useRef<number | null>(null);
  const lastPositionMsRef = useRef(0);
  const lastDurationMsRef = useRef(0);

  const pauseListenClock = useCallback(() => {
    if (playStartRef.current != null) {
      listenAccumMsRef.current += Date.now() - playStartRef.current;
      playStartRef.current = null;
    }
  }, []);

  const flushListenTime = useCallback(() => {
    pauseListenClock();
    const seconds = Math.round(listenAccumMsRef.current / 1000);
    if (listenSpeakerRef.current && seconds >= 5) {
      // duration_seconds = actual time spent listening (wall clock while playing;
      // immune to skip buttons and playback speed). position/percent = how far
      // through the talk they got, for completion-rate analysis.
      const dur = lastDurationMsRef.current;
      logEvent('speaker_listened', {
        speaker: listenSpeakerRef.current,
        duration_seconds: seconds,
        position_seconds: Math.round(lastPositionMsRef.current / 1000),
        talk_seconds: dur > 0 ? Math.round(dur / 1000) : undefined,
        percent_complete: dur > 0 ? Math.min(100, Math.round((lastPositionMsRef.current / dur) * 100)) : undefined,
      });
    }
    listenAccumMsRef.current = 0;
    lastPositionMsRef.current = 0;
  }, [pauseListenClock]);

  // Playback status callback
  const onStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsLoaded(false);
      if ('error' in status && status.error) {
        console.error('[AudioPlayer] Playback error:', status.error);
        setLoadError(status.error);
      }
      return;
    }
    setIsLoaded(true);
    setIsPlaying(status.isPlaying);
    setIsBuffering(status.isBuffering);
    setPositionMs(status.positionMillis);
    setDurationMs(status.durationMillis ?? 0);
    setLoadError(null);
    setDidJustFinish(status.didJustFinish ?? false);
    lastPositionMsRef.current = status.positionMillis;
    if (status.durationMillis) lastDurationMsRef.current = status.durationMillis;

    // Listen clock: run only while actually playing; flush when the talk ends.
    if (status.didJustFinish) {
      flushListenTime();
    } else if (status.isPlaying && playStartRef.current == null) {
      playStartRef.current = Date.now();
    } else if (!status.isPlaying) {
      pauseListenClock();
    }
  }, [flushListenTime, pauseListenClock]);

  // Load audio for a speaker
  const load = useCallback(
    async (speakerId: string, uri: string, autoPlay = false) => {
      try {
        // If the same URI is already loaded, just toggle play
        if (currentUriRef.current === uri && soundRef.current) {
          setCurrentSpeakerId(speakerId);
          if (autoPlay) {
            await soundRef.current.playAsync();
          }
          return;
        }

        setLoadError(null);
        setIsBuffering(true);
        setIsLoaded(false);
        setPositionMs(0);
        setDurationMs(0);
        setCurrentSpeakerId(speakerId);
        flushListenTime(); // close out the previous talk's listen time
        listenSpeakerRef.current = speakerId;
        logEvent('speaker_played', { speaker: speakerId });

        // Unload previous sound
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
          currentUriRef.current = null;
        }

        // Race load against timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Audio load timed out')), LOAD_TIMEOUT_MS)
        );

        const loadPromise = Audio.Sound.createAsync(
          { uri },
          { shouldPlay: autoPlay, rate, shouldCorrectPitch: true },
          onStatusUpdate
        );

        const { sound } = await Promise.race([loadPromise, timeoutPromise]);
        soundRef.current = sound;
        currentUriRef.current = uri;

        console.log('[AudioPlayer] Loaded:', uri.substring(uri.length - 30));
      } catch (err: any) {
        console.error('[AudioPlayer] Load failed:', err?.message || err);
        setLoadError(
          err?.message?.includes('timed out')
            ? 'Audio file not found'
            : 'Failed to load audio'
        );
        setIsBuffering(false);
      }
    },
    [rate, onStatusUpdate, flushListenTime]
  );

  const play = useCallback(async () => {
    try {
      await soundRef.current?.playAsync();
    } catch (err) {
      console.error('[AudioPlayer] Play failed:', err);
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      await soundRef.current?.pauseAsync();
    } catch (err) {
      console.error('[AudioPlayer] Pause failed:', err);
    }
  }, []);

  // Stop = full unload, reset everything
  const stop = useCallback(async () => {
    try {
      flushListenTime();
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        currentUriRef.current = null;
      }
      setCurrentSpeakerId(null);
      setIsLoaded(false);
      setIsPlaying(false);
      setIsBuffering(false);
      setPositionMs(0);
      setDurationMs(0);
      setDidJustFinish(false);
    } catch (err) {
      console.error('[AudioPlayer] Stop failed:', err);
    }
  }, [flushListenTime]);

  const seekTo = useCallback(async (ms: number) => {
    try {
      await soundRef.current?.setPositionAsync(ms);
    } catch (err) {
      console.error('[AudioPlayer] Seek failed:', err);
    }
  }, []);

  const seekBy = useCallback(
    async (seconds: number) => {
      const target = Math.max(0, Math.min(positionMs + seconds * 1000, durationMs));
      try {
        await soundRef.current?.setPositionAsync(target);
      } catch (err) {
        console.error('[AudioPlayer] SeekBy failed:', err);
      }
    },
    [positionMs, durationMs]
  );

  const setRate = useCallback(async (newRate: number) => {
    setRateState(newRate);
    try {
      await soundRef.current?.setRateAsync(newRate, true);
    } catch (err) {
      console.error('[AudioPlayer] SetRate failed:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      flushListenTime();
      soundRef.current?.unloadAsync();
    };
  }, [flushListenTime]);

  const value: AudioPlayerContextType = {
    currentSpeakerId,
    isLoaded,
    isPlaying,
    isBuffering,
    positionMs,
    durationMs,
    rate,
    loadError,
    didJustFinish,
    load,
    play,
    pause,
    stop,
    seekTo,
    seekBy,
    setRate,
  };

  return React.createElement(AudioPlayerContext.Provider, { value }, children);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGlobalAudioPlayer() {
  return useContext(AudioPlayerContext);
}

export type GlobalAudioPlayer = ReturnType<typeof useGlobalAudioPlayer>;
