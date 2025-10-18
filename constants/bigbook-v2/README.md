# Big Book V2 - Premium Reader

This directory contains the structured content and metadata for the premium Big Book Reader feature.

## Phase 1 Complete ✓

Phase 1 has been implemented with the following components:

### Files Created

1. **Access Control**
   - `lib/first-install-tracker.ts` - Tracks first install date for grandfathering
   - `lib/bigbook-access.ts` - Checks if user has access (grandfathered OR subscribed)

2. **Data Models**
   - `types/bigbook-v2.ts` - TypeScript interfaces for chapters, paragraphs, highlights, bookmarks

3. **Content Structure**
   - `constants/bigbook-v2/metadata.ts` - Chapter metadata (titles, page ranges)
   - `constants/bigbook-v2/content/preface.ts` - Sample structured chapter
   - `constants/bigbook-v2/content/index.ts` - Content index (partial)

4. **Conversion Tools**
   - `scripts/convert-bigbook-to-v2.py` - Python script to convert all markdown files
   - `scripts/convert-bigbook-to-v2.js` - JavaScript version (alternative)
   - `scripts/test-bigbook-access.ts` - Test script for access control

5. **Integration**
   - `app/_layout.tsx` - Updated to initialize first install tracking on app launch

## Next Steps

### Complete Phase 1: Run Content Conversion

To convert all Big Book markdown files to structured TypeScript:

```bash
cd /Users/nealwagner/Projects/rork-sober-dailies-main
python3 scripts/convert-bigbook-to-v2.py
```

This will:
- Convert all 21 chapters/sections from markdown to TypeScript
- Extract paragraphs with automatic ID generation
- Parse page numbers from markdown markers
- Fix encoding issues (em-dashes, quotes)
- Generate complete `content/index.ts` file

**Expected Output:**
- 21 TypeScript files in `constants/bigbook-v2/content/`
- Each file contains a `BigBookChapter` with structured paragraphs
- Updated `content/index.ts` with all exports

### Testing Phase 1

1. **Test Access Control:**
   - Launch the app and check console logs
   - Look for `[FirstInstall]` logs showing date initialization
   - Navigate to Big Book (once UI is built) and check `[BigBookAccess]` logs

2. **Test Grandfathering:**
   - Current users will have `firstInstallDate` < `BIG_BOOK_LAUNCH_DATE` (Jan 29, 2025)
   - They should get access even without subscription

3. **Test Subscription Check:**
   - Users installed after launch date need active subscription
   - Make a test purchase and verify access is granted

## Architecture

### Data Flow

```
User Opens Big Book
    ↓
Check hasBigBookAccess()
    ↓
├─ installed before Jan 29, 2025? → YES → Grant Access
└─ has active subscription? → YES → Grant Access
    └─ NO → Show free PDF link (aa.org)
```

### Content Structure

```typescript
BigBookChapter {
  id: "chapter-1"
  title: "Bill's Story"
  chapterNumber: 1
  pageRange: [1, 16]
  paragraphs: [
    {
      id: "chapter-1-p1"
      pageNumber: 1
      order: 1
      content: "WAR FEVER ran high..."
    },
    ...
  ]
}
```

### Storage (Future Phases)

- Phase 3 will create storage services for highlights/bookmarks
- Architecture supports future cloud sync without component rewrites
- Currently uses AsyncStorage, abstracted behind service interface

## Configuration

### Launch Date

```typescript
// lib/bigbook-access.ts
export const BIG_BOOK_LAUNCH_DATE = new Date('2025-01-29T00:00:00.000Z');
```

Users who installed before this date get free lifetime access.

### Metadata

All chapter metadata (titles, page ranges, descriptions) is in:
```
constants/bigbook-v2/metadata.ts
```

## Development Notes

- Content is frozen (2nd Edition Big Book text)
- Manual paragraph IDs ensure stability
- TypeScript files provide compile-time safety
- No runtime parsing overhead
- Support for 4 highlight colors (yellow, green, blue, pink)
- Bookmarks reference specific paragraphs
- Search will reuse existing functionality

## Next Phases

- **Phase 2:** Storage services and hooks
- **Phase 3:** Core reader UI
- **Phase 4:** Text selection and highlighting
- **Phase 5:** Bookmarks and navigation
- **Phase 6:** Integration and migration

See `/big-book-premium-reader.plan.md` for complete implementation plan.

