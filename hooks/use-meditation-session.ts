import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState } from 'react-native';
import { Audio, type AVPlaybackSource } from 'expo-av';
import createContextHook from '@nkzw/create-context-hook';
import { useMeditationLog } from '@/hooks/use-meditation-log';
import { useDailies } from '@/hooks/use-dailies-store';
import { logEvent } from '@/lib/analytics';
import { maybeAskForReview } from '@/lib/reviewPrompt';

/**
 * Global meditation session — two decoupled layers (Calm-style):
 *
 *  1. AMBIENCE: the looping scene soundtrack. It's the "space" you're in, tied to
 *     the meditation SCREEN and the selected scene — NOT to the timer. The screen
 *     starts it on focus / scene change and pauses it on blur (navigating away), so
 *     it never bleeds into the rest of the app while remaining ready for instant
 *     resume on the next visit. Because it's owned here at the root
 *     with background audio enabled, it keeps playing while the phone is locked /
 *     app is backgrounded (you're still "on" the meditation screen navigationally).
 *
 *  2. TIMER: the countdown + completion bell. Controlled ONLY by begin/pause/stop.
 *     Pausing or stopping the timer does not touch the ambience. The countdown is
 *     anchored to an absolute end timestamp, so it stays accurate across backgrounding.
 */

export type SessionPhase = 'ready' | 'active' | 'complete';

export interface AmbienceOpts {
  sceneKey: string;
  sceneName: string | null;
  audioSource: AVPlaybackSource | null;
  volume: number;
}

const BELL = require('@/assets/soundreality-bell-fx-410608.mp3');

const applyAudioMode = () =>
  Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  }).catch(() => {});

export const [MeditationSessionProvider, useMeditationSession] = createContextHook(() => {
  // Timer layer
  const [phase, setPhase] = useState<SessionPhase>('ready');
  const [minutes, setMinutes] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [doneMin, setDoneMin] = useState(0);

  // Ambience layer
  const [sceneKey, setSceneKey] = useState<string | null>(null);
  const [sceneName, setSceneName] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.35);

  const soundRef = useRef<Audio.Sound | null>(null); // the looping ambience
  const ambienceSceneRef = useRef<string | null>(null);
  const ambienceTokenRef = useRef(0); // invalidates in-flight loads on swap/stop
  const bellRef = useRef<Audio.Sound | null>(null);
  const endAtRef = useRef<number | null>(null); // ms timestamp the sit ends at

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;
  const minutesRef = useRef(minutes);
  minutesRef.current = minutes;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const sceneNameRef = useRef(sceneName);
  sceneNameRef.current = sceneName;

  // Records actual sat time (from Begin, excluding pauses) to the per-day log.
  const { addSeconds } = useMeditationLog();
  // For checking off the meditation daily on natural completion. Ref'd so the
  // stable tick → complete() chain always sees the current program/markDone.
  const dailies = useDailies();
  const dailiesRef = useRef(dailies);
  dailiesRef.current = dailies;

  // ─── Ambience ──────────────────────────────────────────────────────────────
  const stopAmbience = useCallback(async () => {
    ambienceTokenRef.current += 1; // any in-flight load will bail
    ambienceSceneRef.current = null;
    const s = soundRef.current;
    soundRef.current = null;
    if (s) await s.unloadAsync().catch(() => {});
  }, []);

  // Leaving the meditation screen should silence the bed without throwing the
  // loaded audio away. Keeping it loaded makes returning to the same selected
  // scene an immediate resume without repeating setup work.
  const pauseAmbience = useCallback(async () => {
    await soundRef.current?.pauseAsync().catch(() => {});
  }, []);

  // Start (or swap to) the ambience for a scene. Idempotent: re-calling with the
  // scene that's already loaded just resumes it (no reload gap on re-focus).
  const startAmbience = useCallback(
    async (opts: AmbienceOpts) => {
      setSceneKey(opts.sceneKey);
      setSceneName(opts.sceneName);
      setVolumeState(opts.volume);

      if (!opts.audioSource) {
        await stopAmbience();
        return;
      }
      if (ambienceSceneRef.current === opts.sceneKey && soundRef.current) {
        await applyAudioMode();
        await soundRef.current.playAsync().catch(() => {});
        return;
      }
      await stopAmbience();
      const token = ++ambienceTokenRef.current;
      ambienceSceneRef.current = opts.sceneKey;
      try {
        await applyAudioMode();
        const { sound } = await Audio.Sound.createAsync(
          opts.audioSource,
          { isLooping: true, shouldPlay: true, volume: opts.volume },
        );
        if (ambienceTokenRef.current !== token) {
          sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
      } catch {
        // A missing/failed soundtrack must never break the screen.
      }
    },
    [stopAmbience],
  );

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    soundRef.current?.setVolumeAsync(v).catch(() => {});
  }, []);

  // ─── Timer ─────────────────────────────────────────────────────────────────
  const playBell = useCallback(async () => {
    try {
      applyAudioMode();
      // Bell follows the scene volume so it isn't jarring at low levels.
      const { sound } = await Audio.Sound.createAsync(BELL, { volume: volumeRef.current });
      bellRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && s.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (bellRef.current === sound) bellRef.current = null;
        }
      });
      await sound.playAsync();
    } catch {
      // A missing/failed bell must never break the sit.
    }
  }, []);

  const complete = useCallback(() => {
    endAtRef.current = null;
    setDoneMin(minutesRef.current);
    setPhase('complete');
    addSeconds(minutesRef.current * 60); // full sit
    // The completion screen says "Marked complete on Today." — make it true:
    // check off the meditation daily, if the user's program has one.
    dailiesRef.current.program
      .filter((d) => d.action === 'meditation')
      .forEach((d) => dailiesRef.current.markDone(d.id));
    logEvent('meditation_completed', { scene: sceneNameRef.current ?? 'Silence', minutes: minutesRef.current });
    // Review trigger: finishing a meditation is a genuine positive moment
    // (fires only on a natural completion, not when a sit is cut short).
    maybeAskForReview('meditation').catch(() => {});
    playBell();
  }, [playBell, addSeconds]);

  const tick = useCallback(() => {
    if (phaseRef.current !== 'active' || pausedRef.current) return;
    const end = endAtRef.current;
    if (end == null) return;
    const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    setRemaining(rem);
    if (rem <= 0) complete();
  }, [complete]);

  useEffect(() => {
    if (phase !== 'active' || paused) return;
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phase, paused, tick]);

  // Keep the audio session alive across interruptions; catch the timer up on the
  // return to foreground (JS timers freeze while backgrounded).
  useEffect(() => {
    applyAudioMode();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        applyAudioMode();
        tick();
      }
    });
    return () => sub.remove();
  }, [tick]);

  useEffect(
    () => () => {
      soundRef.current?.unloadAsync().catch(() => {});
      bellRef.current?.unloadAsync().catch(() => {});
    },
    [],
  );

  // Begin only starts the countdown — the ambience is already playing on its own.
  // The opening bell rings a half-second AFTER the tap (deliberately not
  // simultaneous with the button press) to signal the start of the sit; the
  // phase guard keeps it silent if the sit was stopped in that window.
  const begin = useCallback((mins: number) => {
    minutesRef.current = mins;
    setMinutes(mins);
    setDoneMin(mins);
    setPaused(false);
    setRemaining(mins * 60);
    endAtRef.current = Date.now() + mins * 60 * 1000;
    setPhase('active');
    setTimeout(() => { if (phaseRef.current === 'active') playBell(); }, 500);
    logEvent('meditation_started', { scene: sceneNameRef.current ?? 'Silence', minutes: mins });
  }, [playBell]);

  const setPausedTo = useCallback((p: boolean) => {
    setPaused(p);
    // Pause only the COUNTDOWN — the ambience keeps flowing.
    endAtRef.current = p ? null : Date.now() + remainingRef.current * 1000;
  }, []);

  const togglePause = useCallback(() => setPausedTo(!pausedRef.current), [setPausedTo]);

  // Stop the countdown, back to setup. Ambience is untouched (you're still here).
  const stop = useCallback(() => {
    // Log the elapsed active time only for a running sit — not when Done is tapped
    // from the completion screen (that sit was already logged in complete()).
    if (phaseRef.current === 'active') {
      const elapsed = minutesRef.current * 60 - remainingRef.current;
      addSeconds(elapsed);
      logEvent('meditation_stopped', { scene: sceneNameRef.current ?? 'Silence', minutes_planned: minutesRef.current, seconds_elapsed: elapsed });
    }
    endAtRef.current = null;
    setPaused(false);
    setPhase('ready');
    setRemaining(0);
  }, [addSeconds]);

  return useMemo(
    () => ({
      phase,
      minutes,
      remaining,
      paused,
      doneMin,
      sceneKey,
      sceneName,
      volume,
      startAmbience,
      pauseAmbience,
      stopAmbience,
      setVolume,
      begin,
      togglePause,
      stop,
    }),
    [phase, minutes, remaining, paused, doneMin, sceneKey, sceneName, volume, startAmbience, pauseAmbience, stopAmbience, setVolume, begin, togglePause, stop],
  );
});
