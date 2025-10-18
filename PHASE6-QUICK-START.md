# Phase 6 Quick Start Guide

## ✅ Phase 6 Complete: Bookmarks & Navigation

Full navigation system with highlights list, bookmarks list, and go-to-page feature!

---

## 🚀 What's New

### Header Actions (4 New Buttons)

```
[X]  Chapter Title  [#] [📑] [✏️] [🔍]
```

From right to left:
1. **🔍 Search** - Existing search feature
2. **✏️ Highlights** - View all highlights → NEW
3. **📑 Bookmarks** - View all bookmarks → NEW
4. **# Go to Page** - Navigate by page number → NEW

---

## 🎯 Features

### 1. Highlights List

**Access:** Tap ✏️ icon in header

**What You See:**
- All your highlights grouped by chapter
- Color indicator (yellow, green, blue, pink)
- Text snapshot in quotes
- Optional notes
- Creation date
- Delete button

**Actions:**
- **Tap highlight** → Navigates to that location
- **Tap trash icon** → Deletes highlight

**Empty State:** Helpful message explaining how to create highlights

### 2. Bookmarks List

**Access:** Tap 📑 icon in header

**What You See:**
- All your bookmarks (newest first)
- Bookmark icon (filled)
- Custom label or "Bookmarked Passage"
- Chapter title
- Page number + date
- Delete button

**Actions:**
- **Tap bookmark** → Navigates to that location
- **Tap trash icon** → Deletes bookmark

**Empty State:** Helpful message explaining how to create bookmarks

### 3. Go to Page

**Access:** Tap # icon in header

**What You See:**
- Page number input (1-164)
- Go button
- Quick navigation buttons:
  - Step 1 (page 21)
  - Step 2 (page 25)
  - Step 3 (page 34)
  - How It Works (page 58)
  - Into Action (page 72)
  - Promises (page 83)
  - Working with Others (page 89)

**Actions:**
- **Type page number** → Tap "Go to Page"
- **Tap quick button** → Navigates immediately

---

## 🧪 Testing

### Create Test Data

Use the Storage Example component or programmatically:

```typescript
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { HighlightColor } from '@/types/bigbook-v2';

// Add highlight
const { addHighlight } = useBigBookHighlights();
await addHighlight(
  'chapter-5-p1',     // paragraphId
  'chapter-5',        // chapterId
  0,                  // startOffset
  50,                 // endOffset
  'Rarely have we seen a person fail...',  // text
  HighlightColor.GREEN,  // color
  'Important promise'    // note (optional)
);

// Add bookmark
const { addBookmark } = useBigBookBookmarks();
await addBookmark(
  'chapter-5-p1',     // paragraphId
  'chapter-5',        // chapterId
  58,                 // pageNumber
  'Step Work Begins'  // label (optional)
);
```

### Test Navigation

1. **Same Chapter:**
   - Open Chapter 1
   - Create bookmark on paragraph 5
   - Open bookmarks list
   - Tap bookmark
   - ✅ Should scroll to paragraph 5 (smooth scroll)

2. **Cross Chapter:**
   - Open Chapter 1
   - Create bookmark in Chapter 5
   - From Chapter 1, open bookmarks list
   - Tap Chapter 5 bookmark
   - ✅ Should load Chapter 5, then scroll to bookmark

3. **Go to Page:**
   - Tap # button
   - Enter "58"
   - Tap "Go to Page 58"
   - ✅ Should navigate to Chapter 5, page 58

4. **Quick Pages:**
   - Tap # button
   - Tap "How It Works Page 58"
   - ✅ Should navigate to Chapter 5, page 58

---

## 🎨 UI Details

### Scroll Behavior

**Smooth Scrolling:**
- Animated scroll (not instant)
- Target appears 20px from top
- Works across chapters

**Cross-Chapter Flow:**
1. Load target chapter
2. Wait for render (150ms)
3. Scroll to target paragraph
4. Close modal

### Modal Types

**Highlights & Bookmarks:**
- Full screen modals
- Slide up from bottom
- Header with close button
- Scrollable list

**Go to Page:**
- Centered modal
- Semi-transparent overlay
- Smaller size
- Auto-focus input

---

## 📊 Statistics

**New Components:** 3
- BigBookHighlightsList (268 lines)
- BigBookBookmarksList (179 lines)
- BigBookPageNavigation (248 lines)

**Updated Components:** 2
- BigBookReader (~100 lines added)
- metadata.ts (6 lines added)

**Total New Code:** ~695 lines

---

## 🔧 Implementation Details

### Scroll-to-Paragraph

```typescript
// Store refs for each paragraph
const paragraphRefs = useRef<Map<string, View>>(new Map());

// In paragraph render:
<View
  ref={(ref) => {
    if (ref) paragraphRefs.current.set(paragraph.id, ref);
  }}
  collapsable={false}
>
  <BigBookParagraph paragraph={paragraph} />
</View>

// Scroll to paragraph:
const scrollToParagraph = (paragraphId: string) => {
  const view = paragraphRefs.current.get(paragraphId);
  view.measureLayout(
    scrollViewRef.current,
    (x, y) => {
      scrollViewRef.current.scrollTo({
        y: y - 20,
        animated: true
      });
    }
  );
};
```

### Cross-Chapter Navigation

```typescript
const handleNavigate = (chapterId, paragraphId) => {
  if (chapterId !== currentChapterId) {
    loadChapter(chapterId);
    setPendingScrollTarget(paragraphId);
  } else {
    scrollToParagraph(paragraphId);
  }
};

// After chapter loads:
useEffect(() => {
  if (pendingScrollTarget) {
    setTimeout(() => {
      scrollToParagraph(pendingScrollTarget);
      setPendingScrollTarget(null);
    }, 150);
  }
}, [pendingScrollTarget, currentChapter]);
```

---

## ⚠️ Known Limitations

### Phase 6 Only Displays Existing Data

✅ **Can do:**
- View all highlights
- View all bookmarks
- Navigate to them
- Delete them

❌ **Cannot do yet (Phase 5):**
- Create new highlights (need text selection)
- Create new bookmarks (need selection UI)
- Edit highlight notes
- Edit bookmark labels

**Workaround:** Use Phase 3 hooks programmatically to create test data.

---

## 🐛 Troubleshooting

### Scroll not working

**Check:**
- Paragraph has ref attached
- `collapsable={false}` is set
- Small delay exists (100-150ms)

**Debug:**
```typescript
console.log('Paragraph refs:', paragraphRefs.current.size);
console.log('Target paragraph:', paragraphId);
```

### Modal not closing

**Check:**
- `onClose` prop is passed
- Close button calls `onClose`
- Navigation calls `onClose` after setting target

### Cross-chapter navigation fails

**Check:**
- Pending scroll target is set
- useEffect watches pendingScrollTarget
- Timeout allows render to complete

---

## ➡️ Next: Phase 5

Phase 5 will add the UI to CREATE highlights and bookmarks:

- Long-press text selection
- Draggable selection handles
- Selection menu (Highlight, Bookmark)
- Color picker for highlights
- Label input for bookmarks
- Edit/delete existing items

Phase 6 provides the navigation; Phase 5 provides the creation!

---

**Status:** ✅ Phase 6 Complete | **Next:** Phase 5 - Text Selection

