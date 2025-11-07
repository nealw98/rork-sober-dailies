import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { InAppReviewRequest } from '@/lib/reviewPromptBridge';
import { registerInAppReviewPresenter, unregisterInAppReviewPresenter } from '@/lib/reviewPromptBridge';
import type { ReviewTrigger } from '@/lib/reviewPrompt';

import { ReviewPromptModal } from './ReviewPromptModal';

interface ModalState {
  visible: boolean;
  request?: InAppReviewRequest;
}

export function ReviewPromptModalHost() {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [state, setState] = useState<ModalState>({ visible: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log('[ReviewPromptModalHost] mounting host');

    const presenter = (request: InAppReviewRequest) => {
      console.log('[ReviewPromptModalHost] presenter invoked', request);
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setState({ visible: true, request });

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          console.warn('[ReviewPromptModalHost] timeout waiting for tester action, auto-closing');
          resolverRef.current?.(false);
          resolverRef.current = null;
          setState({ visible: false, request: undefined });
          timeoutRef.current = null;
        }, 10000);
      });
    };

    registerInAppReviewPresenter(presenter);
    return () => {
      console.log('[ReviewPromptModalHost] unmounting host');
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      unregisterInAppReviewPresenter(presenter);
    };
  }, []);

  const { title, message } = useMemo(() => {
    if (!state.request) {
      console.log('[ReviewPromptModalHost] computing copy: no request');
      return {
        title: 'Enjoying Sober Dailies?',
        message: 'Share your experience with others—it helps more people discover the app.',
      };
    }

    const { trigger } = state.request;
    console.log('[ReviewPromptModalHost] computing copy for trigger', trigger);
    return getCopyForTrigger(trigger, state.request.overrideMessage);
  }, [state.request]);

  const handleDismiss = () => {
    console.log('[ReviewPromptModalHost] secondary button tapped');
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setState({ visible: false });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    resolver?.(false);
  };

  const handlePrimary = () => {
    console.log('[ReviewPromptModalHost] primary button tapped');
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setState({ visible: false });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    resolver?.(true);
  };

  useEffect(() => {
    console.log('[ReviewPromptModalHost] modal visibility changed', state.visible, state.request);
  }, [state.visible, state.request]);

  return (
    <ReviewPromptModal
      visible={state.visible}
      title={title}
      message={message}
      onPrimary={handlePrimary}
      onSecondary={handleDismiss}
    />
  );
}

function getCopyForTrigger(trigger: ReviewTrigger, overrideMessage?: string) {
  if (overrideMessage) {
    return {
      title: 'Thanks for sticking with us!',
      message: overrideMessage,
    };
  }

  switch (trigger) {
    case 'gratitude':
      return {
        title: 'Grateful for your daily practice?',
        message: 'If Sober Dailies helps you stay centered, would you share a quick review?',
      };
    case 'eveningReview':
      return {
        title: 'Reflecting with Sober Dailies?',
        message: 'A review helps more people discover nightly tools that support recovery.',
      };
    case 'spotCheck':
      return {
        title: 'Spot Check keeping you on track?',
        message: 'Tell others how Sober Dailies helps you stay in the solution by leaving a review.',
      };
    case 'aiSponsor':
      return {
        title: 'How’s your AI Sponsor?',
        message: 'If the AI sponsor is helpful, would you take a moment to leave a review?',
      };
    default:
      return {
        title: 'Enjoying Sober Dailies?',
        message: 'Share your experience with others—it helps more people discover the app.',
      };
  }
}

export default ReviewPromptModalHost;

