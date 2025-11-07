import type { ReviewTrigger } from './reviewPrompt';

export type InAppReviewReason = 'debug' | 'fallback';

export interface InAppReviewRequest {
  trigger: ReviewTrigger;
  reason: InAppReviewReason;
  overrideMessage?: string;
}

type Presenter = (request: InAppReviewRequest) => Promise<boolean>;

let presenter: Presenter | null = null;

export function registerInAppReviewPresenter(handler: Presenter): void {
  console.log('[reviewPromptBridge] register presenter', handler.name || 'anonymous');
  presenter = handler;
}

export function unregisterInAppReviewPresenter(handler: Presenter): void {
  if (presenter === handler) {
    console.log('[reviewPromptBridge] unregister presenter', handler.name || 'anonymous');
    presenter = null;
  }
}

export async function showInAppReviewPrompt(request: InAppReviewRequest): Promise<boolean> {
  if (!presenter) {
    console.log('[reviewPromptBridge] no presenter registered', request);
    return false;
  }

  try {
    console.log('[reviewPromptBridge] invoking presenter', request);
    return await presenter(request);
  } catch (error) {
    console.warn('[reviewPrompt] In-app review presenter error', error);
    return false;
  }
}

