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
  avatar: any; // For require() or null for locked sponsors
  isAvailable: boolean;
  systemPrompt?: string;
  initialMessage?: ChatMessage;
  placeholderText?: string;
  loadingText?: string;
  bubbleColor?: string;
}

export const SPONSORS: SponsorConfig[] = [
  {
    id: "supportive",
    name: "Steady Eddie",
    description: "Solid wisdom and steady support, day after day.",
    avatar: require("@/assets/images/Steady_Eddie.png"),
    isAvailable: true,
    systemPrompt: STEADY_EDDIE_SYSTEM_PROMPT,
    initialMessage: STEADY_EDDIE_INITIAL_MESSAGE,
    placeholderText: "Tell Eddie what's on your mind...",
    loadingText: "Steady Eddie is thinking...",
    bubbleColor: "#e8f8e8",
  },
  {
    id: "salty",
    name: "Salty Sam",
    description: "Direct and no-nonsense. Tells it like it is.",
    avatar: require("@/assets/images/Salty_Sam.png"),
    isAvailable: true,
    systemPrompt: SALTY_SAM_SYSTEM_PROMPT,
    initialMessage: SALTY_SAM_INITIAL_MESSAGE,
    placeholderText: "Tell Sam what's got you sideways...",
    loadingText: "Salty Sam is thinking...",
    bubbleColor: "#fff0d4",
  },
  {
    id: "grace",
    name: "Gentle Grace",
    description: "Compassionate, uplifting, and deeply encouraging.",
    avatar: require("@/assets/images/Gentle_Grace.png"),
    isAvailable: true,
    systemPrompt: GENTLE_GRACE_SYSTEM_PROMPT,
    initialMessage: GENTLE_GRACE_INITIAL_MESSAGE,
    placeholderText: "Tell Grace what's in your heart...",
    loadingText: "Gentle Grace is channeling wisdom...",
    bubbleColor: "#e8d4f0",
  },
  {
    id: "momma-jo",
    name: "Momma Jo",
    description: "Coming soon - Southern fried guidance and down home truth.",
    avatar: null,
    isAvailable: false,
  },
  {
    id: "cowboy-pete",
    name: "Cowboy Pete",
    description: "Coming soon - Straight shooting wisdom from a trail-worn cowboy.",
    avatar: null,
    isAvailable: false,
  },
  {
    id: "co-sign-sally",
    name: "Co-Sign Sally",
    description: "Coming soon - When you just want someone to agree with you.",
    avatar: null,
    isAvailable: false,
  },
];

export const getSponsorById = (id: string): SponsorConfig | undefined => {
  return SPONSORS.find((sponsor) => sponsor.id === id);
};

export const getAvailableSponsors = (): SponsorConfig[] => {
  return SPONSORS.filter((sponsor) => sponsor.isAvailable);
};


