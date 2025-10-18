# Page Bookmarks Testing Guide - 5 Minutes

## Quick Test (All Core Features)

### 1. Create Bookmark (1 min)
- [ ] Open Big Book → Select "Bill's Story"
- [ ] Scroll to page 3
- [ ] **Check:** Header shows "Bill's Story • Page 3"
- [ ] **Check:** Bookmark icon is blank/outline
- [ ] Tap bookmark icon
- [ ] **Check:** Dialog says "Bookmark Page 3"
- [ ] Type label: "Test"
- [ ] Tap "Save Bookmark"
- [ ] **Check:** Icon is now filled ✅

### 2. Edit Bookmark (1 min)
- [ ] Stay on page 3 (already bookmarked)
- [ ] **Check:** Icon is filled
- [ ] Tap bookmark icon
- [ ] **Check:** Dialog says "Edit Bookmark"
- [ ] **Check:** Label shows "Test"
- [ ] Change to "Updated"
- [ ] Tap "Update Bookmark"
- [ ] **Check:** Saved ✅

### 3. Navigate from Bookmarks (2 min)
- [ ] Create another bookmark on page 10
- [ ] Go back to chapter list
- [ ] Tap 📑 (Bookmarks button)
- [ ] **Check:** Both bookmarks appear
- [ ] **Check:** "Page 3" and "Page 10" are prominent
- [ ] Tap "Page 10"
- [ ] **Check:** Reader opens to "Bill's Story • Page 10"
- [ ] **Check:** At top of page 10 ✅

### 4. Remove Bookmark (1 min)
- [ ] Go to page 3
- [ ] Tap filled bookmark icon
- [ ] Tap "Remove Bookmark" (red button)
- [ ] **Check:** Icon is now blank
- [ ] Go to bookmarks list
- [ ] **Check:** Page 3 is gone ✅

---

## Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| **Tap blank bookmark** | Dialog opens: "Bookmark Page X" |
| **Save bookmark** | Icon fills, bookmark appears in list |
| **Tap filled bookmark** | Dialog opens: "Edit Bookmark" |
| **Update label** | Label changes in bookmarks list |
| **Remove bookmark** | Icon blanks, bookmark removed from list |
| **Tap bookmark in list** | Opens to top of that page |
| **Scroll through pages** | Icon fills/blanks based on page |

---

## Bug Watch

### If bookmark icon doesn't fill:
- Check console for errors
- Verify `isPageBookmarked` function works
- Check `currentPageNumber` state is set

### If dialog doesn't open:
- Check `showBookmarkDialog` state
- Verify `handleBookmarkPress` is called
- Check bookmark icon `onPress` handler

### If navigation doesn't work:
- Check `goToPage` returns correct result
- Verify `onSelectChapter` receives chapter and paragraph
- Check scroll-to-paragraph logic executes

### If bookmarks don't persist:
- Check AsyncStorage is working
- Verify storage service saves correctly
- Check bookmarks are loaded on mount

---

## Success Criteria ✅

- **Creation:** Can create bookmarks with optional labels
- **Icon State:** Icon reflects bookmark status (blank/filled)
- **Editing:** Can edit labels and remove bookmarks
- **Navigation:** Tapping bookmark goes to top of that page
- **Persistence:** Bookmarks survive app restart
- **Display:** Page numbers are prominent in list

**If all pass:** System is working correctly! 🎉

