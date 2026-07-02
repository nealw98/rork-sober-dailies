import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState } from 'react-native';
import { Audio } from 'expo-av';
import createContextHook from '@nkzw/create-context-hook';

/**
 * Global meditation session (timer + looping soundtrack + completion bell).
 *
 * Lives at the app root (_layout.tsx), NOT in the meditation screen, so a sit
 * keeps running — audio playing, timer counting — while you navigate away, lock
 * the phone, or background the app. It stops only on pause, stop/Done, or when
 * the app is killed. Mirrors the background-audio setup in useGlobalAudioPlayer
 * (staysActiveInBackground + re-applying the audio mode on every foreground).
 *
 * The countdown is anchored to an absolute end timestamp rather than a per-second
 * decrement, so it stays accurate even though JS timers freeze while backgrounded.
 */

export type SessionPhase = 'ready' | 'active' | 'complete';

export interface BeginOpts {
  minutes: number;
  sceneKey: string;
  sceneName: string | null;
  audioUri: string | null;
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
  const [phase, setPhase] = useState<SessionPhase>('ready');
  const [minutes, setMinutes] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sceneKey, setSceneKey] = useState<string | null>(null);
  const [sceneName, setSceneName] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.35);
  const [doneMin, setDoneMin] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const bellRef = useRef<Audio.Sound | null>(null);
  const endAtRef = useRef<number | null>(null); // ms timestamp the sit ends at
  const audioTokenRef = useRef(0); // invalidates in-flight loads on stop/restart

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;
  const minutesRef = useRef(minutes);
  minutesRef.current = minutes;

  const playBell = useCallback(async () => {
    try {
      applyAudioMode();
      const { sound } = await Audio.Sound.createAsync(BELL);
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

  const unloadSoundtrack = useCallback(async () => {
    audioTokenRef.current += 1; // any in-flight load will see the token changed and bail
    const s = soundRef.current;
    soundRef.current = null;
    if (s) await s.unloadAsync().catch(() => {});
  }, []);

  const complete = useCallback(() => {
    endAtRef.current = null;
    setDoneMin(minutesRef.current);
    setPhase('complete'); // NOTE: soundtrack keeps playing through the complete screen
    playBell();
  }, [playBell]);

  const tick = useCallback(() => {
    if (phaseRef.current !== 'active' || pausedRef.current) return;
    const end = endAtRef.current;
    if (end == null) return;
    const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    setRemaining(rem);
    if (rem <= 0) complete();
  }, [complete]);

  // Countdown loop — runs at the provider level so it survives screen unmounts.
  useEffect(() => {
    if (phase !== 'active' || paused) return;
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phase, paused, tick]);

  // Keep the audio session alive across interruptions and catch the timer up when
  // returning to the foreground (JS timers are frozen while the app is backgrounded).
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

  // Final safety net if the whole app tree tears down.
  useEffect(
    () => () => {
      soundRef.current?.unloadAsync().catch(() => {});
      bellRef.current?.unloadAsync().catch(() => {});
    },
    [],
  );

  const begin = useCallback(
    async (opts: BeginOpts) => {
      await unloadSoundtrack();
      minutesRef.current = opts.minutes;
      setMinutes(opts.minutes);
      setDoneMin(opts.minutes);
      setSceneKey(opts.sceneKey);
      setSceneName(opts.sceneName);
      setVolumeState(opts.volume);
      setPaused(false);
      setRemaining(opts.minutes * 60);
      endAtRef.current = Date.now() + opts.minutes * 60 * 1000;
      setPhase('active');

      if (opts.audioUri) {
        const token = ++audioTokenRef.current;
        try {
          applyAudioMode();
          const { sound } = await Audio.Sound.createAsync(
            { uri: opts.audioUri },
            { isLooping: true, shouldPlay: true, volume: opts.volume },
          );
          if (audioTokenRef.current !== token) {
            sound.unloadAsync().catch(() => {});
            return;
          }
          soundRef.current = sound;
        } catch {
          // A missing/failed soundtrack must never break the sit.
        }
      }
    },
    [unloadSoundtrack],
  );

  const setPausedTo = useCallback((p: boolean) => {
    setPaused(p);
    if (p) {
      endAtRef.current = null; // freeze; remaining is preserved in state
      soundRef.current?.pauseAsync().catch(() => {});
    } else {
      endAtRef.current = Date.now() + remainingRef.current * 1000;
      soundRef.current?.playAsync().catch(() => {});
    }
  }, []);

  const togglePause = useCallback(() => setPausedTo(!pausedRef.current), [setPausedTo]);

  // Stop = end the sit and drop the soundtrack, back to setup (no complete screen).
  const stop = useCallback(async () => {
    endAtRef.current = null;
    setPaused(false);
    setPhase('ready');
    setRemaining(0);
    setSceneKey(null);
    setSceneName(null);
    await unloadSoundtrack();
  }, [unloadSoundtrack]);

  // From the complete screen — keep the (already playing) soundtrack, restart 5 min.
  const sitLonger = useCallback(() => {
    const m = 5;
    minutesRef.current = m;
    setMinutes(m);
    setDoneMin(m);
    setPaused(false);
    setRemaining(m * 60);
    endAtRef.current = Date.now() + m * 60 * 1000;
    setPhase('active');
    soundRef.current?.playAsync().catch(() => {});
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    soundRef.current?.setVolumeAsync(v).catch(() => {});
  }, []);

  return useMemo(
    () => ({
      phase,
      minutes,
      remaining,
      paused,
      sceneKey,
      sceneName,
      volume,
      doneMin,
      begin,
      togglePause,
      stop,
      sitLonger,
      setVolume,
    }),
    [phase, minutes, remaining, paused, sceneKey, sceneName, volume, doneMin, begin, togglePause, stop, sitLonger, setVolume],
  );
});
