# Phase 6 Refactor - Quick Testing Guide

## 🎯 What Changed

All navigation features moved from **inside the reader** to **the chapter list screen**.

**Before:**
- Open chapter → tap [#] button → page nav modal

**After:**
- Chapter list screen → tap [#] button → page nav modal → opens chapter at page

---

## 🧪 Quick Test Checklist

### 1. Verify Chapter List Header
- [ ] Open Big Book
- [ ] See chapter list with header
- [ ] Header should have:
  - **Left:** Title + subtitle
  - **Right:** Three buttons [#] [📑] [✏️]

### 2. Test Page Navigation (#)
- [ ] Tap [#] button in chapter list header
- [ ] Modal opens
- [ ] Try typing "58" → tap "Go"
- [ ] **Watch console logs** for debugging output
- [ ] Chapter 5 should open
- [ ] Should scroll to page 58

### 3. Test Bookmarks (📑)
- [ ] First, create test bookmark (use BigBookStorageExample on home screen)
- [ ] Go to chapter list
- [ ] Tap [📑] button
- [ ] Modal shows all bookmarks
- [ ] Tap a bookmark
- [ ] Correct chapter opens
- [ ] Scrolls to bookmarked paragraph

### 4. Test Highlights (✏️)
- [ ] First, create test highlight (use BigBookStorageExample on home screen)
- [ ] Go to chapter list
- [ ] Tap [✏️] button
- [ ] Modal shows all highlights
- [ ] Tap a highlight
- [ ] Correct chapter opens
- [ ] Scrolls to highlighted paragraph

### 5. Test Normal Chapter Selection
- [ ] Tap "1. Bill's Story"
- [ ] Chapter opens normally at top
- [ ] No unwanted scrolling

### 6. Test Reader Header (Simplified)
- [ ] Open any chapter
- [ ] Header should only have:
  - **Left:** [X] close button
  - **Right:** [🔍] search button
- [ ] NO [#] [📑] [✏️] buttons

### 7. Test Previous/Next Navigation
- [ ] In reader, scroll to bottom
- [ ] Tap "Next" button
- [ ] Next chapter loads
- [ ] Tap "Previous"
- [ ] Previous chapter loads

---

## 📊 Console Log Test

Open the console and look for these logs when navigating:

### Example: Page Navigation
```
[BigBookPageNavigation] handleQuickPage called with page: 58
[BigBookPageNavigation] handleNavigate called
[BigBookPageNavigation] - pageNumber arg: 58
[BigBookPageNavigation] - resolved page: 58
[BigBookPageNavigation] - Validation passed, calling onNavigateToPage
[BigBookChapterList] Navigating to page: 58
[BigBookChapterList] goToPage result: { chapterId: "chapter-5", paragraphId: "..." }
[BigBookMain] handleSelectChapter: { chapterId: "chapter-5", scrollToId: "..." }
[BigBookReader] Scrolling to paragraph on mount: ...
```

### Example: Highlight Navigation
```
[BigBookChapterList] Navigating to highlight: { chapterId: "...", paragraphId: "..." }
[BigBookMain] handleSelectChapter: { chapterId: "...", scrollToId: "..." }
[BigBookReader] Scrolling to paragraph on mount: ...
```

---

## 🐛 If Something Doesn't Work

### Page Navigation Doesn't Work
1. **Check:** Do you see `[BigBookPageNavigation]` logs?
   - **No:** Button isn't firing
   - **Yes, but stops early:** Check validation
2. **Check:** Do you see `goToPage result`?
   - **Null:** Content issue
   - **Has value:** Check if chapter opens
3. **Check:** Does chapter open but not scroll?
   - Check `scrollToParagraphId` prop
   - Check `useEffect` timing

### Highlights/Bookmarks Don't Navigate
1. **Check:** Can you open the modal?
   - **No:** Button not connected
   - **Yes:** Continue
2. **Check:** Can you tap an item?
   - **No:** TouchableOpacity blocked
   - **Yes:** Check console
3. **Check:** Do you see navigation logs?
   - **No:** Callback not passed
   - **Yes:** Check if chapter opens

### Buttons Not Visible
1. Check if you're on **chapter list** screen (not reader)
2. Check if header layout is correct (flex row with space-between)
3. Try reloading app

---

## ✅ Expected Behavior Summary

| Action | Location | Result |
|--------|----------|--------|
| Tap chapter name | Chapter list | Opens chapter at top |
| Tap [#] button | Chapter list | Opens page nav modal |
| Enter page in modal | Modal | Opens chapter at that page |
| Tap [📑] button | Chapter list | Opens bookmarks modal |
| Tap bookmark | Bookmarks modal | Opens chapter at bookmark |
| Tap [✏️] button | Chapter list | Opens highlights modal |
| Tap highlight | Highlights modal | Opens chapter at highlight |
| Tap [X] in reader | Reader header | Returns to chapter list |
| Tap [🔍] in reader | Reader header | Opens search (unchanged) |
| Tap Previous/Next | Reader footer | Navigate chapters (unchanged) |

---

## 📝 Files to Review

If you want to understand the changes:

1. **BigBookChapterList.tsx** - Where features now live
2. **BigBookMain.tsx** - Handles scroll state
3. **BigBookReader.tsx** - Simplified (removed modals)
4. **PHASE6-REFACTOR-COMPLETE.md** - Full documentation

---

**Status:** Ready for testing | **Next:** Phase 5 (Text Selection & Highlighting UI)

