# Page Numbers Testing Guide

## Quick Test Checklist

### 1. Basic Page Display (2 min)
- [ ] Open Big Book → Select any chapter
- [ ] **Check:** Header shows "Chapter Title • Page X"
- [ ] Scroll down slowly
- [ ] **Check:** Page number updates as you scroll

### 2. Go to Page (1 min)
- [ ] Tap # icon → "Go to Page" opens
- [ ] Enter "65" → Tap "Go to Page 65"
- [ ] **Check:** Reader opens to "How It Works • Page 65"
- [ ] **Check:** You see the start of page 65

### 3. Bookmarks (2 min)
- [ ] Scroll to any page (e.g., page 10)
- [ ] Tap bookmark icon (if available) or create bookmark
- [ ] Go to chapter list → Tap 📑 (Bookmarks)
- [ ] **Check:** Bookmark shows "Page 10" prominently
- [ ] Tap the bookmark
- [ ] **Check:** Reader shows "Chapter • Page 10"

### 4. Navigation Clarity (1 min)
- [ ] Scroll to bottom of chapter
- [ ] **Check:** Footer shows "Previous Chapter" / "Next Chapter"
- [ ] **Check:** Center shows "Pages X-Y"
- [ ] Tap "Next Chapter"
- [ ] **Check:** Header updates to new chapter and page 1

---

## Expected Behavior

### Page Tracking
- **On load:** Shows first page of chapter
- **While scrolling:** Updates smoothly (not jumpy)
- **Accuracy:** Shows page of paragraph in upper 1/3 of screen
- **Performance:** No lag or stuttering

### Go to Page
- **User enters:** Any page number (1-164)
- **Result:** Opens correct chapter, scrolls to that page
- **Confirmation:** Header shows that page number
- **Visual:** First paragraph of that page is visible

### Bookmarks
- **Display:** "Page 58" is largest text
- **Secondary:** Chapter title below
- **Optional:** User label if present
- **Action:** Tapping navigates to that page

### Footer
- **Left button:** "Previous Chapter"
- **Center:** "Pages X-Y" (range for current chapter)
- **Right button:** "Next Chapter"

---

## Edge Cases to Test

### Multi-Page Chapters
- [ ] Open "Bill's Story" (pages 1-16)
- [ ] Scroll from page 1 → 16
- [ ] **Check:** All page numbers display correctly

### Single-Page Content
- [ ] Open "Foreword" or short appendix
- [ ] **Check:** Page number displays correctly
- [ ] **Check:** No errors when scrolling

### First and Last Pages
- [ ] Go to page 1 (very first page)
- [ ] **Check:** Displays correctly
- [ ] Go to page 164 (last page)
- [ ] **Check:** Displays correctly

### Fast Scrolling
- [ ] Scroll very quickly through a chapter
- [ ] **Check:** Page numbers update (may skip some)
- [ ] **Check:** No crashes or errors

---

## Bug Watch

### Potential Issues
1. **Page number doesn't update**
   - Check: `scrollEventThrottle` is set
   - Check: `onScroll={handleScroll}` is attached
   - Check: Paragraph refs are being tracked

2. **Wrong page number**
   - Check: Paragraph page numbers are correct in content
   - Check: `measureLayout` is calculating correctly
   - Check: Midpoint calculation (upper 1/3)

3. **Go to Page doesn't work**
   - Check: `goToPage` function returns correct result
   - Check: `onSelectChapter` receives both chapter and paragraph IDs
   - Check: Scroll-to-paragraph logic executes

4. **Performance issues**
   - Check: `scrollEventThrottle={150}` (not too low)
   - Check: No unnecessary re-renders
   - Check: `useCallback` on handlers

---

## Console Logs to Check

### When loading chapter:
```
[BigBookReader] Scrolling to paragraph on mount: chapter-1-p1
```

### When using Go to Page:
```
[BigBookChapterList] Navigating to page: 65
[BigBookChapterList] goToPage result: { chapterId: "chapter-5", paragraphId: "chapter-5-p1" }
[BigBookMain] handleSelectChapter: { chapterId: "chapter-5", scrollToId: "chapter-5-p1" }
```

### When scrolling:
- Should NOT spam console (throttled at 150ms)
- No error messages about measureLayout

---

## Visual Inspection

### Header
```
┌────────────────────────────────────────┐
│ [X]  Bill's Story • Page 3      [🔍]  │
│      Chapter 1                          │
└────────────────────────────────────────┘
```
- [ ] Title and page number on same line
- [ ] Bullet separator (•) between them
- [ ] Page number is slightly lighter (muted color)
- [ ] Readable and not truncated

### Footer
```
┌────────────────────────────────────────┐
│ [← Previous Chapter] Pages 1-16 [Next Chapter →] │
└────────────────────────────────────────┘
```
- [ ] Button labels are clear
- [ ] Page range centered
- [ ] All elements visible and not overlapping

### Bookmarks
```
┌─────────────────────────────────────────┐
│ 📑  Page 58                      [🗑️]    │
│     How It Works                        │
│     10/16/2025                          │
└─────────────────────────────────────────┘
```
- [ ] Page number is largest (bold, 18pt)
- [ ] Chapter title is blue (tint color)
- [ ] Date is smallest (muted color)
- [ ] Bookmark icon filled and tinted

---

## Success Criteria

✅ **Basic Functionality**
- Page number always visible while reading
- Updates as user scrolls through content
- Matches actual page in content

✅ **Navigation**
- "Go to Page" navigates to correct location
- Page number confirms correct page
- Footer buttons clearly labeled

✅ **Bookmarks**
- Display page number prominently
- Navigate to correct page
- Header confirms correct location

✅ **Performance**
- No lag or stuttering
- Smooth scroll experience
- No excessive console logs

✅ **User Experience**
- Intuitive and predictable
- Matches physical Big Book mental model
- Clear visual hierarchy

---

## Quick Test Script (5 minutes)

1. **Open Big Book** → Select "Bill's Story"
   - ✓ Header shows page number

2. **Scroll through 5 pages**
   - ✓ Page numbers update correctly

3. **Tap #** → Enter "65" → Go
   - ✓ Opens page 65, header confirms

4. **Tap 📑** → View bookmarks
   - ✓ Page numbers are prominent

5. **Tap a bookmark**
   - ✓ Navigates to correct page

6. **Check footer**
   - ✓ Labels are clear ("Previous Chapter" / "Next Chapter")

7. **Fast scroll test**
   - ✓ Page numbers update, no crashes

**If all 7 pass:** ✅ Feature is working correctly!

---

## Reporting Issues

If you find a bug, note:
1. **What you did** (e.g., "Opened Bill's Story and scrolled to page 5")
2. **What you expected** (e.g., "Header should show 'Bill's Story • Page 5'")
3. **What happened** (e.g., "Header still shows 'Bill's Story • Page 1'")
4. **Console logs** (any error messages)
5. **Device/OS** (iOS/Android, version)

This helps identify the root cause quickly!

