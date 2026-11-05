import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { logEvent } from '@/lib/analytics';
import { maybeAskForReview } from '@/lib/reviewPrompt';
import { getSpeakerProgress, saveSpeakerProgress } from '@/lib/speakerProgress';

/**
 * Global audio player context + hook.
 *
 * Lives at the app root level (_layout.tsx) so audio persists across
 * all screen navigation. Any screen can read playback state (e.g.,
 * SpeakerCard showing "Now Playing") and the player detail screen
 * can control playback.
 *
 * Built on expo-audio (expo-av was retired in SDK 55). expo-audio speaks
 * seconds; this context's public API stays millisecond-based so consumers
 * are untouched — the conversion lives here and nowhere else. Going
 * through expo-audio also gains lock-screen / Now Playing controls,
 * which expo-av never supported.
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
  load: (speakerId: string, uri: string, autoPlay?: boolean, meta?: { name?: string; title?: string }) => Promise<void>;
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
  const playerRef = useRef<AudioPlayer | null>(null);
  const statusSubRef = useRef<{ remove: () => void } | null>(null);
  const currentUriRef = useRef<string | null>(null);
  const loadTokenRef = useRef(0);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [rate, setRateState] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [didJustFinish, setDidJustFinish] = useState(false);
  const progressSaveAtRef = useRef(0);
  const finishHandledRef = useRef(false);

  // Configure audio mode — called on mount and on every AppState resume
  // to prevent iOS from dropping the audio session after interruptions.
  // doNotMix (exclusive focus) is required for lock-screen controls, and on
  // Android that presence keeps background playback alive past the OS's
  // ~3-minute cap on uncontrolled background audio.
  const applyAudioMode = useCallback(() => {
    setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
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
  const listenNameRef = useRef<string | null>(null);
  const listenTitleRef = useRef<string | null>(null);
  const listenAccumMsRef = useRef(0);
  const playStartRef = useRef<number | null>(null);
  const lastPositionMsRef = useRef(0);
  const lastDurationMsRef = useRef(0);

  const persistProgress = useCallback(async (didFinish = false) => {
    const speakerId = listenSpeakerRef.current;
    if (!speakerId) return;
    await saveSpeakerProgress(speakerId, {
      positionMs: didFinish ? lastDurationMsRef.current : lastPositionMsRef.current,
      durationMs: lastDurationMsRef.current,
      rate,
      didFinish,
    });
  }, [rate]);

  // Save immediately when the app leaves the foreground. The periodic save is
  // useful during playback, but this closes the small gap between ticks when a
  // listener backgrounds or closes the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') void persistProgress(false);
    });
    return () => sub.remove();
  }, [persistProgress]);

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
      const pct = dur > 0 ? Math.min(100, Math.round((lastPositionMsRef.current / dur) * 100)) : 0;
      logEvent('speaker_listened', {
        speaker: listenSpeakerRef.current,
        speaker_name: listenNameRef.current ?? undefined,
        title: listenTitleRef.current ?? undefined,
        duration_seconds: seconds,
        position_seconds: Math.round(lastPositionMsRef.current / 1000),
        talk_seconds: dur > 0 ? Math.round(dur / 1000) : undefined,
        percent_complete: dur > 0 ? pct : undefined,
      });
      // Review trigger: only on a meaningful listen (>= 2 min or half the talk),
      // so tapping in and bailing doesn't count. Gated inside maybeAskForReview.
      if (seconds >= 120 || pct >= 50) {
        maybeAskForReview('speaker').catch(() => {});
      }
    }
    listenAccumMsRef.current = 0;
    lastPositionMsRef.current = 0;
  }, [pauseListenClock]);

  // Tear down the live player: unhook status updates, drop lock-screen
  // controls, release the native object. createAudioPlayer players are not
  // auto-released, so every exit path must come through here.
  const releasePlayer = useCallback(() => {
    statusSubRef.current?.remove();
    statusSubRef.current = null;
    const p = playerRef.current;
    playerRef.current = null;
    currentUriRef.current = null;
    if (p) {
      try { p.setActiveForLockScreen(false); } catch {}
      try { p.release(); } catch {}
    }
  }, []);

  // Playback status callback
  const onStatusUpdate = useCallback((status: AudioStatus) => {
    if (!status.isLoaded) {
      setIsLoaded(false);
      if (status.error) {
        console.error('[AudioPlayer] Playback error:', status.error);
        setLoadError(status.error);
      }
      return;
    }
    const positionMillis = Math.round(status.currentTime * 1000);
    const durationMillis = Math.round((status.duration || 0) * 1000);
    setIsLoaded(true);
    setIsPlaying(status.playing);
    setIsBuffering(status.isBuffering);
    setPositionMs(positionMillis);
    setDurationMs(durationMillis);
    setLoadError(null);
    setDidJustFinish(status.didJustFinish ?? false);
    lastPositionMsRef.current = positionMillis;
    if (durationMillis) lastDurationMsRef.current = durationMillis;

    // Listen clock: run only while actually playing; flush when the talk ends.
    if (status.didJustFinish) {
      flushListenTime();
      if (!finishHandledRef.current) {
        finishHandledRef.current = true;
        void persistProgress(true).finally(() => {
          releasePlayer();
          setCurrentSpeakerId(null);
          setIsLoaded(false);
          setIsPlaying(false);
          setIsBuffering(false);
          setPositionMs(0);
          setDurationMs(0);
        });
      }
    } else if (status.playing && playStartRef.current == null) {
      playStartRef.current = Date.now();
    } else if (!status.playing) {
      pauseListenClock();
    }
    if (!status.didJustFinish && Date.now() - progressSaveAtRef.current >= 5000) {
      progressSaveAtRef.current = Date.now();
      void persistProgress(false);
    }
  }, [flushListenTime, pauseListenClock, persistProgress, releasePlayer]);

  // Load audio for a speaker
  const load = useCallback(
    async (speakerId: string, uri: string, autoPlay = false, meta?: { name?: string; title?: string }) => {
      try {
        // If the same URI is already loaded, just toggle play
        if (currentUriRef.current === uri && playerRef.current) {
          setCurrentSpeakerId(speakerId);
          if (autoPlay) {
            playerRef.current.play();
          }
          return;
        }

        setLoadError(null);
        setIsBuffering(true);
        setIsLoaded(false);
        setPositionMs(0);
        setDurationMs(0);
        setCurrentSpeakerId(speakerId);
        finishHandledRef.current = false;
        await persistProgress(false);
        flushListenTime(); // close out the previous talk's listen time
        listenSpeakerRef.current = speakerId;
        listenNameRef.current = meta?.name ?? null;
        listenTitleRef.current = meta?.title ?? null;
        logEvent('speaker_played', { speaker: speakerId, speaker_name: meta?.name, title: meta?.title });

        // Unload previous player
        releasePlayer();
        applyAudioMode();

        const saved = await getSpeakerProgress(speakerId);
        const savedPosition = saved && !saved.didFinish ? saved.positionMs : 0;
        const savedRate = saved?.rate ?? rate;
        setRateState(savedRate);

        const player = createAudioPlayer({ uri }, { updateInterval: 500 });
        playerRef.current = player;
        currentUriRef.current = uri;

        // Lock screen / Now Playing — must be set while interruptionMode is
        // doNotMix (applyAudioMode above) for the OS to attach controls.
        try {
          player.setActiveForLockScreen(
            true,
            {
              title: meta?.title ?? 'Speaker Tape',
              artist: meta?.name ?? 'Sober Dailies',
              albumTitle: 'Sober Dailies',
            },
            { showSeekBackward: true, showSeekForward: true },
          );
        } catch {}

        // expo-audio has no initialStatus: wait for the first loaded status,
        // then apply resume position + saved rate before (optionally) playing.
        const token = ++loadTokenRef.current;
        let initDone = false;
        const applyInit = async (st: AudioStatus) => {
          if (initDone || !st.isLoaded) return;
          initDone = true;
          if (loadTokenRef.current !== token || playerRef.current !== player) return;
          try {
            if (savedRate !== 1) player.setPlaybackRate(savedRate, 'high');
            if (savedPosition > 0) await player.seekTo(savedPosition / 1000);
            if (autoPlay) player.play();
          } catch (err) {
            console.warn('[AudioPlayer] Resume-state apply failed:', err);
          }
        };
        statusSubRef.current = player.addListener('playbackStatusUpdate', (st) => {
          void applyInit(st);
          onStatusUpdate(st);
        });

        // No load promise to race anymore — surface a timeout ourselves.
        setTimeout(() => {
          if (loadTokenRef.current === token && playerRef.current === player && !initDone) {
            console.error('[AudioPlayer] Load timed out');
            releasePlayer();
            setLoadError('Audio file not found');
            setIsBuffering(false);
          }
        }, LOAD_TIMEOUT_MS);

        console.log('[AudioPlayer] Loading:', uri.substring(uri.length - 30));
      } catch (err: any) {
        console.error('[AudioPlayer] Load failed:', err?.message || err);
        setLoadError('Failed to load audio');
        setIsBuffering(false);
      }
    },
    [rate, onStatusUpdate, flushListenTime, persistProgress, releasePlayer, applyAudioMode]
  );

  const play = useCallback(async () => {
    try {
      playerRef.current?.play();
    } catch (err) {
      console.error('[AudioPlayer] Play failed:', err);
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      playerRef.current?.pause();
      await persistProgress(false);
    } catch (err) {
      console.error('[AudioPlayer] Pause failed:', err);
    }
  }, [persistProgress]);

  // Stop = full release, reset everything
  const stop = useCallback(async () => {
    try {
      flushListenTime();
      await persistProgress(false);
      releasePlayer();
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
  }, [flushListenTime, persistProgress, releasePlayer]);

  const seekTo = useCallback(async (ms: number) => {
    try {
      await playerRef.current?.seekTo(ms / 1000);
    } catch (err) {
      console.error('[AudioPlayer] Seek failed:', err);
    }
  }, []);

  const seekBy = useCallback(
    async (seconds: number) => {
      const target = Math.max(0, Math.min(positionMs + seconds * 1000, durationMs));
      try {
        await playerRef.current?.seekTo(target / 1000);
      } catch (err) {
        console.error('[AudioPlayer] SeekBy failed:', err);
      }
    },
    [positionMs, durationMs]
  );

  const setRate = useCallback(async (newRate: number) => {
    setRateState(newRate);
    try {
      playerRef.current?.setPlaybackRate(newRate, 'high');
    } catch (err) {
      console.error('[AudioPlayer] SetRate failed:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      void persistProgress(false);
      flushListenTime();
      releasePlayer();
    };
  }, [flushListenTime, persistProgress, releasePlayer]);

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
