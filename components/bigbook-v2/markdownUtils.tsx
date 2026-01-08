import React from 'react';
import { Text } from 'react-native';

/**
 * Parse text with markdown italics (*text* or _text_) and return React Native Text components
 */
export function parseMarkdownItalics(text: string, key: string | number): React.ReactNode {
  if (!text) return text;

  const parts: Array<{ text: string; italic: boolean }> = [];
  // Support both asterisks and underscores for italics
  const italicRegex = /(\*([^*]+)\*|_([^_]+)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = italicRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), italic: false });
    }
    // match[2] is the content from asterisks, match[3] is from underscores
    parts.push({ text: match[2] || match[3], italic: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), italic: false });
  }

  // If no parts were found (no valid markdown), return the original text
  if (parts.length === 0) {
    return text;
  }

  // Return array of Text components for italic parts, strings for regular parts
  return parts.map((part, idx) => 
    part.italic ? (
      <Text key={`${key}-${idx}`} style={{ fontStyle: 'italic' }}>
        {part.text}
      </Text>
    ) : (
      part.text
    )
  );
}

