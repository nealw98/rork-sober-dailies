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
    // Remove chapter titles since they're in the header (matches like "# BILL'S STORY", "# Chapter 2", etc.)
    .replace(/^#{1,6}\s*[A-Za-z0-9][A-Za-z0-9\s']+$/gm, '')
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
                ref={(ref) => onPageRef?.(page.pageNumber!, ref)}
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

  // Split content for highlighting
  const regex = new RegExp(`\\b(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
  const parts = content.split(regex);

  return (
    <Text style={[headerStyle, style]}>
      {parts.map((part, partIndex) => {
        const isHighlight = regex.test(part);
        regex.lastIndex = 0; // Reset regex for next test
        
        return (
          <Text
            key={`page-${pageIndex}-part-${partIndex}`}
            style={isHighlight ? styles.highlight : undefined}
          >
            {part}
          </Text>
        );
      })}
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
    backgroundColor: '#ffeb3b',
    fontWeight: 'bold',
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