import React from 'react';
import { Text, TextProps } from 'react-native';

interface ChatMarkdownRendererProps extends TextProps {
  content: string;
}

// Very small markdown renderer for chat bubbles (supports italics: *text*)
export const ChatMarkdownRenderer: React.FC<ChatMarkdownRendererProps> = ({ content, style, ...rest }) => {
  if (!content) {
    return <Text style={style} {...rest} />;
  }


  const parts: Array<{ text: string; italic: boolean }> = [];
  const italicRegex = /\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = italicRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index), italic: false });
    }
    parts.push({ text: match[1], italic: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), italic: false });
  }

  // If no parts were found (no valid markdown), return the original text
  if (parts.length === 0) {
    return <Text style={style} {...rest}>{content}</Text>;
  }
  return (
    <Text style={style} {...rest}>
      {parts.map((p, idx) => (
        <Text key={idx} style={p.italic ? { fontStyle: 'italic' } : undefined}>
          {p.text}
        </Text>
      ))}
    </Text>
  );
};

export default ChatMarkdownRenderer;


