// Big Book Hybrid System - Text + PDF
// Text files for main content, PDF links for personal stories and appendices

import { allMarkdownContent } from './content';
import { findPageForPosition } from './pageMapping';

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
    position: number;  // Position in the content
    length: number;    // Length of the match
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
    content: allMarkdownContent["preface"],
    searchable: true,
    pageNumbers: { start: 11, end: 12 },
    description: "Introduction to the fourth edition"
  },
  "foreword-first": {
    id: "foreword-first", 
    title: "Foreword to First Edition",
    content: allMarkdownContent["foreword-first"],
    searchable: true,
    pageNumbers: { start: 13, end: 14 },
    description: "Original 1939 foreword"
  },
  "foreword-second": {
    id: "foreword-second",
    title: "Foreword to Second Edition", 
    content: allMarkdownContent["foreword-second"],
    searchable: true,
    pageNumbers: { start: 15, end: 16 },
    description: "1955 edition updates"
  },
  "doctors-opinion": {
    id: "doctors-opinion",
    title: "The Doctor's Opinion", 
    content: allMarkdownContent["doctors-opinion"],
    searchable: true,
    pageNumbers: { start: 21, end: 29 },
    description: "Dr. Silkworth's medical perspective"
  },
  "chapter-1": {
    id: "chapter-1",
    title: "Bill's Story",
    content: allMarkdownContent["chapter-1"],
    searchable: true,
    pageNumbers: { start: 1, end: 16 },
    description: "Bill Wilson's personal story"
  },
  "chapter-2": {
    id: "chapter-2", 
    title: "There Is a Solution",
    content: allMarkdownContent["chapter-2"],
    searchable: true,
    pageNumbers: { start: 17, end: 29 },
    description: "The solution to alcoholism"
  },
  "chapter-3": {
    id: "chapter-3",
    title: "More About Alcoholism",
    content: allMarkdownContent["chapter-3"],
    searchable: true,
    pageNumbers: { start: 30, end: 43 },
    description: "Understanding the disease"
  },
  "chapter-4": {
    id: "chapter-4",
    title: "We Agnostics", 
    content: allMarkdownContent["chapter-4"],
    searchable: true,
    pageNumbers: { start: 44, end: 57 },
    description: "Addressing spiritual skepticism"
  },
  "chapter-5": {
    id: "chapter-5",
    title: "How It Works",
    content: allMarkdownContent["chapter-5"],
    searchable: true,
    pageNumbers: { start: 58, end: 71 },
    description: "The Twelve Steps and how to work them"
  },
  "chapter-6": {
    id: "chapter-6",
    title: "Into Action",
    content: allMarkdownContent["chapter-6"],
    searchable: true,
    pageNumbers: { start: 72, end: 88 },
    description: "Taking action on the steps"
  },
  "chapter-7": {
    id: "chapter-7",
    title: "Working with Others",
    content: allMarkdownContent["chapter-7"],
    searchable: true,
    pageNumbers: { start: 89, end: 103 },
    description: "Helping other alcoholics"
  },
  "chapter-8": {
    id: "chapter-8",
    title: "To Wives",
    content: allMarkdownContent["chapter-8"],
    searchable: true,
    pageNumbers: { start: 104, end: 122 },
    description: "Advice for spouses"
  },
  "chapter-9": {
    id: "chapter-9",
    title: "The Family Afterward",
    content: allMarkdownContent["chapter-9"],
    searchable: true,
    pageNumbers: { start: 122, end: 135 },
    description: "Family recovery"
  },
  "chapter-10": {
    id: "chapter-10",
    title: "To Employers",
    content: allMarkdownContent["chapter-10"],
    searchable: true,
    pageNumbers: { start: 136, end: 150 },
    description: "Workplace considerations"
  },
  "chapter-11": {
    id: "chapter-11",
    title: "A Vision for You",
    content: allMarkdownContent["chapter-11"],
    searchable: true,
    pageNumbers: { start: 151, end: 164 },
    description: "The promise of recovery"
  },
  "appendix-1": {
    id: "appendix-1",
    title: "The A.A. Tradition",
    content: allMarkdownContent["appendix-1"],
    searchable: true,
    description: "A.A. history and tradition"
  },
  "appendix-2": {
    id: "appendix-2", 
    title: "Spiritual Experience",
    content: allMarkdownContent["appendix-2"],
    searchable: true,
    description: "Understanding spiritual awakening"
  },
  "appendix-3": {
    id: "appendix-3",
    title: "The Medical View on A.A.",
    content: allMarkdownContent["appendix-3"],
    searchable: true,
    description: "Medical endorsements"
  },
  "appendix-4": {
    id: "appendix-4",
    title: "The Religious View on A.A.",
    content: allMarkdownContent["appendix-4"],
    searchable: true,
    description: "Religious endorsements"  
  },
  "appendix-5": {
    id: "appendix-5",
    title: "The Lasker Award",
    content: allMarkdownContent["appendix-5"],
    searchable: true,
    description: "Recognition from medical community"
  },
  "appendix-6": {
    id: "appendix-6",
    title: "The Twelve Traditions",
    content: allMarkdownContent["appendix-6"],
    searchable: true,
    description: "A.A. group principles"
  }
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
const getMatchContext = (content: string, matchIndex: number, matchLength: number) => {
  const contextLength = 50;
  const before = content.slice(Math.max(0, matchIndex - contextLength), matchIndex);
  const match = content.slice(matchIndex, matchIndex + matchLength);
  const after = content.slice(matchIndex + matchLength, matchIndex + matchLength + contextLength);
  
  return {
    before: before.trim(),
    match: match.trim(),
    after: after.trim(),
    position: matchIndex,
    length: matchLength
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
        const currentPage = findPageForPosition(item.content, match.index);
        
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

