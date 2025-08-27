import React, { useRef } from 'react';
import { Text, StyleSheet, View } from 'react-native';

interface CustomTextRendererProps {
  content: string;
  searchTerm?: string;
  style?: any;
  onPageRef?: (pageNumber: number, ref: View | null) => void;
}

// Type definitions for markdown parts
type TextPart = {
  type: 'text';
  text: string;
  italic: boolean;
};

type TablePart = {
  type: 'table';
  headers: string[];
  data: string[][];
};

type MarkdownPart = TextPart | TablePart;

export const CustomTextRenderer: React.FC<CustomTextRendererProps> = ({
  content,
  searchTerm,
  style,
  onPageRef
}) => {
  // Clean and format content
  const cleanContent = content
    .replace(/<div[^>]*data-page[^>]*>.*?<\/div>/g, '')
    .replace(/<div[^>]*>/g, '')
    .replace(/<\/div>/g, '')
    .replace(/\s*style="[^"]*"/g, '')
    .replace(/\s*data-page="[^"]*"/g, '')
    // Keep page numbers as they are now (already in correct format: *— Page X —*)
    // Remove chapter titles and subheadings since they're in the header
    .replace(/^#{1,6}\s*[A-Za-z0-9][A-Za-z0-9\s':,-]+$/gm, '') // More comprehensive header removal
    .replace(/^#{1,6}\s*HOW IT WORKS$/gm, '') // Specific removal for "HOW IT WORKS"
    .replace(/^#{1,6}\s*Chapter \d+.*$/gm, '') // Remove "Chapter X" lines
    // Remove excessive line breaks around headers and page numbers
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace triple+ line breaks with double
    .replace(/(#{1,6}[^\n]+)\n\s*\n\s*\n/g, '$1\n\n') // After headers
    .replace(/(\*— Page \d+ —\*)\n\s*\n\s*\n/g, '$1\n\n') // After page numbers
    .trim();

  // Split content by page markers and reorganize to show page numbers at top
  const sections = cleanContent.split(/(\*— Page (?:\d+|\w+) —\*)/);
  
  // Group content by pages
  const pages: Array<{ pageNumber?: number; content: string; pageNumStr?: string }> = [];
  let currentPage: { pageNumber?: number; content: string; pageNumStr?: string } = { content: '' };
  
  sections.forEach((section) => {
    const pageMarkerMatch = section.match(/\*— Page (\d+|\w+) —\*/);
    if (pageMarkerMatch) {
      // Save current page if it has content
      if (currentPage.content.trim()) {
        pages.push(currentPage);
      }
      // Start new page
      const pageNumStr = pageMarkerMatch[1];
      // For Roman numerals, we'll use a special marker (negative numbers)
      // This is a hack to distinguish Roman from Arabic numerals
      const pageNumber = isNaN(parseInt(pageNumStr, 10)) ? -1 : parseInt(pageNumStr, 10);
      currentPage = { 
        pageNumber: pageNumber, 
        content: '',
        pageNumStr: pageNumStr // Store original string for display
      };
    } else if (section.trim()) {
      currentPage.content += section;
    }
  });
  
  // Add final page
  if (currentPage.content.trim() || currentPage.pageNumber) {
    pages.push(currentPage);
  }

  return (
    <View>
      {pages.map((page, pageIndex) => (
        <View key={`page-${pageIndex}`}>
          {/* Page number at top if exists */}
          {page.pageNumber && (
            <View>
              {/* Invisible anchor for scrolling */}
              <View
                ref={(ref) => {
                  console.log('📍 CustomTextRenderer: Setting page ref for page', page.pageNumber, ref ? 'SUCCESS' : 'NULL');
                  onPageRef?.(page.pageNumber!, ref);
                }}
                style={{ height: 1, opacity: 0 }}
              />
              <Text style={[getPageMarkerStyle(page.pageNumber), style]}>
                — Page {page.pageNumStr || page.pageNumber} —
              </Text>
            </View>
          )}
          
          {/* Page content */}
          {page.content.trim() && (
            <PageContent 
              content={page.content.trim()}
              searchTerm={searchTerm}
              style={style}
              pageIndex={pageIndex}
            />
          )}
        </View>
      ))}
    </View>
  );
};

// Helper function to determine page marker style based on page number type
const getPageMarkerStyle = (pageNumber: number) => {
  // Roman numerals are typically used for preface/front matter (low numbers)
  // Arabic numerals for main chapters (higher numbers)
  const isRomanNumeral = pageNumber < 50; // Adjust this threshold as needed
  
  return isRomanNumeral ? styles.pageMarkerRoman : styles.pageMarkerArabic;
};

// Helper function to render markdown parts without unwanted paragraph breaks
const renderMarkdownParts = (markdownParts: MarkdownPart[], pageIndex: number, headerStyle: any, style: any) => {
  const elements: React.ReactNode[] = [];
  let currentTextParts: TextPart[] = [];
  
  markdownParts.forEach((part, partIndex) => {
    if (part.type === 'table') {
      // If we have accumulated text parts, render them as a single paragraph
      if (currentTextParts.length > 0) {
        elements.push(
          <Text key={`page-${pageIndex}-text-${elements.length}`} style={[headerStyle, style]}>
            {currentTextParts.map((textPart, textIndex) => (
              textPart.italic ? (
                <Text key={textIndex} style={styles.italicText}>{textPart.text}</Text>
              ) : (
                textPart.text
              )
            ))}
          </Text>
        );
        currentTextParts = [];
      }
      
      // Render the table
      elements.push(
        <View key={`page-${pageIndex}-table-${partIndex}`} style={styles.tableContainer}>
          <View style={styles.tableRow}>
            {part.headers.map((header: string, headerIndex: number) => (
              <View key={headerIndex} style={styles.tableHeaderCell}>
                <Text style={styles.tableHeaderText}>{header}</Text>
              </View>
            ))}
          </View>
          {part.data.map((row: string[], rowIndex: number) => (
            <View key={rowIndex} style={styles.tableRow}>
              {row.map((cell: string, cellIndex: number) => (
                <View key={cellIndex} style={styles.tableCell}>
                  <Text style={styles.tableCellText}>{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    } else {
      // Accumulate text parts
      currentTextParts.push(part);
    }
  });
  
  // Render any remaining text parts as a single paragraph
  if (currentTextParts.length > 0) {
    elements.push(
      <Text key={`page-${pageIndex}-text-${elements.length}`} style={[headerStyle, style]}>
        {currentTextParts.map((textPart, textIndex) => (
          textPart.italic ? (
            <Text key={textIndex} style={styles.italicText}>{textPart.text}</Text>
          ) : (
            textPart.text
          )
        ))}
      </Text>
    );
  }
  
  return elements;
};

// Helper component to render page content
const PageContent: React.FC<{
  content: string;
  searchTerm?: string;
  style?: any;
  pageIndex: number;
}> = ({ content, searchTerm, style, pageIndex }) => {
  // Check if this content is a standalone header line
  const isHeader = /^#{1,6}\s*[^\n]*$/.test(content) && !content.includes('\n\n');
  const headerStyle = isHeader ? styles.headerText : styles.baseText;

  // Parse markdown content
  const markdownParts = parseMarkdown(content);

  // If no search term, render markdown
  if (!searchTerm) {
    return (
      <View>
        {renderMarkdownParts(markdownParts, pageIndex, headerStyle, style)}
      </View>
    );
  }

  // Handle search highlighting with markdown
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
  
  // Find all matches first
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0]
    });
  }
  
  if (matches.length === 0) {
    // No matches, but still render markdown
    return (
      <View>
        {renderMarkdownParts(markdownParts, pageIndex, headerStyle, style)}
      </View>
    );
  }

  // Build blocks for rendering: text blocks with highlights, table blocks as views
  const blocks: React.ReactNode[] = [];
  const markdownPartsForHighlighting = parseMarkdown(content);
  markdownPartsForHighlighting.forEach((part, partIndex) => {
    if (part.type === 'table') {
      // Render table block with cell highlighting
      blocks.push(
        <View key={`page-${pageIndex}-table-${partIndex}`} style={styles.tableContainer}>
          <View style={styles.tableRow}>
            {part.headers.map((header: string, headerIndex: number) => (
              <View key={headerIndex} style={styles.tableHeaderCell}>
                <Text style={styles.tableHeaderText}>{header}</Text>
              </View>
            ))}
          </View>
          {part.data.map((row: string[], rowIndex: number) => (
            <View key={rowIndex} style={styles.tableRow}>
              {row.map((cell: string, cellIndex: number) => {
                let highlightCell = false;
                if (searchTerm && cell.toLowerCase().includes(searchTerm.toLowerCase())) {
                  highlightCell = true;
                }
                return (
                  <View key={cellIndex} style={[styles.tableCell, highlightCell && styles.tableCellHighlight]}>
                    <Text style={styles.tableCellText}>{cell}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      );
    } else {
      // For text blocks, apply highlighting (unchanged)
      const text = part.text;
      if (!searchTerm) {
        blocks.push(
          <Text key={`page-${pageIndex}-text-${partIndex}`} style={[headerStyle, style, part.italic ? styles.italicText : undefined]}>
            {text}
          </Text>
        );
      } else {
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
        let match;
        let lastIdx = 0;
        const children: React.ReactNode[] = [];
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIdx) {
            children.push(text.slice(lastIdx, match.index));
          }
          children.push(
            <Text key={`highlight-${pageIndex}-${partIndex}-${lastIdx}`} style={styles.highlight}>
              {match[0]}
            </Text>
          );
          lastIdx = match.index + match[0].length;
        }
        if (lastIdx < text.length) {
          children.push(text.slice(lastIdx));
        }
        blocks.push(
          <Text key={`page-${pageIndex}-text-${partIndex}`} style={[headerStyle, style, part.italic ? styles.italicText : undefined]}>
            {children}
          </Text>
        );
      }
    }
  });

  return <View>{blocks}</View>;
};

// Parse markdown formatting including tables
const parseMarkdown = (text: string): MarkdownPart[] => {
  const parts: MarkdownPart[] = [];
  const lines = text.split('\n');
  let currentText = '';
  let inTable = false;
  let tableLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line is a table row (starts with | and contains at least one more |)
    const isTableRow = line.startsWith('|') && line.includes('|', 1);
    
    if (isTableRow) {
      // If we were collecting text, add it as a text part
      if (currentText.trim() && !inTable) {
        parts.push(...parseTextContent(currentText.trim()));
        currentText = '';
      }
      
      // Start or continue table
      inTable = true;
      tableLines.push(line);
    } else {
      // If we were in a table and this line is not a table row, end the table
      if (inTable) {
        if (tableLines.length > 0) {
          parts.push(...parseTable(tableLines.join('\n')));
          tableLines = [];
        }
        inTable = false;
      }
      
      // Add this line to current text
      if (currentText) {
        currentText += '\n' + line;
      } else {
        currentText = line;
      }
    }
  }
  
  // Handle any remaining content
  if (inTable && tableLines.length > 0) {
    parts.push(...parseTable(tableLines.join('\n')));
  }
  
  if (currentText.trim()) {
    parts.push(...parseTextContent(currentText.trim()));
  }
  
  return parts.length > 0 ? parts : [{ text, italic: false, type: 'text' }];
};

// Parse text content (for non-table text)
const parseTextContent = (text: string): TextPart[] => {
  const parts: TextPart[] = [];
  let currentIndex = 0;
  
  // Match *text* for italics
  const italicRegex = /\*([^*]+)\*/g;
  let match;
  
  while ((match = italicRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push({
        text: text.slice(currentIndex, match.index),
        italic: false,
        type: 'text'
      });
    }
    
    // Add the italic text
    parts.push({
      text: match[1],
      italic: true,
      type: 'text'
    });
    
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    parts.push({
      text: text.slice(currentIndex),
      italic: false,
      type: 'text'
    });
  }
  
  return parts.length > 0 ? parts : [{ text, italic: false, type: 'text' }];
};

// Parse markdown table
const parseTable = (tableText: string): MarkdownPart[] => {
  const lines = tableText.trim().split('\n');
  const tableData: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.includes('|', 1)) {
      // Remove leading pipe and split by pipe, then clean up each cell
      const cells = line.slice(1).split('|').map(cell => cell.trim());
      
      // Limit to 3 columns to prevent extra columns from malformed rows
      const limitedCells = cells.slice(0, 3);
      
      // If we have fewer than 3 cells, pad with empty strings
      while (limitedCells.length < 3) {
        limitedCells.push('');
      }
      
      tableData.push(limitedCells);
    }
  }
  
  if (tableData.length >= 2) {
    // First row is headers, second row is separator, rest are data
    const headers = tableData[0];
    const dataRows = tableData.slice(2); // Skip separator line
    
    return [{
      type: 'table',
      headers,
      data: dataRows
    }];
  }
  
  // Fallback to text if table parsing fails
  return [{ text: tableText, italic: false, type: 'text' }];
};

const styles = StyleSheet.create({
  baseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginVertical: 6,
  },
  headerText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333',
    fontWeight: 'bold',
    marginVertical: 8,
    marginTop: 16,
  },
  highlight: {
    backgroundColor: '#FFEB3B', // Bright yellow background
    color: '#000000', // Black text for contrast
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 3,
  },
  // Roman numeral pages (like Preface) - left aligned, italics
  pageMarkerRoman: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 0, // No space at top
  },
  // Arabic numeral pages (main chapters) - left aligned, italics
  pageMarkerArabic: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 0, // No space at top
  },
  italicText: {
    fontStyle: 'italic',
  },
  tableContainer: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'left',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  tableCellText: {
    fontSize: 14,
    textAlign: 'left',
  },
  tableCellHighlight: {
    backgroundColor: '#FFEB3B',
  },
});