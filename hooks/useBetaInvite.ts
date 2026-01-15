import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BETA_INVITE_FIRST_SHOWN_KEY = "beta_invite_first_shown_at";
const BETA_INVITE_LAST_SHOWN_KEY = "beta_invite_last_shown_at";
const BETA_INVITE_COUNT_KEY = "beta_invite_prompt_count";
const BETA_INVITE_COMPLETED_KEY = "beta_invite_completed";

const DAY_MS = 24 * 60 * 60 * 1000;
const PROMPT_INTERVAL_MS = 2 * DAY_MS;
const MAX_PROMPTS = 3;

const parseNumber = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

type BetaInviteListener = () => void;
const betaInviteListeners = new Set<BetaInviteListener>();

export const triggerBetaInviteModal = () => {
  betaInviteListeners.forEach((listener) => listener());
};

export const resetBetaInviteStorage = async () => {
  await AsyncStorage.multiRemove([
    BETA_INVITE_FIRST_SHOWN_KEY,
    BETA_INVITE_LAST_SHOWN_KEY,
    BETA_INVITE_COUNT_KEY,
    BETA_INVITE_COMPLETED_KEY,
  ]);
};

export const useBetaInvite = () => {
  const [showBetaInvite, setShowBetaInvite] = useState(false);
  const promptActiveRef = useRef(false);

  const checkAndShowInvite = useCallback(async () => {
    const entries = await AsyncStorage.multiGet([
      BETA_INVITE_COUNT_KEY,
      BETA_INVITE_LAST_SHOWN_KEY,
      BETA_INVITE_COMPLETED_KEY,
    ]);

    const map = Object.fromEntries(entries);
    const completed = map[BETA_INVITE_COMPLETED_KEY] === "true";
    if (completed) return;

    const count = parseNumber(map[BETA_INVITE_COUNT_KEY]) ?? 0;
    if (count >= MAX_PROMPTS) return;

    const lastShownAt = parseNumber(map[BETA_INVITE_LAST_SHOWN_KEY]);
    const shouldShow =
      count === 0 ||
      lastShownAt === null ||
      Date.now() - lastShownAt >= PROMPT_INTERVAL_MS;

    if (!shouldShow) return;

    promptActiveRef.current = true;
    setShowBetaInvite(true);
  }, []);

  const showBetaInviteNow = useCallback(() => {
    promptActiveRef.current = true;
    setShowBetaInvite(true);
  }, []);

  const recordPromptShown = useCallback(async () => {
    if (!promptActiveRef.current) return;
    promptActiveRef.current = false;

    const entries = await AsyncStorage.multiGet([
      BETA_INVITE_COUNT_KEY,
      BETA_INVITE_FIRST_SHOWN_KEY,
    ]);
    const map = Object.fromEntries(entries);
    const count = parseNumber(map[BETA_INVITE_COUNT_KEY]) ?? 0;
    const firstShown = parseNumber(map[BETA_INVITE_FIRST_SHOWN_KEY]);
    const now = Date.now();
    const nextCount = Math.min(count + 1, MAX_PROMPTS);

    const updates: [string, string][] = [
      [BETA_INVITE_COUNT_KEY, String(nextCount)],
      [BETA_INVITE_LAST_SHOWN_KEY, String(now)],
    ];

    if (!firstShown) {
      updates.push([BETA_INVITE_FIRST_SHOWN_KEY, String(now)]);
    }

    await AsyncStorage.multiSet(updates);
  }, []);

  useEffect(() => {
    let didCancel = false;
    (async () => {
      try {
        await checkAndShowInvite();
      } catch (error) {
        if (!didCancel) {
          console.log("[BetaInvite] Failed to check invite state", error);
        }
      }
    })();
    return () => {
      didCancel = true;
    };
  }, [checkAndShowInvite]);

  useEffect(() => {
    const listener = () => {
      showBetaInviteNow();
    };
    betaInviteListeners.add(listener);
    return () => {
      betaInviteListeners.delete(listener);
    };
  }, [showBetaInviteNow]);

  const dismissBetaInvite = useCallback(async () => {
    try {
      await recordPromptShown();
    } finally {
      setShowBetaInvite(false);
    }
  }, [recordPromptShown]);

  const markBetaInviteCompleted = useCallback(async () => {
    try {
      await recordPromptShown();
      await AsyncStorage.setItem(BETA_INVITE_COMPLETED_KEY, "true");
    } catch (error) {
      console.log("[BetaInvite] Failed to mark completed", error);
    } finally {
      setShowBetaInvite(false);
    }
  }, [recordPromptShown]);

  return {
    showBetaInvite,
    dismissBetaInvite,
    markBetaInviteCompleted,
    showBetaInviteNow,
  };
};
