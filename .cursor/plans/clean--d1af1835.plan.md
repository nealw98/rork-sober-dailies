<!-- d1af1835-c40b-4766-bab7-c93c14cecbfe af9201f3-2b3b-42c8-a967-ad0a8e88631e -->
# Replace Corrupted Big Book Text with Clean Version

## Overview

Extract chapters 1-11 from the clean `aa.txt` file and match them to existing corrupted TypeScript files to transfer page numbers, resulting in clean text with accurate pagination.

## Approach

### 1. Parse Clean Text File

- Read `aa.txt` and split into 11 chapters based on "Chapter N" markers
- Split each chapter into paragraphs (blank line separated, indented first lines)
- Store clean paragraphs in memory

### 2. Load Corrupted Chapter Files

- Read existing TypeScript files: `chapter-1.ts` through `chapter-11.ts`
- Extract paragraph content and page numbers
- Build lookup structure: `[{ content, pageNumber, order }]`

### 3. Match Paragraphs (Fuzzy Matching)

- For each corrupted paragraph:
- Normalize text (remove extra spaces, lowercase, strip punctuation)
- Find best match in clean paragraphs using similarity scoring
- Use threshold of 80% similarity
- Transfer page number from corrupted → clean paragraph

### 4. Generate New TypeScript Files

- Create new chapter files with clean text + transferred page numbers
- Maintain same structure as existing files:
- Import statement
- Chapter metadata (id, title, chapterNumber, pageRange)
- Paragraphs array with proper escaping
- Overwrite existing `chapter-1.ts` through `chapter-11.ts`

### 5. Validation

- Check each chapter has continuous page numbering
- Verify paragraph count is reasonable
- Spot check a few paragraphs for clean text (no "w arnings", "SOLU- TION", etc.)

## Key Files

**Input:**

- `/Users/nealwagner/Projects/rork-sober-dailies/aa.txt` - Clean text source
- `/Users/nealwagner/Projects/rork-sober-dailies/constants/bigbook-v2/content/chapter-[1-11].ts` - Corrupted files with page numbers

**Output:**

- Overwrite all 11 chapter TypeScript files with clean content

## Notes

- Front matter (Preface, Forewords, Doctor's Opinion) and Appendices will be edited manually by user
- Italics formatting skipped for now (user will handle separately)
- Table on page 65 will need markdown rendering solution later (separate task)

### To-dos

- [ ] Parse aa.txt into 11 chapters with clean paragraphs
- [ ] Extract paragraphs and page numbers from existing chapter-[1-11].ts files
- [ ] Match corrupted paragraphs to clean paragraphs and transfer page numbers
- [ ] Generate new TypeScript files with clean text and accurate page numbers
- [ ] Validate output for clean text and proper pagination