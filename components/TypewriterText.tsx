import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Text, TextStyle, StyleProp, Animated } from 'react-native';
import { useFonts, Quantico_400Regular } from '@expo-google-fonts/quantico';

export type TypewriterMode = 'character' | 'word' | 'chunk';

interface TypewriterTextProps {
  text: string;
  mode?: TypewriterMode;
  onComplete?: () => void;
  speed?: number;
  isFirstMessage?: boolean;
  style?: StyleProp<TextStyle>;
  shouldAnimate?: boolean; // If false, display instantly (for chat history)
}

// Default speeds in milliseconds
const DEFAULT_SPEEDS = {
  character: 15,  // Faster initial typing
  word: 50,
  chunk: 80,
};

// Word count threshold for auto-switching to chunk mode
const CHUNK_MODE_THRESHOLD = 100;

// Chunk size (words per chunk)
const CHUNK_SIZE = 4;

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  mode: propMode,
  onComplete,
  speed: propSpeed,
  isFirstMessage = false,
  style,
  shouldAnimate = true,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<number | null>(null);
  const cursorAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Load Quantico font
  const [fontsLoaded] = useFonts({
    Quantico_400Regular,
  });

  // Determine the actual mode to use
  const getEffectiveMode = useCallback((): TypewriterMode => {
    if (isFirstMessage) return 'character';
    if (propMode) return propMode;
    
    // Auto-detect based on word count
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > CHUNK_MODE_THRESHOLD) return 'chunk';
    
    return 'word';
  }, [isFirstMessage, propMode, text]);

  const effectiveMode = getEffectiveMode();
  const effectiveSpeed = propSpeed ?? DEFAULT_SPEEDS[effectiveMode];

  // Split text into units based on mode
  const getTextUnits = useCallback((): string[] => {
    if (effectiveMode === 'character') {
      return text.split('');
    } else if (effectiveMode === 'word') {
      // Split by spaces but preserve the spaces
      const words: string[] = [];
      const matches = text.match(/\S+\s*/g) || [];
      return matches;
    } else {
      // Chunk mode: groups of CHUNK_SIZE words
      const wordMatches = text.match(/\S+\s*/g) || [];
      const chunks: string[] = [];
      for (let i = 0; i < wordMatches.length; i += CHUNK_SIZE) {
        chunks.push(wordMatches.slice(i, i + CHUNK_SIZE).join(''));
      }
      return chunks;
    }
  }, [text, effectiveMode]);

  // Cursor blinking animation
  useEffect(() => {
    if (isTyping && shouldAnimate) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      cursorAnimationRef.current = blink;
      blink.start();

      return () => {
        blink.stop();
      };
    } else {
      cursorOpacity.setValue(1);
    }
  }, [isTyping, shouldAnimate, cursorOpacity]);

  // Main typing animation
  useEffect(() => {
    // If not animating, show full text immediately
    if (!shouldAnimate) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // Reset state for new text
    setDisplayedText('');
    setIsTyping(true);

    const units = getTextUnits();
    let currentIndex = 0;

    const typeNext = () => {
      if (currentIndex < units.length) {
        setDisplayedText(prev => prev + units[currentIndex]);
        currentIndex++;
        animationRef.current = setTimeout(typeNext, effectiveSpeed) as unknown as number;
      } else {
        setIsTyping(false);
        onComplete?.();
      }
    };

    // Start typing with a small initial delay
    animationRef.current = setTimeout(typeNext, 100) as unknown as number;

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [text, shouldAnimate, effectiveSpeed, getTextUnits, onComplete]);

  // If fonts aren't loaded yet, show text without custom font
  // Quantico has larger line height, so normalize it to match system font
  const fontFamily = fontsLoaded ? 'Quantico_400Regular' : undefined;
  const fontSize = (style as any)?.fontSize || 18;
  const lineHeight = fontsLoaded ? fontSize * 1.3 : undefined;

  return (
    <Text style={[style, fontFamily ? { fontFamily, lineHeight } : undefined]}>
      {displayedText}
      {isTyping && shouldAnimate && (
        <Animated.Text style={{ opacity: cursorOpacity }}>_</Animated.Text>
      )}
    </Text>
  );
};

export default TypewriterText;

