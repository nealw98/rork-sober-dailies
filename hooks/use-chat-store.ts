import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAnonymousId } from "@/lib/anonymousId";
import { ChatMessage, SponsorType } from "@/types";
import { detectCrisis, crisisResponses } from "@/constants/crisisTriggers";
import { 
  SALTY_SAM_SYSTEM_PROMPT, 
  SALTY_SAM_INITIAL_MESSAGE 
} from "@/constants/salty-sam";
import { 
  STEADY_EDDIE_SYSTEM_PROMPT, 
  STEADY_EDDIE_INITIAL_MESSAGE 
} from "@/constants/steady-eddie";
import { 
  GENTLE_GRACE_SYSTEM_PROMPT, 
  GENTLE_GRACE_INITIAL_MESSAGE 
} from "@/constants/gentle-grace";
import {
  COWBOY_PETE_SYSTEM_PROMPT,
  COWBOY_PETE_INITIAL_MESSAGE,
} from "@/constants/cowboy-pete";
import {
  CO_SIGN_SALLY_SYSTEM_PROMPT,
  CO_SIGN_SALLY_INITIAL_MESSAGE,
} from "@/constants/co-sign-sally";
import {
  FRESH_FREDDIE_SYSTEM_PROMPT,
  FRESH_FREDDIE_INITIAL_MESSAGE,
} from "@/constants/fresh-freddie";
import {
  MAMA_JO_SYSTEM_PROMPT,
  MAMA_JO_INITIAL_MESSAGE,
} from "@/constants/mama-jo";
import { getSponsorById } from "@/constants/sponsors";
import {
  SUPABASE_ANON_KEY,
  engineToRequest,
  getSponsorApiChatUrl,
  getSponsorApiEngine,
  getSponsorApiTemperature,
  getSponsorApiUrl,
} from "@/lib/sponsorApiSettings";



// Type for API message format
interface APIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Function to call the AI API
async function callAI(messages: APIMessage[]): Promise<string> {
  try {
    console.log('=== AI API REQUEST ===');
    console.log('Message Count:', messages.length);
    console.log('Full Messages:', JSON.stringify(messages, null, 2));
    
    const requestBody = { messages };
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('Request Body Size (bytes):', JSON.stringify(requestBody).length);
    
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('=== AI API RESPONSE ===');
    console.log('Status Code:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== AI API ERROR ===');
      console.error('Status:', response.status);
      console.error('Response Body:', errorText);
      
      // Try to parse as JSON for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed Error JSON:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('Error response is not JSON');
      }
      
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Response Text:', responseText);
    
    const data = JSON.parse(responseText);
    console.log('=== AI API SUCCESS ===');
    console.log('Response Data:', JSON.stringify(data, null, 2));
    console.log('Has Completion:', !!data.completion);
    console.log('Completion Length:', data.completion?.length || 0);
    
    return data.completion || "Sorry, I'm having trouble right now. Try again in a minute.";
  } catch (error: any) {
    console.error('=== AI API EXCEPTION ===');
    console.error('Error Type:', error?.constructor?.name);
    console.error('Error Message:', error?.message);
    console.error('Full Error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('Stack:', error?.stack);
    
    return "I'm having trouble connecting right now. Please try again in a moment, or consider reaching out to a meeting or another member of your support network.";
  }
}

async function callSponsorAPI(
  sponsorType: SponsorType,
  chatMessages: ChatMessage[],
  message: string
): Promise<{ text: string; model?: string; temperature?: number }> {
  const sponsor = getSponsorById(sponsorType);
  const apiSponsorId = sponsor?.apiSponsorId ?? sponsorType;
  const temperature = await getSponsorApiTemperature();
  const { provider, model } = engineToRequest(await getSponsorApiEngine());
  const sponsorApiUrl = await getSponsorApiUrl();
  const sponsorApiChatUrl = getSponsorApiChatUrl(sponsorApiUrl);
  const anonymousId = await getAnonymousId().catch(() => null);
  const conversation = chatMessages
    .slice(1, -1)
    .slice(-10)
    .map((msg) => ({
      role: msg.sender === "bot" ? "assistant" : "user",
      content: msg.text,
    }));

  const response = await fetch(sponsorApiChatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      sponsorId: apiSponsorId,
      message,
      conversation,
      temperature,
      maxOutputTokens: 260,
      provider,
      model,
      anonymous_id: anonymousId,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Sponsor API request failed: ${response.status}`);
  }

  return {
    text: data.outputText || "Sorry, I'm having trouble right now. Try again in a minute.",
    model: typeof data.model === "string" ? data.model : undefined,
    temperature,
  };
}

// Convert chat messages to API format
function convertToAPIMessages(chatMessages: ChatMessage[], sponsorType: SponsorType): APIMessage[] {
  let systemPrompt;
  
  switch (sponsorType) {
    case "salty":
      systemPrompt = SALTY_SAM_SYSTEM_PROMPT;
      break;
    case "supportive":
      systemPrompt = STEADY_EDDIE_SYSTEM_PROMPT;
      break;
      case "grace":
      systemPrompt = GENTLE_GRACE_SYSTEM_PROMPT;
      break;
    case "salty-v2":
      systemPrompt = SALTY_SAM_SYSTEM_PROMPT;
      break;
    case "supportive-v2":
      systemPrompt = STEADY_EDDIE_SYSTEM_PROMPT;
      break;
    case "grace-v2":
      systemPrompt = GENTLE_GRACE_SYSTEM_PROMPT;
      break;
    case "cowboy-pete":
      systemPrompt = COWBOY_PETE_SYSTEM_PROMPT;
      break;
    case "co-sign-sally":
      systemPrompt = CO_SIGN_SALLY_SYSTEM_PROMPT;
      break;
    case "fresh":
      systemPrompt = FRESH_FREDDIE_SYSTEM_PROMPT;
      break;
    case "mama-jo":
      systemPrompt = MAMA_JO_SYSTEM_PROMPT;
      break;
    default:
      systemPrompt = STEADY_EDDIE_SYSTEM_PROMPT;
  }

  console.log('Using FULL system prompt, length:', systemPrompt.length);

  const apiMessages: APIMessage[] = [];

  // Skip the initial welcome message and convert the rest
  const conversationMessages = chatMessages.slice(1);
  
  conversationMessages.forEach((msg, index) => {
    if (msg.sender === 'user') {
      // For the first user message only, prepend the FULL system prompt
      // Rork API doesn't accept 'system' role, so we include it in the first user message
      const content = index === 0 ? `${systemPrompt}\n\nUser: ${msg.text}` : msg.text;
      apiMessages.push({ role: 'user', content });
    } else if (msg.sender === 'bot') {
      apiMessages.push({ role: 'assistant', content: msg.text });
    }
  });

  return apiMessages;
}

export const [ChatStoreProvider, useChatStore] = createContextHook(() => {
  const [sponsorType, setSponsorType] = useState<SponsorType>("supportive");
  const [saltyMessages, setSaltyMessages] = useState<ChatMessage[]>([SALTY_SAM_INITIAL_MESSAGE]);
  const [supportiveMessages, setSupportiveMessages] = useState<ChatMessage[]>([STEADY_EDDIE_INITIAL_MESSAGE]);
  const [graceMessages, setGraceMessages] = useState<ChatMessage[]>([GENTLE_GRACE_INITIAL_MESSAGE]);
  const [saltyV2Messages, setSaltyV2Messages] = useState<ChatMessage[]>([{ ...SALTY_SAM_INITIAL_MESSAGE, id: "welcome-salty-v2" }]);
  const [supportiveV2Messages, setSupportiveV2Messages] = useState<ChatMessage[]>([{ ...STEADY_EDDIE_INITIAL_MESSAGE, id: "welcome-supportive-v2" }]);
  const [graceV2Messages, setGraceV2Messages] = useState<ChatMessage[]>([{ ...GENTLE_GRACE_INITIAL_MESSAGE, id: "welcome-grace-v2" }]);
  const [cowboyMessages, setCowboyMessages] = useState<ChatMessage[]>([COWBOY_PETE_INITIAL_MESSAGE]);
  const [sallyMessages, setSallyMessages] = useState<ChatMessage[]>([CO_SIGN_SALLY_INITIAL_MESSAGE]);
  const [freshMessages, setFreshMessages] = useState<ChatMessage[]>([FRESH_FREDDIE_INITIAL_MESSAGE]);
  const [mamaJoMessages, setMamaJoMessages] = useState<ChatMessage[]>([MAMA_JO_INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState<boolean>(false);

  // Get current messages based on selected sponsor
  const messages = (() => {
    switch (sponsorType) {
      case "salty": return saltyMessages;
      case "supportive": return supportiveMessages;
      case "grace": return graceMessages;
      case "salty-v2": return saltyV2Messages;
      case "supportive-v2": return supportiveV2Messages;
      case "grace-v2": return graceV2Messages;
      case "cowboy-pete": return cowboyMessages;
      case "co-sign-sally": return sallyMessages;
      case "fresh": return freshMessages;
      case "mama-jo": return mamaJoMessages;
      default: return saltyMessages;
    }
  })();
  
  // Set messages based on selected sponsor
  const setMessages = (newMessages: ChatMessage[]) => {
    switch (sponsorType) {
      case "salty":
        setSaltyMessages(newMessages);
        break;
      case "supportive":
        setSupportiveMessages(newMessages);
        break;
      case "grace":
        setGraceMessages(newMessages);
        break;
      case "salty-v2":
        setSaltyV2Messages(newMessages);
        break;
      case "supportive-v2":
        setSupportiveV2Messages(newMessages);
        break;
      case "grace-v2":
        setGraceV2Messages(newMessages);
        break;
      case "cowboy-pete":
        setCowboyMessages(newMessages);
        break;
      case "co-sign-sally":
        setSallyMessages(newMessages);
        break;
      case "fresh":
        setFreshMessages(newMessages);
        break;
      case "mama-jo":
        setMamaJoMessages(newMessages);
        break;
    }
  };

  // Load messages and sponsor preference from storage on initial load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          storedSaltyMessages, 
          storedSupportiveMessages, 
          storedGraceMessages,
          storedSaltyV2Messages,
          storedSupportiveV2Messages,
          storedGraceV2Messages,
          storedCowboyMessages,
          storedSallyMessages,
          storedFreshMessages,
          storedMamaJoMessages,
          storedSponsorType
        ] = await Promise.all([
          AsyncStorage.getItem("aa-chat-messages-salty"),
          AsyncStorage.getItem("aa-chat-messages-supportive"),
          AsyncStorage.getItem("aa-chat-messages-grace"),
          AsyncStorage.getItem("aa-chat-messages-salty-v2"),
          AsyncStorage.getItem("aa-chat-messages-supportive-v2"),
          AsyncStorage.getItem("aa-chat-messages-grace-v2"),
          AsyncStorage.getItem("aa-chat-messages-cowboy"),
          AsyncStorage.getItem("aa-chat-messages-sally"),
          AsyncStorage.getItem("aa-chat-messages-fresh"),
          AsyncStorage.getItem("aa-chat-messages-mama-jo"),
          AsyncStorage.getItem("aa-chat-sponsor-type")
        ]);
        
        if (storedSponsorType) {
          setSponsorType(storedSponsorType as SponsorType);
        }

        if (storedSaltyV2Messages) {
          try {
            const parsed = JSON.parse(storedSaltyV2Messages);
            if (Array.isArray(parsed)) {
              setSaltyV2Messages([{ ...SALTY_SAM_INITIAL_MESSAGE, id: "welcome-salty-v2" }, ...parsed.filter((msg) => msg?.id !== "welcome-salty-v2")]);
            } else {
              console.warn('[Chat Store] Invalid salty-v2 messages format, using defaults');
            }
          } catch (error) {
            console.error('[Chat Store] Failed to parse salty-v2 messages:', error);
          }
        }

        if (storedSupportiveV2Messages) {
          try {
            const parsed = JSON.parse(storedSupportiveV2Messages);
            if (Array.isArray(parsed)) {
              setSupportiveV2Messages([{ ...STEADY_EDDIE_INITIAL_MESSAGE, id: "welcome-supportive-v2" }, ...parsed.filter((msg) => msg?.id !== "welcome-supportive-v2")]);
            } else {
              console.warn('[Chat Store] Invalid supportive-v2 messages format, using defaults');
            }
          } catch (error) {
            console.error('[Chat Store] Failed to parse supportive-v2 messages:', error);
          }
        }

        if (storedGraceV2Messages) {
          try {
            const parsed = JSON.parse(storedGraceV2Messages);
            if (Array.isArray(parsed)) {
              setGraceV2Messages([{ ...GENTLE_GRACE_INITIAL_MESSAGE, id: "welcome-grace-v2" }, ...parsed.filter((msg) => msg?.id !== "welcome-grace-v2")]);
            } else {
              console.warn('[Chat Store] Invalid grace-v2 messages format, using defaults');
            }
          } catch (error) {
            console.error('[Chat Store] Failed to parse grace-v2 messages:', error);
          }
        }
        
        if (storedSaltyMessages) {
          try {
            const parsed = JSON.parse(storedSaltyMessages);
            // Validate that parsed data is an array
            if (Array.isArray(parsed)) {
              // Always use the latest initial message and append any additional messages
              if (parsed.length === 0 || parsed[0].id !== "welcome-salty") {
                setSaltyMessages([SALTY_SAM_INITIAL_MESSAGE, ...parsed]);
              } else {
                // Replace the first message with the latest initial message
                setSaltyMessages([SALTY_SAM_INITIAL_MESSAGE, ...parsed.slice(1)]);
              }
            } else {
              console.warn('[Chat Store] Invalid salty messages format, using defaults');
              setSaltyMessages([SALTY_SAM_INITIAL_MESSAGE]);
            }
          } catch (error) {
            console.error('[Chat Store] Failed to parse salty messages:', error);
            setSaltyMessages([SALTY_SAM_INITIAL_MESSAGE]);
          }
        }
        
        if (storedSupportiveMessages) {
          try {
            const parsed = JSON.parse(storedSupportiveMessages);
            // Validate that parsed data is an array
            if (Array.isArray(parsed)) {
              // Always use the latest initial message and append any additional messages
              if (parsed.length === 0 || parsed[0].id !== "welcome-supportive") {
                setSupportiveMessages([STEADY_EDDIE_INITIAL_MESSAGE, ...parsed]);
              } else {
                // Replace the first message with the latest initial message
                setSupportiveMessages([STEADY_EDDIE_INITIAL_MESSAGE, ...parsed.slice(1)]);
              }
            } else {
              console.warn('[Chat Store] Invalid supportive messages format, using defaults');
              setSupportiveMessages([STEADY_EDDIE_INITIAL_MESSAGE]);
            }
          } catch (error) {
            console.error('[Chat Store] Failed to parse supportive messages:', error);
            setSupportiveMessages([STEADY_EDDIE_INITIAL_MESSAGE]);
          }
        }
        
        if (storedGraceMessages) {
          try {
            const parsed = JSON.parse(storedGraceMessages);
            // Validate that parsed data is an array
            if (Array.isArray(parsed)) {
              // Always use the latest initial message and append any additional messages
              if (parsed.length === 0 || parsed[0].id !== "welcome-grace") {
                setGraceMessages([GENTLE_GRACE_INITIAL_MESSAGE, ...parsed]);
              } else {
                // Replace the first message with the latest initial message
                setGraceMessages([GENTLE_GRACE_INITIAL_MESSAGE, ...parsed.slice(1)]);
              }
            } else {
              console.warn('[Chat Store] Invalid grace messages format, using defaults');
              setGraceMessages([GENTLE_GRACE_INITIAL_MESSAGE]);
            }
          } catch (error) {
            console.error('[Chat Store] Failed to parse grace messages:', error);
            setGraceMessages([GENTLE_GRACE_INITIAL_MESSAGE]);
          }
        }

        if (storedCowboyMessages) {
          try {
            const parsed = JSON.parse(storedCowboyMessages);
            if (Array.isArray(parsed)) {
              if (parsed.length === 0 || parsed[0].id !== "welcome-cowboy") {
                setCowboyMessages([COWBOY_PETE_INITIAL_MESSAGE, ...parsed]);
              } else {
                setCowboyMessages([COWBOY_PETE_INITIAL_MESSAGE, ...parsed.slice(1)]);
              }
            } else {
              console.warn('[Chat Store] Invalid cowboy messages format, using defaults');
              setCowboyMessages([COWBOY_PETE_INITIAL_MESSAGE]);
            }
          } catch (error) {
            console.error('[Chat Store] Failed to parse cowboy messages:', error);
            setCowboyMessages([COWBOY_PETE_INITIAL_MESSAGE]);
          }
        }

        if (storedSallyMessages) {
          try {
            const parsed = JSON.parse(storedSallyMessages);
            if (Array.isArray(parsed)) {
              if (parsed.length === 0 || parsed[0].id !== "welcome-sally") {
                setSallyMessages([CO_SIGN_SALLY_INITIAL_MESSAGE, ...parsed]);
              } else {
                setSallyMessages([CO_SIGN_SALLY_INITIAL_MESSAGE, ...parsed.slice(1)]);
              }
            } else {
              console.warn('[Chat Store] Invalid sally messages format, using defaults');
              setSallyMessages([CO_SIGN_SALLY_INITIAL_MESSAGE]);
            }
          } catch (error) {
            console.error('[Chat Store] Failed to parse sally messages:', error);
            setSallyMessages([CO_SIGN_SALLY_INITIAL_MESSAGE]);
          }
        }

        if (storedFreshMessages) {
          try {
            const parsed = JSON.parse(storedFreshMessages);
            if (Array.isArray(parsed)) {
              if (parsed.length === 0 || parsed[0].id !== "welcome-fresh") {
                setFreshMessages([FRESH_FREDDIE_INITIAL_MESSAGE, ...parsed]);
              } else {
                setFreshMessages([FRESH_FREDDIE_INITIAL_MESSAGE, ...parsed.slice(1)]);
              }
            } else {
              console.warn('[Chat Store] Invalid fresh messages format, using defaults');
              setFreshMessages([FRESH_FREDDIE_INITIAL_MESSAGE]);
            }
          } catch (error) {
            console.error('[Chat Store] Failed to parse fresh messages:', error);
            setFreshMessages([FRESH_FREDDIE_INITIAL_MESSAGE]);
          }
        }

        if (storedMamaJoMessages) {
          try {
            const parsed = JSON.parse(storedMamaJoMessages);
            if (Array.isArray(parsed)) {
              if (parsed.length === 0 || parsed[0].id !== "welcome-mama-jo") {
                setMamaJoMessages([MAMA_JO_INITIAL_MESSAGE, ...parsed]);
              } else {
                setMamaJoMessages([MAMA_JO_INITIAL_MESSAGE, ...parsed.slice(1)]);
              }
            } else {
              console.warn('[Chat Store] Invalid mama-jo messages format, using defaults');
              setMamaJoMessages([MAMA_JO_INITIAL_MESSAGE]);
            }
          } catch (error) {
            console.error('[Chat Store] Failed to parse mama-jo messages:', error);
            setMamaJoMessages([MAMA_JO_INITIAL_MESSAGE]);
          }
        }
        
        // Mark loading as complete to enable saving
        setHasLoadedFromStorage(true);
      } catch (error) {
        console.error("Error loading messages:", error);
        // Still mark as loaded so new messages can be saved
        setHasLoadedFromStorage(true);
      }
    };
    
    loadData();
  }, []);

  // Save messages to storage whenever they change (but only after initial load)
  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-messages-salty", JSON.stringify(saltyMessages));
      } catch (error) {
        console.error("Error saving Salty Sam messages:", error);
      }
    };
    
    if (saltyMessages.length > 0) {
      saveMessages();
    }
  }, [saltyMessages, hasLoadedFromStorage]);

  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-messages-supportive", JSON.stringify(supportiveMessages));
      } catch (error) {
        console.error("Error saving Steady Eddie messages:", error);
      }
    };
    
    if (supportiveMessages.length > 0) {
      saveMessages();
    }
  }, [supportiveMessages, hasLoadedFromStorage]);

  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-messages-grace", JSON.stringify(graceMessages));
      } catch (error) {
        console.error("Error saving Gentle Grace messages:", error);
      }
    };
    
    if (graceMessages.length > 0) {
      saveMessages();
    }
  }, [graceMessages, hasLoadedFromStorage]);

  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-messages-salty-v2", JSON.stringify(saltyV2Messages));
      } catch (error) {
        console.error("Error saving Salty Sam 2 messages:", error);
      }
    };

    if (saltyV2Messages.length > 0) {
      saveMessages();
    }
  }, [saltyV2Messages, hasLoadedFromStorage]);

  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-messages-supportive-v2", JSON.stringify(supportiveV2Messages));
      } catch (error) {
        console.error("Error saving Steady Eddie 2 messages:", error);
      }
    };

    if (supportiveV2Messages.length > 0) {
      saveMessages();
    }
  }, [supportiveV2Messages, hasLoadedFromStorage]);

  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-messages-grace-v2", JSON.stringify(graceV2Messages));
      } catch (error) {
        console.error("Error saving Gentle Grace 2 messages:", error);
      }
    };

    if (graceV2Messages.length > 0) {
      saveMessages();
    }
  }, [graceV2Messages, hasLoadedFromStorage]);

  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-messages-cowboy", JSON.stringify(cowboyMessages));
      } catch (error) {
        console.error("Error saving Cowboy Pete messages:", error);
      }
    };
    
    if (cowboyMessages.length > 0) {
      saveMessages();
    }
  }, [cowboyMessages, hasLoadedFromStorage]);

  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-messages-sally", JSON.stringify(sallyMessages));
      } catch (error) {
        console.error("Error saving Co-Sign Sally messages:", error);
      }
    };
    
    if (sallyMessages.length > 0) {
      saveMessages();
    }
  }, [sallyMessages, hasLoadedFromStorage]);

  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-messages-fresh", JSON.stringify(freshMessages));
      } catch (error) {
        console.error("Error saving Fresh Freddie messages:", error);
      }
    };
    
    if (freshMessages.length > 0) {
      saveMessages();
    }
  }, [freshMessages, hasLoadedFromStorage]);

  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-messages-mama-jo", JSON.stringify(mamaJoMessages));
      } catch (error) {
        console.error("Error saving Mama Jo messages:", error);
      }
    };
    
    if (mamaJoMessages.length > 0) {
      saveMessages();
    }
  }, [mamaJoMessages, hasLoadedFromStorage]);

  // Save sponsor type preference
  useEffect(() => {
    const saveSponsorType = async () => {
      try {
        await AsyncStorage.setItem("aa-chat-sponsor-type", sponsorType);
      } catch (error) {
        console.error("Error saving sponsor type:", error);
      }
    };
    
    saveSponsorType();
  }, [sponsorType]);

  const changeSponsor = (type: SponsorType) => {
    setSponsorType(type);
  };

  const getSponsorMessages = (type: SponsorType): ChatMessage[] => {
    switch (type) {
      case "salty": return saltyMessages;
      case "supportive": return supportiveMessages;
      case "grace": return graceMessages;
      case "salty-v2": return saltyV2Messages;
      case "supportive-v2": return supportiveV2Messages;
      case "grace-v2": return graceV2Messages;
      case "cowboy-pete": return cowboyMessages;
      case "co-sign-sally": return sallyMessages;
      case "fresh": return freshMessages;
      case "mama-jo": return mamaJoMessages;
      default: return supportiveMessages;
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: Date.now(),
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    
    // Check for crisis triggers before sending to AI using centralized detection
    const { type: crisisType, matchedTrigger } = detectCrisis(text);
    
    if (crisisType) {
      console.log(`Crisis detected: ${crisisType}, matched trigger: "${matchedTrigger}"`);
      
      // Capture current sponsor type and messages to avoid closure issues
      const currentSponsorType = sponsorType;
      const currentMessages = [...updatedMessages];
      
      // Add a short wait time to simulate AI sponsor thinking (500-1000ms)
      const waitTime = 500 + Math.random() * 500; // Random between 500-1000ms
      
      setTimeout(() => {
        let responseText = '';
        
        if (crisisType === 'violence') {
          responseText = crisisResponses.violence.all;
        } else if (crisisType === 'selfHarm') {
          switch (currentSponsorType) {
            case 'salty':
            case 'salty-v2':
              responseText = crisisResponses.selfHarm['Salty Sam'];
              break;
            case 'supportive':
            case 'supportive-v2':
              responseText = crisisResponses.selfHarm['Steady Eddie'];
              break;
            case 'grace':
            case 'grace-v2':
              responseText = crisisResponses.selfHarm['Gentle Grace'];
              break;
            default:
              responseText = crisisResponses.selfHarm['Steady Eddie'];
          }
        }
        
        const crisisResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sender: 'bot',
          timestamp: Date.now() + 1,
        };
        
        // Use the captured messages to avoid state inconsistencies
        const finalMessages = [...currentMessages, crisisResponse];
        setMessages(finalMessages);
        setIsLoading(false);
      }, waitTime);
      
      return;
    }
    
    try {
      // Model selector removed — chat is pinned to the Rork backend (callAI)
      // while gathering utilization data. callSponsorAPI + the engine/temperature
      // settings (lib/sponsorApiSettings) are kept in place to re-enable the
      // selector later; no path currently routes to the paid Supabase function.
      const result = {
        text: await callAI(convertToAPIMessages(updatedMessages, sponsorType)),
        model: "rork" as string | undefined,
        temperature: undefined as number | undefined,
      };

      // Add bot response
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: result.text,
        model: result.model,
        temperature: result.temperature,
        sender: "bot",
        timestamp: Date.now() + 1,
      };
      
      setMessages([...updatedMessages, botResponse]);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Fallback response based on sponsor type
      let errorMessage = "";
      
      switch (sponsorType) {
        case "salty":
          errorMessage = "Something's all screwed up with my connection, but let me tell you this - when in doubt, get your ass to a meeting. That's always the right damn answer.";
          break;
        case "supportive":
          errorMessage = "I'm sorry, I'm having some connection issues right now. While we wait, remember that connecting with others at a meeting is always helpful for your recovery.";
          break;
        case "grace":
          errorMessage = "I'm having some connection troubles right now, but sometimes these pauses give us a chance to take a breath and reconnect. Maybe this is a gentle reminder to reach out to your sponsor or attend a meeting. The fellowship is always there for you, and I'll be here when we can connect again.";
          break;
        case "salty-v2":
          errorMessage = "Something's jammed up with this test backend. That's annoying, but it doesn't change the work. Hit a meeting, call somebody, and don't let a busted connection become an excuse.";
          break;
        case "supportive-v2":
          errorMessage = "I'm having trouble reaching the test sponsor backend right now. While that gets sorted out, it may help to connect with a meeting or another sober person today.";
          break;
        case "grace-v2":
          errorMessage = "The test connection is having trouble right now. Take a breath and remember that support is still available through your fellowship, your sponsor, and the next right action.";
          break;
      }
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        sender: "bot",
        timestamp: Date.now() + 1,
      };
      
      setMessages([...updatedMessages, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      switch (sponsorType) {
        case "salty":
          await AsyncStorage.removeItem("aa-chat-messages-salty");
          setSaltyMessages([SALTY_SAM_INITIAL_MESSAGE]);
          break;
        case "supportive":
          await AsyncStorage.removeItem("aa-chat-messages-supportive");
          setSupportiveMessages([STEADY_EDDIE_INITIAL_MESSAGE]);
          break;
        case "grace":
          await AsyncStorage.removeItem("aa-chat-messages-grace");
          setGraceMessages([GENTLE_GRACE_INITIAL_MESSAGE]);
          break;
        case "salty-v2":
          await AsyncStorage.removeItem("aa-chat-messages-salty-v2");
          setSaltyV2Messages([{ ...SALTY_SAM_INITIAL_MESSAGE, id: "welcome-salty-v2" }]);
          break;
        case "supportive-v2":
          await AsyncStorage.removeItem("aa-chat-messages-supportive-v2");
          setSupportiveV2Messages([{ ...STEADY_EDDIE_INITIAL_MESSAGE, id: "welcome-supportive-v2" }]);
          break;
        case "grace-v2":
          await AsyncStorage.removeItem("aa-chat-messages-grace-v2");
          setGraceV2Messages([{ ...GENTLE_GRACE_INITIAL_MESSAGE, id: "welcome-grace-v2" }]);
          break;
        case "cowboy-pete":
          await AsyncStorage.removeItem("aa-chat-messages-cowboy");
          setCowboyMessages([COWBOY_PETE_INITIAL_MESSAGE]);
          break;
        case "co-sign-sally":
          await AsyncStorage.removeItem("aa-chat-messages-sally");
          setSallyMessages([CO_SIGN_SALLY_INITIAL_MESSAGE]);
          break;
        case "fresh":
          await AsyncStorage.removeItem("aa-chat-messages-fresh");
          setFreshMessages([FRESH_FREDDIE_INITIAL_MESSAGE]);
          break;
        case "mama-jo":
          await AsyncStorage.removeItem("aa-chat-messages-mama-jo");
          setMamaJoMessages([MAMA_JO_INITIAL_MESSAGE]);
          break;
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  return {
    messages,
    isLoading,
    hasLoadedFromStorage,
    sendMessage,
    clearChat,
    sponsorType,
    changeSponsor,
    getSponsorMessages,
  };
});
