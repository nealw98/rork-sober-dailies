import React, { useRef } from 'react';
import { Text, StyleSheet, View } from 'react-native';

interface CustomTextRendererProps {
  content: string;
  searchTerm?: string;
  style?: any;
  onPageRef?: (pageNumber: number, ref: View | null) => void;
}

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

  // If no search term, return simple text
  if (!searchTerm) {
    return (
      <Text style={[headerStyle, style]}>
        {content}
      </Text>
    );
  }

  // Debug logging for highlighting
  // console.log('🔍 CustomTextRenderer: Highlighting term:', searchTerm, 'in page', pageIndex);

  // Split content for highlighting - Fixed algorithm
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
  
  // console.log('🔍 CustomTextRenderer: Found', matches.length, 'matches for term:', searchTerm);
  
  if (matches.length === 0) {
    return (
      <Text style={[headerStyle, style]}>
        {content}
      </Text>
    );
  }

  // Build text with highlights
  const parts = [];
  let lastIndex = 0;
  
  matches.forEach((matchInfo, matchIndex) => {
    // Add text before the match
    if (matchInfo.start > lastIndex) {
      parts.push({
        text: content.slice(lastIndex, matchInfo.start),
        highlight: false
      });
    }
    
    // Add the highlighted match
    parts.push({
      text: matchInfo.text,
      highlight: true
    });
    
    // console.log('🟡 CustomTextRenderer: Will highlight:', matchInfo.text);
    
    lastIndex = matchInfo.end;
  });
  
  // Add remaining text after last match
  if (lastIndex < content.length) {
    parts.push({
      text: content.slice(lastIndex),
      highlight: false
    });
  }

  return (
    <Text style={[headerStyle, style]}>
      {parts.map((part, partIndex) => (
        <Text
          key={`page-${pageIndex}-part-${partIndex}`}
          style={part.highlight ? styles.highlight : undefined}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
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
    fontWeight: 'bold',
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
});