# Phase 3 Quick Start Guide

## ✅ Phase 3 Complete: Storage Services

All storage infrastructure for highlights and bookmarks is now implemented and ready to use.

## 🎯 What's Ready

### Storage Service
```typescript
import { getBigBookStorage } from '@/lib/bigbook-storage';

const storage = getBigBookStorage();
await storage.saveHighlight(highlight);
await storage.saveBookmark(bookmark);
```

### Highlights Hook
```typescript
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';

function MyComponent() {
  const { highlights, addHighlight, deleteHighlight, isLoading } 
    = useBigBookHighlights('chapter-1'); // optional chapterId filter
  
  // Add a highlight
  const highlight = await addHighlight(
    'chapter-1-p5',           // paragraphId
    'chapter-1',              // chapterId  
    0,                        // startOffset
    42,                       // endOffset
    'Selected text here...',  // textSnapshot
    HighlightColor.YELLOW     // color (optional, defaults to yellow)
  );
  
  // Update with a note
  await updateHighlight(highlight.id, { 
    note: 'This is important!' 
  });
  
  // Delete
  await deleteHighlight(highlight.id);
}
```

### Bookmarks Hook
```typescript
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';

function MyComponent() {
  const { bookmarks, addBookmark, isBookmarked, deleteBookmark } 
    = useBigBookBookmarks();
  
  // Check if bookmarked
  const bookmarked = isBookmarked('chapter-1-p5');
  
  // Add bookmark
  const bookmark = await addBookmark(
    'chapter-1-p5',    // paragraphId
    'chapter-1',       // chapterId
    1,                 // pageNumber
    'Important spot'   // label (optional)
  );
  
  // Delete
  await deleteBookmark(bookmark.id);
}
```

### Optimized Hooks for Paragraphs
```typescript
// For rendering highlights in a paragraph
import { useParagraphHighlights } from '@/hooks/use-bigbook-highlights';

function Paragraph({ paragraphId }) {
  const { highlights, isLoading } = useParagraphHighlights(paragraphId);
  // Only re-renders when THIS paragraph's highlights change
}

// For rendering bookmark indicator
import { useParagraphBookmark } from '@/hooks/use-bigbook-bookmarks';

function Paragraph({ paragraphId }) {
  const { isBookmarked, bookmark } = useParagraphBookmark(paragraphId);
  // Only re-renders when THIS paragraph's bookmark changes
}
```

## 🧪 Test It

Add this to any screen:
```typescript
import { BigBookStorageExample } from '@/components/bigbook-v2/BigBookStorageExample';

<BigBookStorageExample />
```

This gives you an interactive UI to:
- Create highlights (yellow and green)
- Add notes to highlights
- Create bookmarks
- Delete items
- Clear all data
- See real-time updates

## 📦 Storage Format

**Highlights:** `@bigbook_v2:highlights`
**Bookmarks:** `@bigbook_v2:bookmarks`

Data persists across app restarts using AsyncStorage.

## 🚀 Cloud Sync Ready

The architecture supports adding cloud sync without breaking existing code:

```typescript
// Future implementation
class CloudStorageService implements BigBookStorageService {
  async saveHighlight(highlight) {
    await localStorageinstance.save(highlight);  // Save locally
    await this.cloudAPI.sync(highlight);         // Sync to cloud
  }
}

// Swap globally - all components automatically get cloud sync!
setBigBookStorage(new CloudStorageService());
```

## ➡️ Next: Phase 4

Phase 4 will create the reader UI that uses these hooks:
- BigBookReader.tsx
- BigBookChapterList.tsx  
- BigBookParagraph.tsx (with highlight rendering)
- BigBookFreePDF.tsx

---

**Phase 3 Status:** ✅ Complete | **Ready for:** Phase 4

