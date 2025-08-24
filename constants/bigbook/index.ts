// Big Book Enhanced Search System - 1st Edition
// Complete implementation with page-aware search and navigation

// Removed Node.js fs imports - not compatible with React Native

export interface BigBookTextContent {
  id: string;
  title: string;
  content: string;
  searchable: boolean;
  pageNumbers?: {
    start: number;
    end: number;
  };
  url?: string;
  description?: string;
}

export interface EnhancedSearchResult {
  id: string;
  title: string;
  pageNumber: string | number;
  pageNumberNumeric: number;
  excerpt: string;
  matchType: 'text' | 'page';
  matchContext: {
    before: string;
    match: string;
    after: string;
    position: number;
    length: number;
  };
  chapterInfo: {
    id: string;
    title: string;
  };
}

export interface NavigationResult {
  success: boolean;
  pageNumber: number;
  content: string;
  highlightedContent: string;
  scrollPosition?: number;
}

// Helper function to convert roman numerals to arabic
const romanToArabic = (roman: string): number => {
  if (/^\d+$/.test(roman)) {
    return parseInt(roman);
  }
  
  const romanValues: { [key: string]: number } = {
    'i': 1, 'v': 5, 'x': 10, 'l': 50, 'c': 100, 'd': 500, 'm': 1000
  };
  
  let result = 0;
  const lowerRoman = roman.toLowerCase();
  
  for (let i = 0; i < lowerRoman.length; i++) {
    const current = romanValues[lowerRoman[i]];
    const next = romanValues[lowerRoman[i + 1]];
    
    if (next && current < next) {
      result += next - current;
      i++;
    } else {
      result += current;
    }
  }
  
  return result;
};

// Extract all page numbers from content (both roman and arabic)
const extractAllPageNumbers = (content: string): Array<{page: string, numeric: number, position: number}> => {
  const pageMatches = [];
  const pageRegex = /\*— Page ([^—]+) —\*/g;
  let match;
  
  while ((match = pageRegex.exec(content)) !== null) {
    const pageStr = match[1].trim();
    const numeric = romanToArabic(pageStr);
    pageMatches.push({
      page: pageStr,
      numeric: numeric,
      position: match.index
    });
  }
  
  return pageMatches.sort((a, b) => a.numeric - b.numeric);
};

// Find the page number for a given text position
const findPageForTextPosition = (content: string, textPosition: number): {page: string, numeric: number} => {
  const pages = extractAllPageNumbers(content);
  
  // Find the page that contains this position
  let currentPage = pages[0] || {page: '1', numeric: 1};
  
  for (const page of pages) {
    if (page.position <= textPosition) {
      currentPage = page;
    } else {
      break;
    }
  }
  
  return currentPage;
};

// Use existing content.ts for React Native compatibility
// Testing 1st edition content
import { bigBookTextContent as firstEditionContent } from './content-1st-edition';

// Big Book text content (using existing content keys for compatibility)
export const bigBookTextContent: BigBookTextContent[] = [
  {
    id: 'foreword-first',
    title: 'Foreword to First Edition',
    content: '',
    searchable: true,
    pageNumbers: { start: 13, end: 14 }
  },
  {
    id: 'doctors-opinion',
    title: "The Doctor's Opinion",
    content: '',
    searchable: true,
    pageNumbers: { start: 25, end: 32 }
  },
  {
    id: 'chapter-1',
    title: "Bill's Story",
    content: '',
    searchable: true,
    pageNumbers: { start: 1, end: 16 }
  },
  {
    id: 'chapter-2',
    title: 'There Is a Solution',
    content: '',
    searchable: true,
    pageNumbers: { start: 17, end: 43 }
  },
  {
    id: 'chapter-3',
    title: 'More About Alcoholism',
    content: '',
    searchable: true,
    pageNumbers: { start: 44, end: 57 }
  },
  {
    id: 'chapter-4',
    title: 'We Agnostics',
    content: '',
    searchable: true,
    pageNumbers: { start: 58, end: 71 }
  },
  {
    id: 'chapter-5',
    title: 'How It Works',
    content: '',
    searchable: true,
    pageNumbers: { start: 72, end: 88 }
  },
  {
    id: 'chapter-6',
    title: 'Into Action',
    content: '',
    searchable: true,
    pageNumbers: { start: 89, end: 103 }
  },
  {
    id: 'chapter-7',
    title: 'Working with Others',
    content: '',
    searchable: true,
    pageNumbers: { start: 104, end: 122 }
  },
  {
    id: 'chapter-8',
    title: 'To Wives',
    content: '',
    searchable: true,
    pageNumbers: { start: 123, end: 135 }
  },
  {
    id: 'chapter-9',
    title: 'The Family Afterward',
    content: '',
    searchable: true,
    pageNumbers: { start: 136, end: 150 }
  },
  {
    id: 'chapter-10',
    title: 'To Employers',
    content: '',
    searchable: true,
    pageNumbers: { start: 151, end: 164 }
  },
  {
    id: 'chapter-11',
    title: 'A Vision for You',
    content: '',
    searchable: true,
    pageNumbers: { start: 151, end: 164 }
  },
  {
    id: 'appendix-1',
    title: 'Spiritual Experience',
    content: '',
    searchable: true,
    pageNumbers: { start: 567, end: 568 }
  }
];

// Load actual content into the text content objects
bigBookTextContent.forEach(item => {
  item.content = (firstEditionContent as any)[item.id] || '';
});

// Enhanced search function with whole word matching and page awareness
export const searchBigBookContentEnhanced = (
  searchTerm: string, 
  options: {
    caseSensitive?: boolean;
    wholeWordsOnly?: boolean;
    includePageNumbers?: boolean;
  } = {}
): EnhancedSearchResult[] => {
  const { caseSensitive = false, wholeWordsOnly = true, includePageNumbers = true } = options;
  
  if (!searchTerm.trim()) return [];
  
  const results: EnhancedSearchResult[] = [];
  const processedTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();
  
  // Create regex for whole word matching
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = wholeWordsOnly 
    ? new RegExp(`\\b${escapedTerm}\\b`, caseSensitive ? 'g' : 'gi')
    : new RegExp(escapedTerm, caseSensitive ? 'g' : 'gi');
  
  bigBookTextContent.forEach(chapter => {
    if (!chapter.searchable || !chapter.content) return;
    
    const content = chapter.content;
    let match;
    
    // Find all matches in this chapter
    while ((match = regex.exec(content)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;
      
      // Find which page this match is on
      const pageInfo = findPageForTextPosition(content, matchStart);
      
      // Extract context around the match (100 chars before and after)
      const contextStart = Math.max(0, matchStart - 100);
      const contextEnd = Math.min(content.length, matchEnd + 100);
      const fullContext = content.slice(contextStart, contextEnd);
      
      // Split context into before, match, and after
      const beforeMatch = content.slice(contextStart, matchStart);
      const matchText = content.slice(matchStart, matchEnd);
      const afterMatch = content.slice(matchEnd, contextEnd);
      
      // Clean up the excerpt (remove page markers for display)
      const excerpt = fullContext
        .replace(/\*— Page [^—]+ —\*/g, '')
        .replace(/\n{2,}/g, ' ')
        .trim();
      
      results.push({
        id: `${chapter.id}-${matchStart}`,
        title: chapter.title,
        pageNumber: pageInfo.page,
        pageNumberNumeric: pageInfo.numeric,
        excerpt,
        matchType: 'text',
        matchContext: {
          before: beforeMatch.slice(-50), // Last 50 chars before match
          match: matchText,
          after: afterMatch.slice(0, 50), // First 50 chars after match
          position: matchStart,
          length: match[0].length
        },
        chapterInfo: {
          id: chapter.id,
          title: chapter.title
        }
      });
    }
  });
  
  // Sort results by page number, then by position within page
  return results.sort((a, b) => {
    const pageComparison = a.pageNumberNumeric - b.pageNumberNumeric;
    if (pageComparison !== 0) return pageComparison;
    return a.matchContext.position - b.matchContext.position;
  });
};

// Navigate to specific page with highlighted search term
export const navigateToPageWithHighlight = (
  pageNumber: number | string,
  searchTerm?: string
): NavigationResult => {
  try {
    const targetPageNumeric = typeof pageNumber === 'string' ? romanToArabic(pageNumber) : pageNumber;
    
    // Find the chapter that contains this page
    let targetChapter: BigBookTextContent | null = null;
    
    for (const chapter of bigBookTextContent) {
      if (chapter.pageNumbers) {
        if (targetPageNumeric >= chapter.pageNumbers.start && targetPageNumeric <= chapter.pageNumbers.end) {
          targetChapter = chapter;
          break;
        }
      }
    }
    
    if (!targetChapter) {
      return {
        success: false,
        pageNumber: targetPageNumeric,
        content: '',
        highlightedContent: 'Page not found'
      };
    }
    
    const content = targetChapter.content;
    
    // Find the specific page marker (using new format with asterisks)
    const pageRegex = new RegExp(`\\*— Page ${targetPageNumeric} —\\*`, 'i');
    const pageMatch = content.match(pageRegex);
    
    if (!pageMatch) {
      return {
        success: false,
        pageNumber: targetPageNumeric,
        content: content,
        highlightedContent: content
      };
    }
    
    // Find the content for this page (from this marker to next marker or end)
    const pageStartIndex = content.indexOf(pageMatch[0]);
    const nextPageRegex = /\*— Page \d+ —\*/g;
    nextPageRegex.lastIndex = pageStartIndex + pageMatch[0].length;
    const nextPageMatch = nextPageRegex.exec(content);
    
    const pageEndIndex = nextPageMatch ? nextPageMatch.index : content.length;
    let pageContent = content.slice(pageStartIndex, pageEndIndex);
    
    // Clean up any HTML tags that might have been included
    pageContent = pageContent
      .replace(/<div[^>]*data-page[^>]*>.*?<\/div>/g, '') // Remove complete div blocks
      .replace(/<div[^>]*>/g, '')
      .replace(/<\/div>/g, '')
      .replace(/\s*style="[^"]*"/g, '')
      .replace(/\s*data-page="[^"]*"/g, '');
    
    let highlightedContent = pageContent;
    
    // If search term provided, highlight it in the page content
    if (searchTerm) {
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const highlightRegex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
      highlightedContent = pageContent.replace(highlightRegex, `**$&**`);
    }
    
    return {
      success: true,
      pageNumber: targetPageNumeric,
      content: pageContent,
      highlightedContent,
      scrollPosition: pageStartIndex
    };
    
  } catch (error) {
    console.error('Error navigating to page:', error);
    return {
      success: false,
      pageNumber: typeof pageNumber === 'number' ? pageNumber : 0,
      content: '',
      highlightedContent: 'Navigation error'
    };
  }
};

// Export helper functions for external use
export { extractAllPageNumbers, romanToArabic, findPageForTextPosition };

// Legacy compatibility - export the old search function name
export const searchBigBookContent = searchBigBookContentEnhanced;
