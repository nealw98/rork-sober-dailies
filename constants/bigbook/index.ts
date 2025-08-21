// Big Book Hybrid System - Text + PDF
// Text files for main content, PDF links for personal stories and appendices

import { markdownContent } from './content';

export interface BigBookTextContent {
  id: string;
  title: string;
  content: string;
  searchable: boolean;
  pageNumbers?: {
    start: number;
    end: number;
  };
  url?: string; // PDF URL for non-text content
  description?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  pageNumber?: number;
  excerpt: string;
  matchType: 'text' | 'page';
  matchContext: {
    before: string;
    match: string;
    after: string;
  };
}

// File mapping for markdown content
const markdownFileMap: Record<string, string> = {
  "preface": "aa-preface.md",
  "foreword-first": "aa-foreword-first.md",
  "foreword-second": "aa-foreword-second.md",
  "doctors-opinion": "aa-doctors-opinion.md",
  "chapter-1": "aa-chapter-01-bills-story.md",
  "chapter-2": "aa-chapter-02-there-is-a-solution.md",
  "chapter-3": "aa-chapter-03-more-about-alcoholism.md",
  "chapter-4": "aa-chapter-04-we-agnostics.md",
  "chapter-5": "aa-chapter-05-how-it-works.md",
  "chapter-6": "aa-chapter-06-into-action.md",
  "chapter-7": "aa-chapter-07-working-with-others.md",
  "chapter-8": "aa-chapter-08-to_wives.md",
  "chapter-9": "aa-chapter-09-the-family-afterward.md",
  "chapter-10": "aa-chapter-10-to-employers.md",
  "chapter-11": "aa-chapter-11-a-vision-for-you.md",
  "appendix-1": "appendix-01.md",
  "appendix-2": "appendix-02.md",
  "appendix-3": "appendix-03.md",
  "appendix-4": "appendix-04.md",
  "appendix-5": "appendix-05.md",
  "appendix-6": "appendix-06.md"
};

// Available text content with actual content from markdown files
export const bigBookTextContent: Record<string, BigBookTextContent> = {
  // Prefaces & Forewords
  "preface": {
    id: "preface",
    title: "Preface",
    content: markdownContent["preface"],
    searchable: true,
    pageNumbers: { start: 11, end: 12 },
    description: "Introduction to the fourth edition"
  },
  "foreword-first": {
    id: "foreword-first", 
    title: "Foreword to First Edition",
    content: markdownContent["foreword-first"],
    searchable: true,
    pageNumbers: { start: 13, end: 14 },
    description: "Original 1939 foreword"
  },
  "foreword-second": {
    id: "foreword-second",
    title: "Foreword to Second Edition", 
    content: markdownContent["foreword-second"],
    searchable: true,
    pageNumbers: { start: 15, end: 16 },
    description: "1955 edition updates"
  },
  // ... rest of the content objects remain the same ...
};

// PDF-only content (personal stories, etc.)
export const bigBookPDFContent: Record<string, BigBookTextContent> = {
  "foreword-third": {
    id: "foreword-third",
    title: "Foreword to Third Edition",
    content: "",
    url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordthirdedition.pdf",
    searchable: false,
    pageNumbers: { start: 17, end: 18 },
    description: "1976 edition updates"
  },
  "foreword-fourth": {
    id: "foreword-fourth",
    title: "Foreword to Fourth Edition",
    content: "",
    url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordfourthedition.pdf",
    searchable: false,
    pageNumbers: { start: 19, end: 20 },
    description: "2001 edition updates"
  }
  // Personal stories will remain as PDF links
};

// Combined content for easy access
export const getAllBigBookContent = () => {
  return { ...bigBookTextContent, ...bigBookPDFContent };
};

// Get only searchable content
export const getSearchableContent = () => {
  return Object.values(bigBookTextContent).filter(item => item.searchable);
};

// Extract page number from markdown content
const extractPageNumber = (content: string): number | null => {
  const pageMatch = content.match(/--- \*Page (\w+)\* ---/);
  return pageMatch ? romanToArabic(pageMatch[1]) : null;
};

// Convert Roman numerals to Arabic numbers
const romanToArabic = (roman: string): number => {
  const romanValues: Record<string, number> = {
    'i': 1, 'v': 5, 'x': 10, 'l': 50, 'c': 100, 'd': 500, 'm': 1000
  };
  
  // If it's already a number, return it
  if (/^\d+$/.test(roman)) {
    return parseInt(roman);
  }

  let result = 0;
  const romanLower = roman.toLowerCase();
  
  for (let i = 0; i < romanLower.length; i++) {
    const current = romanValues[romanLower[i]];
    const next = romanValues[romanLower[i + 1]];
    
    if (next > current) {
      result += next - current;
      i++;
    } else {
      result += current;
    }
  }
  
  return result;
};

// Get context around a match
const getMatchContext = (content: string, matchIndex: number, matchLength: number): { before: string; match: string; after: string } => {
  const contextLength = 50;
  const before = content.slice(Math.max(0, matchIndex - contextLength), matchIndex);
  const match = content.slice(matchIndex, matchIndex + matchLength);
  const after = content.slice(matchIndex + matchLength, matchIndex + matchLength + contextLength);
  
  return {
    before: before.trim(),
    match: match.trim(),
    after: after.trim()
  };
};

// Search function that handles both text and page number searches
export const searchBigBookContent = (query: string, type: 'text' | 'page' = 'text'): SearchResult[] => {
  const results: SearchResult[] = [];
  const searchableContent = getSearchableContent();
  
  if (type === 'page') {
    // Convert query to number and search by page
    const pageNumber = parseInt(query);
    if (isNaN(pageNumber)) return results;
    
    searchableContent.forEach(item => {
      if (item.pageNumbers && 
          pageNumber >= item.pageNumbers.start && 
          pageNumber <= item.pageNumbers.end) {
        // Find the specific page content if possible
        const pageMatch = item.content.match(new RegExp(`--- \\*Page ${pageNumber}\\* ---(.*?)(?=--- \\*Page|$)`, 's'));
        
        results.push({
          id: item.id,
          title: item.title,
          pageNumber,
          excerpt: pageMatch ? pageMatch[1].trim().slice(0, 150) + '...' : 'Page found in this section',
          matchType: 'page',
          matchContext: {
            before: '',
            match: `Page ${pageNumber}`,
            after: ''
          }
        });
      }
    });
  } else {
    // Text search
    const searchRegex = new RegExp(query, 'gi');
    
    searchableContent.forEach(item => {
      let match;
      while ((match = searchRegex.exec(item.content)) !== null) {
        const pageMatch = item.content.slice(0, match.index).match(/--- \*Page (\w+)\* ---/g);
        const currentPage = pageMatch ? extractPageNumber(pageMatch[pageMatch.length - 1]) : null;
        
        results.push({
          id: item.id,
          title: item.title,
          pageNumber: currentPage,
          excerpt: item.content.slice(Math.max(0, match.index - 50), match.index + 50),
          matchType: 'text',
          matchContext: getMatchContext(item.content, match.index, match[0].length)
        });
      }
    });
  }
  
  return results;
};