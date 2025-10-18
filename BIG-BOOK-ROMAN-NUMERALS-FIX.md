# Big Book Roman Numerals Fix

## Problem
Roman numeral pages in the Big Book were displaying incorrectly:
1. Header showed arabic numbers (Page 13, Page 15) instead of roman numerals (Page xiii, Page xv)
2. Page markers were showing in text content - `**Pages xiii–xiv**` and `--- *Page xvi* ---`
3. These markers needed to be hidden from users

## Solution Implemented

### 1. Created Page Utilities (`lib/bigbook-page-utils.ts`)
- `arabicToRoman(num)` - Converts arabic numerals (13) to roman numerals (xiii)
- `isPageMarker(content)` - Detects page marker paragraphs
  - Matches `**Pages xiii–xiv**` format
  - Matches `--- *Page xvi* ---` format
- `formatPageNumber(pageNumber, useRomanNumerals)` - Formats page numbers for display

### 2. Updated Type Definitions (`types/bigbook-v2.ts`)
- Added `useRomanNumerals?: boolean` to `BigBookChapterMeta` interface
- Indicates whether a chapter uses roman numeral page numbers

### 3. Updated Chapter Metadata (`constants/bigbook-v2/metadata.ts`)
- Marked front matter chapters with `useRomanNumerals: true`:
  - Foreword to First Edition (xiii-xiv)
  - Foreword to Second Edition (xv-xxii)
  - Preface (xi-xii)
  - The Doctor's Opinion (xxv-xxxii)
- Main chapters (1-11) and appendices use arabic numerals (default)

### 4. Updated BigBookParagraph Component
- Added import for `isPageMarker` utility
- Added check at start of component:
  ```typescript
  if (isPageMarker(paragraph.content)) {
    return null; // Don't render page markers
  }
  ```
- Page markers are now hidden from readers

### 5. Updated BigBookReader Component
- Added imports for `getChapterMeta` and `formatPageNumber`
- Updated page number display to use roman numerals for front matter:
  ```typescript
  Page {formatPageNumber(
    currentPageNumber, 
    getChapterMeta(currentChapterId)?.useRomanNumerals || false
  )}
  ```

## Results

### Before
- Header: "Page 13" for Foreword
- Page markers visible in text: `**Pages xiii–xiv**`
- Confusing numbering for front matter

### After
- Header: "Page xiii" for Foreword ✅
- Page markers hidden from view ✅
- Correct roman numerals for front matter ✅
- Correct arabic numerals for main chapters ✅

## Technical Details

### Roman Numeral Conversion
The `arabicToRoman` function handles numbers 1-3999:
- 11 → xi
- 13 → xiii
- 15 → xv
- 25 → xxv
- Lowercase output matching Big Book style

### Page Marker Detection
Regex patterns match:
- `**Pages xiii–xiv**`
- `**Page xv**`
- `--- *Page xvi* ---`
- Case-insensitive
- Handles various dash types (–, —, -)

### Chapter Classification
Front matter chapters (use roman numerals):
- foreword-first
- foreword-second
- preface
- doctors-opinion

Main content (use arabic numerals):
- chapter-1 through chapter-11
- appendix-1 through appendix-6

## Files Modified

1. `/lib/bigbook-page-utils.ts` - NEW utility file
2. `/types/bigbook-v2.ts` - Added `useRomanNumerals` flag
3. `/constants/bigbook-v2/metadata.ts` - Marked front matter chapters
4. `/components/bigbook-v2/BigBookParagraph.tsx` - Filter page markers
5. `/components/bigbook-v2/BigBookReader.tsx` - Display roman numerals

## Testing Checklist

✅ Page markers hidden from text
✅ Foreword shows "Page xiii" not "Page 13"
✅ Preface shows "Page xi" not "Page 11"
✅ Doctor's Opinion shows "Page xxv" not "Page 25"
✅ Main chapters still show arabic numerals (Page 1, Page 2, etc.)
✅ Page navigation still works correctly
✅ Bookmarks use correct page numbers
✅ No linter errors

---

**Result**: Big Book now displays page numbers correctly with roman numerals for front matter and arabic numerals for main content! 📖

