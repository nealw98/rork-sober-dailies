# Phase 4 Quick Start Guide

## ✅ Phase 4 Complete: Core Reader UI

The reading interface is now fully functional! Users can read chapters, see highlights/bookmarks, and search content.

## 🚀 Quick Test

Add to any screen to test:

```typescript
import { BigBookMain } from '@/components/bigbook-v2/BigBookMain';

<BigBookMain />
```

## 📱 What You'll See

### If You Have Access (Grandfathered or Subscribed):
1. **Chapter List** with 3 sections:
   - Front Matter
   - Main Chapters (expanded by default)
   - Appendices

2. Tap a chapter → **Reader opens** with:
   - Chapter content
   - Existing highlights shown as colored backgrounds
   - Bookmark icons on bookmarked paragraphs
   - Search button (tap to search)
   - Previous/Next navigation

3. Tap search → **Search interface** with:
   - Search bar
   - Results with context preview
   - Tap result → loads that chapter

### If You Don't Have Access:
- **Free PDF screen** with:
  - Link to official AA.org PDF
  - List of premium features
  - Subscribe button

## 🧪 Test with Existing Highlights/Bookmarks

### Option 1: Use Phase 3 Example Component
```typescript
import { BigBookStorageExample } from '@/components/bigbook-v2/BigBookStorageExample';

// Add to a test screen:
<BigBookStorageExample />

// Create some highlights and bookmarks
// Then open BigBookMain to see them displayed
```

### Option 2: Programmatically Add Test Data
```typescript
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { HighlightColor } from '@/types/bigbook-v2';

function TestData() {
  const { addHighlight } = useBigBookHighlights();
  const { addBookmark } = useBigBookBookmarks();
  
  const addTestData = async () => {
    // Add yellow highlight to Chapter 1, paragraph 1
    await addHighlight(
      'chapter-1-p1',
      'chapter-1',
      0,
      50,
      'WAR FEVER ran high in the New England town to which',
      HighlightColor.YELLOW
    );
    
    // Add bookmark to Chapter 5, paragraph 1
    await addBookmark(
      'chapter-5-p1',
      'chapter-5',
      58,
      'Start of Step Work'
    );
  };
  
  return (
    <TouchableOpacity onPress={addTestData}>
      <Text>Add Test Data</Text>
    </TouchableOpacity>
  );
}
```

## 🎯 Key Features

### Reader Features
- ✅ Read all chapters
- ✅ See existing highlights (yellow, green, blue, pink)
- ✅ See bookmark icons
- ✅ Previous/Next navigation
- ✅ Page numbers
- ✅ Smooth scrolling

### Search Features
- ✅ Search across all 920+ paragraphs
- ✅ See results with context
- ✅ Navigate to search results
- ✅ Debounced search (300ms)
- ✅ Loading indicators

### What's NOT in Phase 4
- ❌ Text selection (Phase 5)
- ❌ Creating new highlights (Phase 5)
- ❌ Creating new bookmarks (Phase 5)
- ❌ Editing highlights/bookmarks (Phase 5)
- ❌ Highlights list view (Phase 6)
- ❌ Bookmarks list view (Phase 6)

Phase 4 is **READ-ONLY**. You can see existing data but not create/edit.

## 🔌 Integration Points

### Navigate to Specific Chapter
```typescript
import { useBigBookContent } from '@/hooks/use-bigbook-content';

const { loadChapter } = useBigBookContent();
loadChapter('chapter-5'); // Loads "How It Works"
```

### Navigate to Specific Page
```typescript
import { useBigBookContent } from '@/hooks/use-bigbook-content';

const { goToPage } = useBigBookContent();
const result = goToPage(58);
if (result) {
  // result = { chapterId: 'chapter-5', paragraphId: 'chapter-5-p1' }
}
```

### Search Content
```typescript
import { useBigBookContent } from '@/hooks/use-bigbook-content';

const { searchContent } = useBigBookContent();
const results = searchContent('higher power');
// Returns SearchResult[] with matches and context
```

## 📦 Component Structure

```
BigBookMain (entry point)
├── Access Check (loading)
├── BigBookFreePDF (no access)
└── BigBookChapterList (has access)
    └── BigBookReader
        ├── BigBookSearchBar
        └── BigBookParagraph (many)
```

## 🎨 Highlight Colors

Phase 4 displays 4 highlight colors:

| Color  | Hex Code | Use Case |
|--------|----------|----------|
| Yellow | `#FEF08A` | Default |
| Green  | `#BBF7D0` | Important |
| Blue   | `#BFDBFE` | Questions |
| Pink   | `#FBCFE8` | Personal |

## 📝 Search Algorithm

1. User types → debounce 300ms
2. Search all paragraphs (case-insensitive)
3. Extract matches with context (40 chars before/after)
4. Score by relevance (matches × 10 + position bonus)
5. Sort by score (highest first)
6. Return top 50 results

## 🐛 Troubleshooting

**Problem:** No highlights showing

**Solution:**
```typescript
// Verify highlights exist
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
const { highlights } = useBigBookHighlights();
console.log('Total highlights:', highlights.length);
```

**Problem:** Free PDF showing instead of reader

**Solution:**
```typescript
// Check access status
import { getBigBookAccessStatus } from '@/lib/bigbook-access';
const status = await getBigBookAccessStatus();
console.log('Access:', status);
```

**Problem:** Search not working

**Solution:**
```typescript
// Test search directly
import { useBigBookContent } from '@/hooks/use-bigbook-content';
const { searchContent } = useBigBookContent();
const results = searchContent('test');
console.log('Results:', results.length);
```

## ➡️ Next: Phase 5

Phase 5 will add:
- Long-press text selection
- Draggable selection handles
- Selection menu (Highlight, Bookmark)
- Create new highlights with color picker
- Create new bookmarks with labels
- Edit/delete existing highlights/bookmarks

---

**Status:** ✅ Phase 4 Complete | **Next:** Phase 5 - Text Selection

