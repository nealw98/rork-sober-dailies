interface PageContent {
  id: string;          // Unique identifier for the page (e.g., "chapter-5-page-66")
  chapterId: string;   // Which chapter this page belongs to (e.g., "chapter-5")
  pageNumber: number;  // The actual page number (e.g., 66)
  content: string;     // The text content of this page
  startIndex: number;  // Where this page starts in the chapter's content
  endIndex: number;    // Where this page ends in the chapter's content
}

// Example of how to structure the pages
export const pageData: Record<string, PageContent> = {
  "chapter-5-page-66": {
    id: "chapter-5-page-66",
    chapterId: "chapter-5",
    pageNumber: 66,
    content: "apparent was that this world and its people were often quite wrong...",
    startIndex: 0,  // These would be actual character positions
    endIndex: 1000  // in the chapter's content
  },
  // ... other pages
};

// Helper functions
export function getPageById(pageId: string): PageContent | undefined {
  return pageData[pageId];
}

export function findPageForPosition(chapterId: string, position: number): PageContent | undefined {
  return Object.values(pageData).find(page => 
    page.chapterId === chapterId && 
    position >= page.startIndex && 
    position <= page.endIndex
  );
}

export function getPageByNumber(chapterId: string, pageNumber: number): PageContent | undefined {
  return Object.values(pageData).find(page => 
    page.chapterId === chapterId && 
    page.pageNumber === pageNumber
  );
}