import { ChatMessage, SponsorType } from "@/types";
import {
  STEADY_EDDIE_SYSTEM_PROMPT,
  STEADY_EDDIE_INITIAL_MESSAGE,
} from "./steady-eddie";
import {
  SALTY_SAM_SYSTEM_PROMPT,
  SALTY_SAM_INITIAL_MESSAGE,
} from "./salty-sam";
import {
  GENTLE_GRACE_SYSTEM_PROMPT,
  GENTLE_GRACE_INITIAL_MESSAGE,
} from "./gentle-grace";

export interface SponsorConfig {
  id: SponsorType | string;
  name: string;
  description: string;
  avatar: any; // For require()
  isAvailable: boolean;
  backend?: 'rork' | 'sponsor-api';
  apiSponsorId?: 'supportive' | 'salty' | 'grace';
  systemPrompt?: string;
  initialMessage?: ChatMessage;
  placeholderText?: string;
  loadingText?: string;
  bubbleColor?: string;
  bubbleShadowColor?: string;
  bubbleBorderColor?: string;
  tileColor?: string;
  tags?: string[];
  hookQuote?: string;
  chatPlaceholder?: string;
}

export const SPONSORS: SponsorConfig[] = [
  {
    id: "supportive",
    name: "Steady Eddie",
    description: "Solid wisdom and steady support",
    avatar: require("@/assets/images/steady_eddie4.webp"),
    isAvailable: true,
    systemPrompt: STEADY_EDDIE_SYSTEM_PROMPT,
    initialMessage: STEADY_EDDIE_INITIAL_MESSAGE,
    placeholderText: "Tell Eddie what's on your mind...",
    loadingText: "Steady Eddie is thinking...",
    bubbleColor: "#d0e8d0",
    tileColor: "#a8d8a8",
    tags: ["PATIENT", "STEADY", "WISE"],
    hookQuote: "One day at a time. That's all any of us have.",
    chatPlaceholder: "What's on your mind...",
  },
  {
    id: "supportive-v2",
    name: "Steady Eddie 2",
    description: "API test · gpt-5.4-mini",
    avatar: require("@/assets/images/steady_eddie4.webp"),
    isAvailable: true,
    backend: "sponsor-api",
    apiSponsorId: "supportive",
    systemPrompt: STEADY_EDDIE_SYSTEM_PROMPT,
    initialMessage: {
      ...STEADY_EDDIE_INITIAL_MESSAGE,
      id: "welcome-supportive-v2",
    },
    placeholderText: "Tell Eddie what's on your mind...",
    loadingText: "Steady Eddie 2 is thinking...",
    bubbleColor: "#d0e8d0",
    tileColor: "#a8d8a8",
    tags: ["API TEST", "PATIENT", "STEADY"],
    hookQuote: "Same Eddie. New backend.",
    chatPlaceholder: "What's on your mind...",
  },
  {
    id: "salty",
    name: "Salty Sam",
    description: "Direct and no-nonsense",
    avatar: require("@/assets/images/salty_sam4.webp"),
    isAvailable: true,
    systemPrompt: SALTY_SAM_SYSTEM_PROMPT,
    initialMessage: SALTY_SAM_INITIAL_MESSAGE,
    placeholderText: "Tell Sam what's got you sideways...",
    loadingText: "Salty Sam is thinking...",
    bubbleColor: "#fff0d4",
    tileColor: "#ffeca7",
    tags: ["OLD SCHOOL", "DIRECT", "UNVARNISHED"],
    hookQuote: "If you want the truth, sit down. If you want a hug, call your mom.",
    chatPlaceholder: "Give it to me straight...",
  },
  {
    id: "salty-v2",
    name: "Salty Sam 2",
    description: "API test · gpt-5.4-mini",
    avatar: require("@/assets/images/salty_sam4.webp"),
    isAvailable: true,
    backend: "sponsor-api",
    apiSponsorId: "salty",
    systemPrompt: SALTY_SAM_SYSTEM_PROMPT,
    initialMessage: {
      ...SALTY_SAM_INITIAL_MESSAGE,
      id: "welcome-salty-v2",
    },
    placeholderText: "Tell Sam what's got you sideways...",
    loadingText: "Salty Sam 2 is thinking...",
    bubbleColor: "#fff0d4",
    tileColor: "#ffeca7",
    tags: ["API TEST", "DIRECT", "UNVARNISHED"],
    hookQuote: "Same Sam. New backend.",
    chatPlaceholder: "Give it to me straight...",
  },
  {
    id: "grace",
    name: "Gentle Grace",
    description: "Compassionate and encouraging",
    avatar: require("@/assets/images/gentle_grace3.webp"),
    isAvailable: true,
    systemPrompt: GENTLE_GRACE_SYSTEM_PROMPT,
    initialMessage: GENTLE_GRACE_INITIAL_MESSAGE,
    placeholderText: "Tell Grace what's in your heart...",
    loadingText: "Gentle Grace is channeling wisdom...",
    bubbleColor: "#e8d4f0",
    tileColor: "#d8b8e8",
    tags: ["COMPASSIONATE", "GENTLE", "ENCOURAGING"],
    hookQuote: "You're here. That's already brave.",
    chatPlaceholder: "What's in your heart...",
  },
  {
    id: "grace-v2",
    name: "Gentle Grace 2",
    description: "API test · gpt-5.4-mini",
    avatar: require("@/assets/images/gentle_grace3.webp"),
    isAvailable: true,
    backend: "sponsor-api",
    apiSponsorId: "grace",
    systemPrompt: GENTLE_GRACE_SYSTEM_PROMPT,
    initialMessage: {
      ...GENTLE_GRACE_INITIAL_MESSAGE,
      id: "welcome-grace-v2",
    },
    placeholderText: "Tell Grace what's in your heart...",
    loadingText: "Gentle Grace 2 is reflecting...",
    bubbleColor: "#e8d4f0",
    tileColor: "#d8b8e8",
    tags: ["API TEST", "GENTLE", "SPIRITUAL"],
    hookQuote: "Same Grace. New backend.",
    chatPlaceholder: "What's in your heart...",
  },
];

export const getSponsorById = (id: string): SponsorConfig | undefined => {
  return SPONSORS.find((sponsor) => sponsor.id === id);
};

export const getAvailableSponsors = (): SponsorConfig[] => {
  return SPONSORS.filter((sponsor) => sponsor.isAvailable);
};
