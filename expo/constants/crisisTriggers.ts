export const crisisTriggers = {
  selfHarm: [
    "I want to hurt myself",
    "I'm going to cut myself",
    "I want to end it all",
    "I can't go on anymore",
    "I want to die",
    "I'm going to kill myself",
    "I want to kill myself",
    "thinking of killing myself",
    "thinking about killing myself",
    "thinking of suicide",
    "thinking about suicide",
    "I don't want to live anymore",
    "I'm suicidal",
    "I'm going to harm myself",
    "want to end my life",
    "going to end my life",
    "take my own life",
    "taking my own life",
    "hurt myself",
    "harm myself",
    "cut myself",
    "cutting myself",
    "suicidal thoughts",
    "suicidal ideation",
    "better off dead",
    "world would be better without me",
    "everyone would be better off without me",
    "no point in living",
    "life isn't worth living",
    "want to disappear forever",
    "wish I was dead",
    "wish I were dead"
  ],
  violence: [
    "I'm going to hurt someone",
    "I want to kill someone",
    "I'm going to kill someone",
    "planning to hurt someone",
    "planning to kill someone",
    "I'm going to attack someone",
    "I'm going to shoot someone",
    "I'm going to stab someone",
    "going to hurt people",
    "going to kill people",
    "want to hurt people",
    "want to kill people"
  ]
};

// Normalize text for better matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Enhanced crisis detection with much more specific matching to reduce false positives
export function detectCrisis(text: string): {
  type: keyof typeof crisisTriggers | null;
  matchedTrigger?: string;
} {
  const normalizedText = normalizeText(text);
  console.log('Normalized text for crisis detection:', normalizedText);

  // Check each category in order of severity
  const categories: (keyof typeof crisisTriggers)[] = ['violence', 'selfHarm'];
  
  for (const category of categories) {
    const triggers = crisisTriggers[category];
    
    for (const trigger of triggers) {
      const normalizedTrigger = normalizeText(trigger);
      
      // Only check for exact phrase matches to reduce false positives
      // This is much more conservative but will catch real crisis situations
      if (normalizedText.includes(normalizedTrigger)) {
        console.log(`Crisis detected - Category: ${category}, Trigger: "${trigger}" (exact phrase match)`);
        return { type: category, matchedTrigger: trigger };
      }
    }
  }

  return { type: null };
}

export const crisisResponses = {
  selfHarm: {
    "Gentle Grace": "This is really serious, and I care about your safety. Please call 988 or visit findahelpline.com. You're not alone.",
    "Steady Eddie": "This is the time to find real support. Call 988 or go to findahelpline.com. They can help in ways I can't.",
    "Salty Sam": "This is serious. I'm not the right person to help—but someone out there is. Call 988 or go to findahelpline.com. Don't wait."
  },
  violence: {
    all: "This is serious. If you're in danger of hurting someone, call 911 or step away now. Please don't act on it—get help instead."
  }
};