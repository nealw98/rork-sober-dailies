# Phase 5 Implementation Status

## ✅ Completed Components

### 1. Updated Data Model
**File:** `types/bigbook-v2.ts`
- Changed `BigBookHighlight` interface to use `sentenceIndex` instead of `startOffset/endOffset`
- Now stores sentence-level highlights instead of character-level

### 2. HighlightColorPicker Component
**File:** `components/bigbook-v2/HighlightColorPicker.tsx`
- Modal with 4 color options (Yellow, Green, Blue, Pink)
- Clean UI matching app design
- Handles color selection and callbacks

### 3. BigBookParagraph Component (Rewritten)
**File:** `components/bigbook-v2/BigBookParagraph.tsx`
- ✅ Parses paragraphs into sentences using `parseSentences()` function
- ✅ Maps highlights to sentence indices
- ✅ Renders sentences with highlight background colors
- ✅ Makes sentences tappable in highlight mode
- ✅ Handles tap on unhighlighted sentence (show color picker)
- ✅ Handles tap on highlighted sentence (show edit menu)
- ✅ Supports bookmark indicator with tap handler

### 4. HighlightEditMenu Component
**File:** `components/bigbook-v2/HighlightEditMenu.tsx`
- Modal for editing existing highlights
- Add/edit notes functionality
- Remove highlight button
- Clean, intuitive UI

---

## 🔄 Integration Needed: BigBookReader

The BigBookReader component needs to be updated to wire everything together. Here's what needs to be added:

### State to Add

```typescript
// Highlight mode
const [highlightMode, setHighlightMode] = useState(false);
const [selectedSentences, setSelectedSentences] = useState<{
  paragraphId: string;
  sentenceIndex: number;
  sentenceText: string;
}[]>([]);

// Color picker
const [showColorPicker, setShowColorPicker] = useState(false);

// Edit menu
const [editingHighlight, setEditingHighlight] = useState<{
  paragraphId: string;
  sentenceIndex: number;
  highlightId: string;
  currentNote?: string;
} | null>(null);

// Bookmarking
const [bookmarkingParagraphId, setBookmarkingParagraphId] = useState<string | null>(null);
```

### Handlers to Add

```typescript
// Enter/exit highlight mode
const toggleHighlightMode = () => {
  if (highlightMode) {
    // Exiting - save any pending highlights
    setSelectedSentences([]);
  }
  setHighlightMode(!highlightMode);
};

// Handle sentence tap (add to selection)
const handleSentenceTap = (paragraphId: string, sentenceIndex: number, sentenceText: string) => {
  setSelectedSentences(prev => [...prev, { paragraphId, sentenceIndex, sentenceText }]);
  setShowColorPicker(true);
};

// Handle color selection
const handleColorSelect = async (color: HighlightColor) => {
  // Save all selected sentences with this color
  for (const sentence of selectedSentences) {
    await addHighlight({
      paragraphId: sentence.paragraphId,
      chapterId: currentChapterId,
      sentenceIndex: sentence.sentenceIndex,
      color,
      textSnapshot: sentence.sentenceText,
    });
  }
  
  // Clear selection
  setSelectedSentences([]);
  setShowColorPicker(false);
  
  // Stay in highlight mode for more selections
};

// Handle highlight edit
const handleHighlightTap = (paragraphId: string, sentenceIndex: number) => {
  // Find the highlight
  const highlight = highlights.find(
    h => h.paragraphId === paragraphId && h.sentenceIndex === sentenceIndex
  );
  
  if (highlight) {
    setEditingHighlight({
      paragraphId,
      sentenceIndex,
      highlightId: highlight.id,
      currentNote: highlight.note,
    });
  }
};

// Save note to highlight
const handleSaveNote = async (note: string) => {
  if (editingHighlight) {
    await updateHighlight(editingHighlight.highlightId, { note });
    setEditingHighlight(null);
  }
};

// Remove highlight
const handleRemoveHighlight = async () => {
  if (editingHighlight) {
    await deleteHighlight(editingHighlight.highlightId);
    setEditingHighlight(null);
  }
};

// Handle bookmark tap
const handleBookmarkTap = async (paragraphId: string) => {
  const existingBookmark = bookmarks.find(b => b.paragraphId === paragraphId);
  
  if (existingBookmark) {
    // Remove bookmark
    await deleteBookmark(existingBookmark.id);
  } else {
    // Add bookmark
    await addBookmark({
      paragraphId,
      chapterId: currentChapterId,
      pageNumber: currentChapter.paragraphs.find(p => p.id === paragraphId)?.pageNumber || 0,
    });
  }
};
```

### UI Updates Needed

**1. Add Highlighter Icon to Header**
```tsx
<View style={styles.headerActions}>
  {/* Existing search button */}
  <TouchableOpacity 
    onPress={() => setShowSearch(!showSearch)} 
    style={styles.headerButton}
  >
    <SearchIcon size={20} color={Colors.light.text} />
  </TouchableOpacity>
  
  {/* NEW: Highlighter button */}
  <TouchableOpacity 
    onPress={toggleHighlightMode} 
    style={[
      styles.headerButton,
      highlightMode && styles.headerButtonActive
    ]}
  >
    <Highlighter 
      size={20} 
      color={highlightMode ? Colors.light.tint : Colors.light.text} 
    />
  </TouchableOpacity>
</View>
```

**2. Pass Props to BigBookParagraph**
```tsx
<BigBookParagraph
  paragraph={paragraph}
  highlightMode={highlightMode}
  onSentenceTap={(sentenceIndex, sentenceText) => 
    handleSentenceTap(paragraph.id, sentenceIndex, sentenceText)
  }
  onHighlightTap={(sentenceIndex) => 
    handleHighlightTap(paragraph.id, sentenceIndex)
  }
  onBookmarkTap={() => handleBookmarkTap(paragraph.id)}
/>
```

**3. Add Modals**
```tsx
{/* Color Picker Modal */}
<HighlightColorPicker
  visible={showColorPicker}
  onClose={() => {
    setShowColorPicker(false);
    setSelectedSentences([]);
  }}
  onSelectColor={handleColorSelect}
/>

{/* Highlight Edit Menu */}
<HighlightEditMenu
  visible={editingHighlight !== null}
  onClose={() => setEditingHighlight(null)}
  currentNote={editingHighlight?.currentNote}
  onSaveNote={handleSaveNote}
  onRemoveHighlight={handleRemoveHighlight}
/>
```

**4. Add Highlight Mode Indicator** (optional but recommended)
```tsx
{highlightMode && (
  <View style={styles.highlightModeBar}>
    <Text style={styles.highlightModeText}>
      Tap sentences to highlight
    </Text>
    <TouchableOpacity onPress={toggleHighlightMode}>
      <Text style={styles.highlightModeDone}>Done</Text>
    </TouchableOpacity>
  </View>
)}
```

### Imports to Add

```typescript
import { Highlighter } from 'lucide-react-native';
import { HighlightColor } from '@/types/bigbook-v2';
import { HighlightColorPicker } from './HighlightColorPicker';
import { HighlightEditMenu } from './HighlightEditMenu';
import { useHighlights } from '@/hooks/use-bigbook-highlights';
import { useBookmarks } from '@/hooks/use-bigbook-bookmarks';
```

---

## 🔄 Hook Updates Needed

### use-bigbook-highlights.ts

The hook needs to be updated to work with sentence-level highlights:

**Update `addHighlight` function:**
```typescript
const addHighlight = async (data: {
  paragraphId: string;
  chapterId: string;
  sentenceIndex: number;  // Changed from startOffset/endOffset
  color: HighlightColor;
  textSnapshot: string;
  note?: string;
}) => {
  const highlight: BigBookHighlight = {
    id: generateId(),
    paragraphId: data.paragraphId,
    chapterId: data.chapterId,
    sentenceIndex: data.sentenceIndex,
    color: data.color,
    textSnapshot: data.textSnapshot,
    note: data.note,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await storage.saveHighlight(highlight);
  await loadHighlights(); // Refresh
};
```

**The hook should export:**
- `highlights` - all highlights
- `addHighlight` - create new highlight
- `updateHighlight` - update highlight (mainly for notes)
- `deleteHighlight` - remove highlight
- `getHighlightsForParagraph` - filter by paragraph ID

---

## 📋 Implementation Checklist

### Phase 5A: Core Highlighting ✅ (Mostly Done)
- [x] Update BigBookHighlight interface for sentence-level
- [x] Create HighlightColorPicker component
- [x] Rewrite BigBookParagraph with sentence parsing
- [x] Create HighlightEditMenu component

### Phase 5B: BigBookReader Integration (TODO)
- [ ] Add highlight mode state to BigBookReader
- [ ] Add highlighter icon to header
- [ ] Wire up sentence tap handlers
- [ ] Wire up highlight edit handlers
- [ ] Add HighlightColorPicker modal
- [ ] Add HighlightEditMenu modal
- [ ] Add highlight mode indicator bar
- [ ] Test highlight mode enter/exit
- [ ] Test multi-sentence highlighting
- [ ] Test highlight editing
- [ ] Test highlight removal

### Phase 5C: Bookmark Integration (TODO)
- [ ] Add bookmark tap handler to BigBookReader
- [ ] Wire up bookmark toggle logic
- [ ] Test bookmark add/remove
- [ ] Ensure bookmark icon displays correctly

### Phase 5D: Hook Updates (TODO)
- [ ] Update use-bigbook-highlights for sentence-level
- [ ] Ensure addHighlight works with new model
- [ ] Ensure updateHighlight works (for notes)
- [ ] Ensure deleteHighlight works
- [ ] Test data persistence

---

## 🎯 User Experience Flow

### Happy Path: Create Highlight

1. **User taps highlighter icon** in header
   - Highlight mode activates
   - Optional: indicator bar appears

2. **User taps a sentence**
   - Color picker modal appears
   - Sentence is pending highlight

3. **User selects color (e.g., Yellow)**
   - Sentence is saved with yellow highlight
   - Sentence background turns yellow
   - Modal closes
   - User stays in highlight mode

4. **User taps another sentence**
   - Color picker appears again
   - Process repeats

5. **User taps "Done"** (or highlighter icon again)
   - Highlight mode deactivates
   - Returns to normal reading

### Edit Existing Highlight

1. **User taps a highlighted sentence** (in any mode)
   - Edit menu modal appears

2. **User options:**
   - Add/edit note → text input → save
   - Remove highlight → confirmation → deleted

3. **Modal closes**
   - Returns to reading

### Bookmark Paragraph

1. **User taps bookmark icon** next to paragraph
   - Bookmark is toggled (add if none, remove if exists)
   - Icon fills/unfills accordingly

---

##  Next Steps

1. **Complete BigBookReader Integration** (30-60 min)
   - Add all the state, handlers, and UI elements listed above
   - Test in simulator

2. **Update Highlight Hooks** (15-30 min)
   - Modify `addHighlight` for sentence-level
   - Test CRUD operations

3. **Manual Testing** (30 min)
   - Test highlight mode on/off
   - Test multi-sentence highlighting
   - Test color selection
   - Test note add/edit
   - Test highlight removal
   - Test bookmark toggle
   - Test data persistence (close/reopen app)

4. **Polish** (15 min)
   - Add visual feedback in highlight mode
   - Ensure smooth transitions
   - Test on both iOS and Android

---

## 🎉 Almost There!

The hard work is done - sentence parsing, color picker UI, edit menu UI, and paragraph rendering are all complete. Now we just need to wire it all together in BigBookReader!

**Estimated Time to Complete:** 1-2 hours

**What You Get:**
- ✅ Simple, reliable sentence-level highlighting
- ✅ Multiple colors for organization
- ✅ Notes on highlights
- ✅ Bookmarks
- ✅ All data persisted locally
- ✅ Clean, intuitive UX

This is a MUCH better solution than trying to implement character-level text selection with draggable handles. Users will love it! 🎯

