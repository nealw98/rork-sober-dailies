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
import {
  COWBOY_PETE_SYSTEM_PROMPT,
  COWBOY_PETE_INITIAL_MESSAGE,
} from "./cowboy-pete";
import {
  CO_SIGN_SALLY_SYSTEM_PROMPT,
  CO_SIGN_SALLY_INITIAL_MESSAGE,
} from "./co-sign-sally";
import {
  FRESH_FREDDIE_SYSTEM_PROMPT,
  FRESH_FREDDIE_INITIAL_MESSAGE,
} from "./fresh-freddie";
import {
  MAMA_JO_SYSTEM_PROMPT,
  MAMA_JO_INITIAL_MESSAGE,
} from "./mama-jo";

export interface SponsorConfig {
  id: SponsorType | string;
  name: string;
  description: string;
  avatar: any; // For require()
  isAvailable: boolean;
  systemPrompt?: string;
  initialMessage?: ChatMessage;
  placeholderText?: string;
  loadingText?: string;
  bubbleColor?: string;
  bubbleShadowColor?: string;
  bubbleBorderColor?: string;
  tileColor?: string;
}

export const SPONSORS: SponsorConfig[] = [
  {
    id: "supportive",
    name: "Steady Eddie",
    description: "Solid wisdom and steady support",
    avatar: require("@/assets/images/Steady_Eddie.png"),
    isAvailable: true,
    systemPrompt: STEADY_EDDIE_SYSTEM_PROMPT,
    initialMessage: STEADY_EDDIE_INITIAL_MESSAGE,
    placeholderText: "Tell Eddie what's on your mind...",
    loadingText: "Steady Eddie is thinking...",
    bubbleColor: "#d0e8d0",
    tileColor: "#5FB35F", // Green - calm and steady
  },
  {
    id: "salty",
    name: "Salty Sam",
    description: "Direct and no-nonsense",
    avatar: require("@/assets/images/Salty_Sam.png"),
    isAvailable: true,
    systemPrompt: SALTY_SAM_SYSTEM_PROMPT,
    initialMessage: SALTY_SAM_INITIAL_MESSAGE,
    placeholderText: "Tell Sam what's got you sideways...",
    loadingText: "Salty Sam is thinking...",
    bubbleColor: "#fff0d4",
    tileColor: "#F5C341", // Yellow
  },
  {
    id: "grace",
    name: "Gentle Grace",
    description: "Compassionate and encouraging",
    avatar: require("@/assets/images/Gentle_Grace.png"),
    isAvailable: true,
    systemPrompt: GENTLE_GRACE_SYSTEM_PROMPT,
    initialMessage: GENTLE_GRACE_INITIAL_MESSAGE,
    placeholderText: "Tell Grace what's in your heart...",
    loadingText: "Gentle Grace is channeling wisdom...",
    bubbleColor: "#e8d4f0",
    tileColor: "#8A65B5", // Darker purple
  },
  {
    id: "cowboy-pete",
    name: "Cowboy Pete",
    description: "Western wisdom in a gentle drawl",
    avatar: require("@/assets/images/cowboy_pete.png"),
    isAvailable: true,
    systemPrompt: COWBOY_PETE_SYSTEM_PROMPT,
    initialMessage: COWBOY_PETE_INITIAL_MESSAGE,
    placeholderText: "Tell Pete what's kickin' up dust...",
    loadingText: "Cowboy Pete is mullin' it over...",
    bubbleColor: "#E0CABE",
    tileColor: "#C4956B", // Brown (lighter for contrast)
  },
  {
    id: "co-sign-sally",
    name: "Co-Sign Sally",
    description: "Wry humor and sarcastic truth",
    avatar: require("@/assets/images/new_co-sign_sally.png"),
    isAvailable: true,
    systemPrompt: CO_SIGN_SALLY_SYSTEM_PROMPT,
    initialMessage: CO_SIGN_SALLY_INITIAL_MESSAGE,
    placeholderText: "Tell Sally your side of the story...",
    loadingText: "Sally is noddin' along...",
    bubbleColor: "#FFD6E6",
    tileColor: "#D5708A", // Darker pink
  },
  {
    id: "fresh",
    name: "Fresh Freddie",
    description: "Upbeat zoomer energy",
    avatar: require("@/assets/images/brown_fresh_freddie.png"),
    isAvailable: true,
    systemPrompt: FRESH_FREDDIE_SYSTEM_PROMPT,
    initialMessage: FRESH_FREDDIE_INITIAL_MESSAGE,
    placeholderText: "Tell Freddie what's goin' on...",
    loadingText: "Fresh Freddie is cookin' up a take...",
    bubbleColor: "#CCFBF1",
    bubbleShadowColor: "rgba(16,185,129,0.45)",
    tileColor: "#4AA898", // Darker teal
  },
  {
    id: "mama-jo",
    name: "Mama Jo",
    description: "Warm Southern wisdom and firm love",
    avatar: require("@/assets/images/Mama_Jo.png"),
    isAvailable: true,
    systemPrompt: MAMA_JO_SYSTEM_PROMPT,
    initialMessage: MAMA_JO_INITIAL_MESSAGE,
    placeholderText: "Tell Mama Jo what's on your mind...",
    loadingText: "Mama Jo is fixin' to share some wisdom...",
    bubbleColor: "#ffe1d3",
    tileColor: "#E8884A", // Orange
  },
];

export const getSponsorById = (id: string): SponsorConfig | undefined => {
  return SPONSORS.find((sponsor) => sponsor.id === id);
};

export const getAvailableSponsors = (): SponsorConfig[] => {
  return SPONSORS.filter((sponsor) => sponsor.isAvailable);
};

