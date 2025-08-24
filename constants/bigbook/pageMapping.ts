import { bigBookData } from './data';
import { allMarkdownContent } from './content';

export interface PageInfo {
  id: string;               // Unique ID for the page (e.g., "page-66")
  number: number;           // Page number (e.g., 66)
  chapterId: string;        // Which chapter this page is in (e.g., "chapter-5")
  chapterTitle: string;     // Chapter title (e.g., "How It Works")
  content: string;          // The actual text content of the page
  startPosition: number;    // Start position in chapter's content
  endPosition: number;      // End position in chapter's content
}

// Build a map of all pages in the Big Book
export const buildPageMap = (): Map<number, PageInfo> => {
  const pageMap = new Map<number, PageInfo>();

  // Go through each chapter
  bigBookData.forEach(category => {
    category.sections.forEach(section => {
      const content = allMarkdownContent[section.id];
      if (!content) return;

      // Find all page markers and build page sections
      const pageMarkers: Array<{ pageNumber: number; position: number }> = [];
      const pageMarkerRegex = /— Page (\d+) —/g;
      let match;

      // First, find all page markers
      while ((match = pageMarkerRegex.exec(content)) !== null) {
        pageMarkers.push({
          pageNumber: parseInt(match[1], 10),
          position: match.index
        });
      }

      // Now create page sections
      pageMarkers.forEach((marker, index) => {
        const nextMarker = pageMarkers[index + 1];
        const startPos = marker.position;
        const endPos = nextMarker ? nextMarker.position : content.length;
        
        // Extract content between this marker and the next one
        const pageContent = content.slice(startPos, endPos);
        
        pageMap.set(marker.pageNumber, {
          id: `page-${marker.pageNumber}`,
          number: marker.pageNumber,
          chapterId: section.id,
          chapterTitle: section.title,
          content: pageContent,
          startPosition: startPos,
          endPosition: endPos
        });


      });
    });
  });

  return pageMap;
};

// Create and export the page map
export const pageMap = buildPageMap();

// Helper functions
export function getPageByNumber(pageNumber: number): PageInfo | undefined {
  return pageMap.get(pageNumber);
}

export function findPageForContent(chapterId: string, position: number): PageInfo | undefined {
  return Array.from(pageMap.values()).find(page => 
    page.chapterId === chapterId && 
    position >= page.startPosition && 
    position <= page.endPosition
  );
}

export function getPageRange(): { min: number; max: number } {
  const pages = Array.from(pageMap.keys());
  return {
    min: Math.min(...pages),
    max: Math.max(...pages)
  };
}

// Get all pages in a chapter
export function getPagesInChapter(chapterId: string): PageInfo[] {
  return Array.from(pageMap.values())
    .filter(page => page.chapterId === chapterId)
    .sort((a, b) => a.number - b.number);
}

// Get chapter info for a page number
export function getChapterForPage(pageNumber: number): { id: string; title: string } | undefined {
  const page = pageMap.get(pageNumber);
  return page ? { id: page.chapterId, title: page.chapterTitle } : undefined;
}