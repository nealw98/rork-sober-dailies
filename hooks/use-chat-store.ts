import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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



// Type for API message format
interface APIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Function to call the AI API
async function callAI(messages: APIMessage[]): Promise<string> {
  try {
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.completion || "Sorry, I'm having trouble right now. Try again in a minute.";
  } catch (error) {
    console.error('AI API Error:', error);
    return "I'm having trouble connecting right now. Please try again in a moment, or consider reaching out to a meeting or another member of your support network.";
  }
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
    default:
      systemPrompt = STEADY_EDDIE_SYSTEM_PROMPT;
  }
  
  const apiMessages: APIMessage[] = [
    { role: 'system', content: systemPrompt }
  ];

  // Skip the initial welcome message and convert the rest
  const conversationMessages = chatMessages.slice(1);
  
  conversationMessages.forEach(msg => {
    if (msg.sender === 'user') {
      apiMessages.push({ role: 'user', content: msg.text });
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Get current messages based on selected sponsor
  const messages = (() => {
    switch (sponsorType) {
      case "salty": return saltyMessages;
      case "supportive": return supportiveMessages;
      case "grace": return graceMessages;
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
          storedSponsorType
        ] = await Promise.all([
          AsyncStorage.getItem("aa-chat-messages-salty"),
          AsyncStorage.getItem("aa-chat-messages-supportive"),
          AsyncStorage.getItem("aa-chat-messages-grace"),
          AsyncStorage.getItem("aa-chat-sponsor-type")
        ]);
        
        if (storedSponsorType) {
          setSponsorType(storedSponsorType as SponsorType);
        }
        
        if (storedSaltyMessages) {
          const parsed = JSON.parse(storedSaltyMessages);
          // Always use the latest initial message and append any additional messages
          if (parsed.length === 0 || parsed[0].id !== "welcome-salty") {
            setSaltyMessages([SALTY_SAM_INITIAL_MESSAGE, ...parsed]);
          } else {
            // Replace the first message with the latest initial message
            setSaltyMessages([SALTY_SAM_INITIAL_MESSAGE, ...parsed.slice(1)]);
          }
        }
        
        if (storedSupportiveMessages) {
          const parsed = JSON.parse(storedSupportiveMessages);
          // Always use the latest initial message and append any additional messages
          if (parsed.length === 0 || parsed[0].id !== "welcome-supportive") {
            setSupportiveMessages([STEADY_EDDIE_INITIAL_MESSAGE, ...parsed]);
          } else {
            // Replace the first message with the latest initial message
            setSupportiveMessages([STEADY_EDDIE_INITIAL_MESSAGE, ...parsed.slice(1)]);
          }
        }
        
        if (storedGraceMessages) {
          const parsed = JSON.parse(storedGraceMessages);
          // Always use the latest initial message and append any additional messages
          if (parsed.length === 0 || parsed[0].id !== "welcome-grace") {
            setGraceMessages([GENTLE_GRACE_INITIAL_MESSAGE, ...parsed]);
          } else {
            // Replace the first message with the latest initial message
            setGraceMessages([GENTLE_GRACE_INITIAL_MESSAGE, ...parsed.slice(1)]);
          }
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };
    
    loadData();
  }, []);

  // Save messages to storage whenever they change
  useEffect(() => {
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
  }, [saltyMessages]);

  useEffect(() => {
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
  }, [supportiveMessages]);

  useEffect(() => {
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
  }, [graceMessages]);

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
              responseText = crisisResponses.selfHarm['Salty Sam'];
              break;
            case 'supportive':
              responseText = crisisResponses.selfHarm['Steady Eddie'];
              break;
            case 'grace':
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
      // Prepare messages for API call
      const apiMessages = convertToAPIMessages(updatedMessages, sponsorType);
      
      // Call AI API
      const response = await callAI(apiMessages);
      
      // Add bot response
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
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
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    sponsorType,
    changeSponsor,
  };
});