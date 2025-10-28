/**
 * Big Book V2 Type Definitions
 * 
 * Data models for the premium Big Book Reader with highlighting,
 * bookmarks, and advanced navigation features.
 */

export interface BigBookChapter {
  id: string;              // e.g., "chapter-1", "preface", "doctors-opinion"
  title: string;           // e.g., "Bill's Story"
  chapterNumber?: number;  // 1-11 for main chapters, null for forewords/appendices
  pageRange: [number, number]; // [startPage, endPage]
  paragraphs: BigBookParagraph[];
}

export interface BigBookParagraph {
  id: string;              // e.g., "chapter-1-p1", "preface-p5"
  chapterId: string;
  pageNumber: number;      // Actual Big Book page number
  content: string;         // Raw paragraph text
  order: number;           // Sequential order within chapter
  isItalic?: boolean;      // True if entire paragraph should be italic
}

export enum HighlightColor {
  YELLOW = 'yellow',
  GREEN = 'green',
  BLUE = 'blue',
  PINK = 'pink',
}

export interface BigBookHighlight {
  id: string;              // UUID
  paragraphId: string;
  chapterId: string;
  sentenceIndex: number;   // Which sentence in the paragraph (0-based)
  color: HighlightColor;
  note?: string;           // Optional user note
  textSnapshot: string;    // Copy of highlighted sentence
  createdAt: number;       // Timestamp
  updatedAt: number;
}

export interface BigBookBookmark {
  id: string;              // UUID
  pageNumber: number;      // The page that is bookmarked
  chapterId: string;       // Chapter containing this page
  label?: string;          // Optional user label (e.g., "Step 3", "The Promises")
  createdAt: number;       // Timestamp
}

/**
 * Chapter metadata without full paragraph content
 */
export interface BigBookChapterMeta {
  id: string;
  title: string;
  chapterNumber?: number;
  pageRange: [number, number];
  description?: string;
  useRomanNumerals?: boolean;  // True for front matter (forewords, preface, doctor's opinion)
}

