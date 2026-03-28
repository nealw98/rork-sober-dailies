import React from 'react';
import { Text, TextProps } from 'react-native';

interface ChatMarkdownRendererProps extends TextProps {
  content: string;
}

// Very small markdown renderer for chat bubbles (supports bold: **text** and italics: *text*)
export const ChatMarkdownRenderer: React.FC<ChatMarkdownRendererProps> = ({ content, style, ...rest }) => {
  if (!content) {
    return <Text style={style} {...rest} />;
  }

  const parts: Array<{ text: string; bold: boolean; italic: boolean }> = [];
  // Match **bold** and *italic* - must check bold first to avoid matching ** as two separate italics
  const markdownRegex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markdownRegex.exec(content)) !== null) {
    // Add regular text before match
    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index), bold: false, italic: false });
    }
    
    // Add formatted text
    const matchedText = match[0];
    if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      // Bold
      parts.push({ text: matchedText.slice(2, -2), bold: true, italic: false });
    } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
      // Italic
      parts.push({ text: matchedText.slice(1, -1), bold: false, italic: true });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), bold: false, italic: false });
  }

  // If no parts were found (no valid markdown), return the original text
  if (parts.length === 0) {
    return <Text style={style} {...rest}>{content}</Text>;
  }
  
  return (
    <Text style={style} {...rest}>
      {parts.map((p, idx) => (
        <Text 
          key={idx} 
          style={[
            p.bold && { fontWeight: 'bold' },
            p.italic && { fontStyle: 'italic' }
          ]}
        >
          {p.text}
        </Text>
      ))}
    </Text>
  );
};

export default ChatMarkdownRenderer;


