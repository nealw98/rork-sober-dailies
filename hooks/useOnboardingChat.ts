// Onboarding's 3-message try with one sponsor (v4 handoff 4). Deliberately NOT
// the chat store: this conversation lives in memory only and never touches the
// user's real chat history. Replies come from the same paid chain as the real
// chat, in the server's onboarding mode.
import { useRef, useState } from 'react';
import { ChatMessage } from '@/types';
import { detectCrisis, crisisResponses } from '@/constants/crisisTriggers';
import { fetchSponsorReply, isSponsorLimitError } from '@/hooks/use-chat-store';
import { TRY_FIRST_NAME, TRY_INTRO, TRY_MESSAGES, type TrySponsorId } from '@/constants/onboardingSponsors';

const CRISIS_NAME: Record<TrySponsorId, 'Steady Eddie' | 'Salty Sam' | 'Gentle Grace'> = {
  supportive: 'Steady Eddie',
  salty: 'Salty Sam',
  grace: 'Gentle Grace',
};

let nextId = 0;
const message = (sender: ChatMessage['sender'], text: string): ChatMessage => ({
  id: `try-${Date.now()}-${nextId++}`,
  text,
  sender,
  timestamp: Date.now(),
});

export type OnboardingChat = ReturnType<typeof useOnboardingChat>;

export function useOnboardingChat(sponsorId: TrySponsorId, {
  member,
  closing,
  onReply,
  onFinished,
}: {
  member: boolean;
  // Built when the try ends, so it names what is untried at that moment.
  closing: () => string;
  onReply: (n: number) => void;
  onFinished: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [message('bot', TRY_INTRO[sponsorId])]);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read inside async sends, which outlive the render they started in.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const sentRef = useRef(0);

  // Resolves false when the message didn't go through, so the composer can
  // give the text back.
  const sendMessage = async (text: string): Promise<boolean> => {
    if (!text.trim() || isLoading || finished) return false;
    setError(null);
    const user = message('user', text);
    const withUser = [...messagesRef.current, user];
    setMessages(withUser);

    // The app's own crisis guard runs first, as in the real chat. Its reply
    // never reaches the server, so it doesn't use up one of the three.
    const { type: crisisType } = detectCrisis(text);
    if (crisisType) {
      const reply = crisisType === 'violence'
        ? crisisResponses.violence.all
        : crisisResponses.selfHarm[CRISIS_NAME[sponsorId]];
      setMessages([...withUser, message('bot', reply)]);
      return true;
    }

    setIsLoading(true);
    try {
      const result = await fetchSponsorReply(sponsorId, withUser, text, { onboarding: true, member });
      const n = ++sentRef.current;
      setSent(n);
      onReply(n);
      const next = [...withUser, message('bot', result.text)];
      if (n >= TRY_MESSAGES) {
        setMessages([...next, message('bot', closing())]);
        setFinished(true);
        onFinished();
      } else {
        setMessages(next);
      }
      return true;
    } catch (e) {
      // The server refunds a failed reply, so it doesn't count here either:
      // take the message back out and let them send it again.
      setMessages(messagesRef.current.filter((m) => m.id !== user.id));
      if (isSponsorLimitError(e)) {
        // This device already used its try (e.g. before a reinstall).
        setError(e.message);
        setFinished(true);
        onFinished();
      } else {
        setError(`Couldn’t reach ${TRY_FIRST_NAME[sponsorId]} just now. Try again.`);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { sponsorType: sponsorId, messages, isLoading, sent, finished, error, sendMessage };
}
