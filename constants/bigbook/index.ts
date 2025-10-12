// Big Book Enhanced Search System - 1st Edition
// Complete implementation with page-aware search and navigation

// Removed Node.js fs imports - not compatible with React Native

export interface BigBookTextContent {
  id: string;
  title: string;
  content: string;
  searchable: boolean;
  pageNumbers?: {
    start: string | number;
    end: string | number;
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
  pageNumber: string | number;
  content: string;
  highlightedContent: string;
  scrollPosition?: number;
  targetPageMarker?: string;
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
import { allMarkdownContent } from './content';

// Big Book text content (using existing content keys for compatibility)
export const bigBookTextContent: BigBookTextContent[] = [
  {
    id: 'foreword-first',
    title: 'Foreword to First Edition',
    content: '',
    searchable: true,
    pageNumbers: { start: 'xiii', end: 'xiv' }
  },
  {
    id: 'doctors-opinion',
    title: "The Doctor's Opinion",
    content: '',
    searchable: true,
    pageNumbers: { start: 'xxiii', end: 'xxx' }
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
    pageNumbers: { start: 17, end: 29 }
  },
  {
    id: 'chapter-3',
    title: 'More About Alcoholism',
    content: '',
    searchable: true,
    pageNumbers: { start: 30, end: 43 }
  },
  {
    id: 'chapter-4',
    title: 'We Agnostics',
    content: '',
    searchable: true,
    pageNumbers: { start: 44, end: 57 }
  },
  {
    id: 'chapter-5',
    title: 'How It Works',
    content: '',
    searchable: true,
    pageNumbers: { start: 58, end: 71 }
  },
  {
    id: 'chapter-6',
    title: 'Into Action',
    content: '',
    searchable: true,
    pageNumbers: { start: 72, end: 88 }
  },
  {
    id: 'chapter-7',
    title: 'Working with Others',
    content: '',
    searchable: true,
    pageNumbers: { start: 89, end: 103 }
  },
  {
    id: 'chapter-8',
    title: 'To Wives',
    content: '',
    searchable: true,
    pageNumbers: { start: 104, end: 121 }
  },
  {
    id: 'chapter-9',
    title: 'The Family Afterward',
    content: '',
    searchable: true,
    pageNumbers: { start: 122, end: 135 }
  },
  {
    id: 'chapter-10',
    title: 'To Employers',
    content: '',
    searchable: true,
    pageNumbers: { start: 136, end: 150 }
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
  item.content = allMarkdownContent[item.id] || '';
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
    let content = chapter.content;
    // Remove chapter titles, headers, and page markers from search content
    // For Roman numeral chapters, keep page markers for search
    let searchableContent = content;
    if (typeof chapter.pageNumbers?.start === 'number') {
      searchableContent = content
        .replace(/^#{1,6}\s*[A-Za-z0-9][A-Za-z0-9\s':,-]+$/gm, '') // Remove headers
        .replace(/^#{1,6}\s*HOW IT WORKS$/gm, '') // Remove specific headers
        .replace(/^#{1,6}\s*Chapter \d+.*$/gm, '') // Remove chapter lines
        .replace(/^[*]— Page [^—]+ —[*]$/gm, '') // Remove page markers from search (Arabic only)
        .replace(/^The Doctor's Opinion$/gm, '') // Remove title duplicates
        .replace(/^Bill's Story$/gm, '') // Remove title duplicates
        .replace(/^More About Alcoholism$/gm, '') // Remove title duplicates
        .replace(/^Into Action$/gm, '') // Remove title duplicates
        .trim();
    }
    // For Roman numeral chapters, do not remove page markers
    let match;
    
    // Find all matches in this chapter (search both original and cleaned)
    // First, search in original content to preserve exact positions
    const originalRegex = wholeWordsOnly 
      ? new RegExp(`\\b${escapedTerm}\\b`, caseSensitive ? 'g' : 'gi')
      : new RegExp(escapedTerm, caseSensitive ? 'g' : 'gi');
    
    while ((match = originalRegex.exec(content)) !== null) {
      const originalMatchIndex = match.index;
      const matchText = match[0];
      
      // Check if this match should be excluded (is it in headers/titles?)
      // More precise check: only exclude if match is on the SAME LINE as a header
      const matchLineStart = content.lastIndexOf('\n', originalMatchIndex) + 1;
      const matchLineEnd = content.indexOf('\n', originalMatchIndex);
      const matchLine = content.slice(matchLineStart, matchLineEnd === -1 ? content.length : matchLineEnd);
      
      // Skip only if the match is on a line that IS a header
      const isInHeader = /^#{1,6}\s*[^\n]*$/m.test(matchLine) || 
                        /^(The Doctor's Opinion|Bill's Story|More About Alcoholism|Into Action|HOW IT WORKS)$/m.test(matchLine.trim());
      
      if (isInHeader) continue; // Skip header matches
      
      // Find which page this match is on using original content
      const pageInfo = findPageForTextPosition(content, originalMatchIndex);
      
      // Extract context around the match (100 chars before and after) - use original content
      const contextStart = Math.max(0, originalMatchIndex - 100);
      const contextEnd = Math.min(content.length, originalMatchIndex + matchText.length + 100);
      const fullContext = content.slice(contextStart, contextEnd);
      
      // Split context into before, match, and after  
      const excerptBefore = content.slice(contextStart, originalMatchIndex);
      const excerptAfter = content.slice(originalMatchIndex + matchText.length, contextEnd);
      
      // Revert: remove page markers in excerpt (display only)
      const excerpt = fullContext
        .replace(/\*— Page [^—]+ —\*/g, '')
        .replace(/\n{2,}/g, ' ')
        .trim();
      
      // Revert: remove page markers from before/after too (display only)
      const cleanBefore = excerptBefore
        .replace(/\*— Page [^—]+ —\*/g, '')
        .replace(/^#{1,6}\s*[^\n]*$/gm, '') // Remove markdown headers
        .replace(/^(The Doctor's Opinion|Bill's Story|More About Alcoholism|Into Action|HOW IT WORKS)$/gm, '') // Remove specific titles
        .replace(/^Chapter \d+.*$/gm, '') // Remove chapter lines
        .replace(/\n{2,}/g, ' ')
        .replace(/\n/g, ' '); // Replace single newlines with spaces
        
      const cleanAfter = excerptAfter
        .replace(/\*— Page [^—]+ —\*/g, '')
        .replace(/^#{1,6}\s*[^\n]*$/gm, '') // Remove markdown headers
        .replace(/^(The Doctor's Opinion|Bill's Story|More About Alcoholism|Into Action|HOW IT WORKS)$/gm, '') // Remove specific titles
        .replace(/^Chapter \d+.*$/gm, '') // Remove chapter lines
        .replace(/\n{2,}/g, ' ')
        .replace(/\n/g, ' '); // Replace single newlines with spaces
      
      // Get the last part of before text and first part of after text, preserving spaces
      const beforeText = cleanBefore.slice(-50);
      const afterText = cleanAfter.slice(0, 50);
      
      // Ensure there's a space before the match if the before text doesn't end with whitespace
      const beforeWithSpace = beforeText && !/\s$/.test(beforeText) ? beforeText + ' ' : beforeText;
      
      // Only add space after the match if the after text doesn't start with whitespace AND doesn't start with punctuation
      const afterWithSpace = afterText && !/^\s/.test(afterText) && !/^[.,;:!?)]/.test(afterText) ? ' ' + afterText : afterText;
      
      results.push({
        id: `${chapter.id}-${originalMatchIndex}`,
        title: chapter.title,
        pageNumber: pageInfo.page,
        pageNumberNumeric: pageInfo.numeric,
        excerpt,
        matchType: 'text',
        matchContext: {
          before: beforeWithSpace,
          match: matchText,
          after: afterWithSpace,
          position: originalMatchIndex,
          length: matchText.length
        },
        chapterInfo: {
          id: chapter.id,
          title: chapter.title
        }
      });
    }
  });
  
  // Remove duplicates based only on exact position (less aggressive)
  const uniqueResults = [];
  const seenPositions = new Set();
  
  for (const result of results) {
    const key = `${result.chapterInfo.id}-${result.matchContext.position}`;
    if (!seenPositions.has(key)) {
      seenPositions.add(key);
      uniqueResults.push(result);
    }
  }
  
  console.log('🔍 Search:', searchTerm, '- Total matches:', results.length, 'Unique matches:', uniqueResults.length);
  
  // Sort results by page number, then by position within page
  return uniqueResults.sort((a, b) => {
    const pageComparison = a.pageNumberNumeric - b.pageNumberNumeric;
    if (pageComparison !== 0) return pageComparison;
    return a.matchContext.position - b.matchContext.position;
  });
};

// Navigate to specific page with highlighted search term
export const navigateToPageWithHighlight = (
  pageNumber: string | number,
  searchTerm?: string
): NavigationResult => {
  console.log('🚨 NAVIGATION FUNCTION CALLED with pageNumber:', pageNumber, 'searchTerm:', searchTerm);

  try {
    const isRoman = typeof pageNumber === 'string' && isNaN(Number(pageNumber));
    let targetChapter: BigBookTextContent | null = null;

    for (const chapter of bigBookTextContent) {
      if (chapter.pageNumbers) {
        // If searching for a Roman numeral, only check string ranges
        if (isRoman && typeof chapter.pageNumbers.start === 'string' && typeof chapter.pageNumbers.end === 'string') {
          if (compareRoman(pageNumber as string, chapter.pageNumbers.start) >= 0 && compareRoman(pageNumber as string, chapter.pageNumbers.end) <= 0) {
            targetChapter = chapter;
            break;
          }
        }
        // If searching for an Arabic number, only check numeric ranges
        if (!isRoman && typeof chapter.pageNumbers.start === 'number' && typeof chapter.pageNumbers.end === 'number') {
          if ((pageNumber as number) >= chapter.pageNumbers.start && (pageNumber as number) <= chapter.pageNumbers.end) {
            targetChapter = chapter;
            break;
          }
        }
      }
    }

    if (!targetChapter) {
      return {
        success: false,
        pageNumber,
        content: '',
        highlightedContent: 'Page not found'
      };
    }

    const content = targetChapter.content;
    // Use the exact string for the marker
    const pageMarker = `*\u2014 Page ${pageNumber} \u2014*`;
    const pageMatch = content.indexOf(pageMarker);
    if (pageMatch === -1) {
      return {
        success: false,
        pageNumber,
        content: content,
        highlightedContent: content
      };
    }
    // Return the full chapter content, but set scrollPosition to the marker
    let highlightedContent = content;
    if (searchTerm) {
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const highlightRegex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
      highlightedContent = content.replace(highlightRegex, `**$&**`);
    }
    // Always use the string page number for navigation
    return {
      success: true,
      pageNumber,
      content: content,
      highlightedContent,
      scrollPosition: pageMatch,
      targetPageMarker: String(pageNumber)
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

// Helper to compare two Roman numerals as strings
function compareRoman(a: string, b: string): number {
  const romanToInt = (roman: string): number => {
    const map: Record<string, number> = {i:1,v:5,x:10,l:50,c:100,d:500,m:1000};
    let num = 0, prev = 0;
    for (let i = roman.length - 1; i >= 0; i--) {
      const curr = map[roman[i].toLowerCase()];
      if (curr < prev) num -= curr;
      else num += curr;
      prev = curr;
    }
    return num;
  };
  return romanToInt(a) - romanToInt(b);
}
