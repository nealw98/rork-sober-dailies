#!/usr/bin/env node

/**
 * Big Book Markdown to TypeScript Converter
 * 
 * Converts 2nd edition markdown files to structured TypeScript format
 * with automatic paragraph ID generation.
 * 
 * Usage: node scripts/convert-bigbook-to-v2.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_DIR = path.join(__dirname, '../constants/bigbook/chapters-2nd-edition-backup');
const OUTPUT_DIR = path.join(__dirname, '../constants/bigbook-v2/content');

// Mapping of input files to output format
const FILE_MAPPINGS = [
  { input: 'aa-foreword-first.md', chapterId: 'foreword-first', title: 'Foreword to First Edition', pageRange: [13, 14] },
  { input: 'aa-foreword-second.md', chapterId: 'foreword-second', title: 'Foreword to Second Edition', pageRange: [15, 18] },
  { input: 'aa-preface.md', chapterId: 'preface', title: 'Preface', pageRange: [19, 22] },
  { input: 'aa-doctors-opinion.md', chapterId: 'doctors-opinion', title: "The Doctor's Opinion", pageRange: [23, 32] },
  { input: 'aa-chapter-01-bills-story.md', chapterId: 'chapter-1', title: "Bill's Story", chapterNumber: 1, pageRange: [1, 16] },
  { input: 'aa-chapter-02-there-is-a-solution.md', chapterId: 'chapter-2', title: 'There Is a Solution', chapterNumber: 2, pageRange: [17, 29] },
  { input: 'aa-chapter-03-more-about-alcoholism.md', chapterId: 'chapter-3', title: 'More About Alcoholism', chapterNumber: 3, pageRange: [30, 43] },
  { input: 'aa-chapter-04-we-agnostics.md', chapterId: 'chapter-4', title: 'We Agnostics', chapterNumber: 4, pageRange: [44, 57] },
  { input: 'aa-chapter-05-how-it-works.md', chapterId: 'chapter-5', title: 'How It Works', chapterNumber: 5, pageRange: [58, 71] },
  { input: 'aa-chapter-06-into-action.md', chapterId: 'chapter-6', title: 'Into Action', chapterNumber: 6, pageRange: [72, 88] },
  { input: 'aa-chapter-07-working-with-others.md', chapterId: 'chapter-7', title: 'Working with Others', chapterNumber: 7, pageRange: [89, 103] },
  { input: 'aa-chapter-08-to_wives.md', chapterId: 'chapter-8', title: 'To Wives', chapterNumber: 8, pageRange: [104, 121] },
  { input: 'aa-chapter-09-the-family-afterward.md', chapterId: 'chapter-9', title: 'The Family Afterward', chapterNumber: 9, pageRange: [122, 135] },
  { input: 'aa-chapter-10-to-employers.md', chapterId: 'chapter-10', title: 'To Employers', chapterNumber: 10, pageRange: [136, 150] },
  { input: 'aa-chapter-11-a-vision-for-you.md', chapterId: 'chapter-11', title: 'A Vision for You', chapterNumber: 11, pageRange: [151, 164] },
  { input: 'appendix-01.md', chapterId: 'appendix-1', title: 'The AA Tradition', pageRange: [565, 568] },
  { input: 'appendix-02.md', chapterId: 'appendix-2', title: 'Spiritual Experience', pageRange: [569, 570] },
  { input: 'appendix-03.md', chapterId: 'appendix-3', title: 'The Medical View on AA', pageRange: [571, 572] },
  { input: 'appendix-04.md', chapterId: 'appendix-4', title: 'The Lasker Award', pageRange: [573, 574] },
  { input: 'appendix-05.md', chapterId: 'appendix-5', title: 'The Religious View on AA', pageRange: [575, 577] },
  { input: 'appendix-06.md', chapterId: 'appendix-6', title: 'How to Get in Touch with AA', pageRange: [578, 579] },
];

/**
 * Parse page marker from markdown
 * Supports formats like: --- *Page 1* ---, --1--, Page 1, etc.
 */
function parsePageMarker(line) {
  // Match patterns like "--- *Page 1* ---", "--1--", "Page 1"
  const patterns = [
    /---\s*\*?Page\s+(\d+)\*?\s*---/i,
    /--(\d+)--/,
    /^\*?Page\s+(\d+)\*?$/i,
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return null;
}

/**
 * Clean and normalize paragraph content
 */
function cleanContent(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/â€"/g, '—') // Fix em-dash encoding
    .replace(/â€™/g, "'") // Fix apostrophe encoding
    .replace(/â€œ/g, '"') // Fix left double quote
    .replace(/â€\u009d/g, '"'); // Fix right double quote
}

/**
 * Convert markdown file to TypeScript structured format
 */
function convertMarkdownToTS(filePath, config) {
  console.log(`\nConverting: ${config.input}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const paragraphs = [];
  let currentPage = config.pageRange[0]; // Start with first page of range
  let currentParagraph = '';
  let paragraphCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      continue;
    }
    
    // Skip markdown headers (# and ##)
    if (line.startsWith('#')) {
      continue;
    }
    
    // Check for page markers
    const pageNum = parsePageMarker(line);
    if (pageNum !== null) {
      // Save current paragraph if exists
      if (currentParagraph) {
        paragraphCount++;
        paragraphs.push({
          id: `${config.chapterId}-p${paragraphCount}`,
          chapterId: config.chapterId,
          pageNumber: currentPage,
          order: paragraphCount,
          content: cleanContent(currentParagraph),
        });
        currentParagraph = '';
      }
      
      // Update current page
      currentPage = pageNum;
      continue;
    }
    
    // Skip page range indicators like "**Pages 1-16**"
    if (line.match(/\*\*Pages?\s+[\d\-]+\*\*/i)) {
      continue;
    }
    
    // If line looks like a new paragraph (not continuation), save previous
    if (currentParagraph && !line.match(/^[a-z]/)) {
      paragraphCount++;
      paragraphs.push({
        id: `${config.chapterId}-p${paragraphCount}`,
        chapterId: config.chapterId,
        pageNumber: currentPage,
        order: paragraphCount,
        content: cleanContent(currentParagraph),
      });
      currentParagraph = line;
    } else {
      // Continue building current paragraph
      currentParagraph += (currentParagraph ? ' ' : '') + line;
    }
  }
  
  // Save final paragraph
  if (currentParagraph) {
    paragraphCount++;
    paragraphs.push({
      id: `${config.chapterId}-p${paragraphCount}`,
      chapterId: config.chapterId,
      pageNumber: currentPage,
      order: paragraphCount,
      content: cleanContent(currentParagraph),
    });
  }
  
  console.log(`  ✓ Extracted ${paragraphs.length} paragraphs`);
  
  return {
    id: config.chapterId,
    title: config.title,
    chapterNumber: config.chapterNumber,
    pageRange: config.pageRange,
    paragraphs,
  };
}

/**
 * Generate TypeScript file content
 */
function generateTSFile(chapter) {
  const chapterNumberLine = chapter.chapterNumber 
    ? `  chapterNumber: ${chapter.chapterNumber},\n` 
    : '';
  
  const paragraphsCode = chapter.paragraphs.map(p => {
    // Escape single quotes and backslashes in content
    const escapedContent = p.content
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');
    
    return `    {
      id: '${p.id}',
      chapterId: '${p.chapterId}',
      pageNumber: ${p.pageNumber},
      order: ${p.order},
      content: '${escapedContent}',
    }`;
  }).join(',\n');
  
  return `import { BigBookChapter } from '@/types/bigbook-v2';

/**
 * ${chapter.title}
 * ${chapter.chapterNumber ? `Chapter ${chapter.chapterNumber}` : ''}
 * Pages ${chapter.pageRange[0]}-${chapter.pageRange[1]}
 */

export const ${chapter.id.replace(/-/g, '_')}: BigBookChapter = {
  id: '${chapter.id}',
  title: '${chapter.title}',
${chapterNumberLine}  pageRange: [${chapter.pageRange[0]}, ${chapter.pageRange[1]}],
  paragraphs: [
${paragraphsCode}
  ],
};
`;
}

/**
 * Main conversion process
 */
function main() {
  console.log('Big Book Markdown to TypeScript Converter');
  console.log('==========================================\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}\n`);
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  // Convert each file
  for (const mapping of FILE_MAPPINGS) {
    const inputPath = path.join(INPUT_DIR, mapping.input);
    const outputFileName = `${mapping.chapterId}.ts`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    
    try {
      if (!fs.existsSync(inputPath)) {
        console.log(`⚠ Skipping ${mapping.input} (file not found)`);
        continue;
      }
      
      const chapter = convertMarkdownToTS(inputPath, mapping);
      const tsCode = generateTSFile(chapter);
      
      fs.writeFileSync(outputPath, tsCode, 'utf-8');
      console.log(`  ✓ Saved to: ${outputFileName}`);
      successCount++;
      
    } catch (error) {
      console.error(`  ✗ Error converting ${mapping.input}:`, error.message);
      errorCount++;
    }
  }
  
  // Generate index file
  console.log('\nGenerating index file...');
  const indexContent = generateIndexFile();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent, 'utf-8');
  console.log('  ✓ Created index.ts');
  
  // Summary
  console.log('\n==========================================');
  console.log(`Conversion complete!`);
  console.log(`  Success: ${successCount} files`);
  console.log(`  Errors: ${errorCount} files`);
  console.log(`  Output: ${OUTPUT_DIR}`);
}

/**
 * Generate index.ts file that exports all chapters
 */
function generateIndexFile() {
  const imports = FILE_MAPPINGS.map(m => {
    const varName = m.chapterId.replace(/-/g, '_');
    return `import { ${varName} } from './${m.chapterId}';`;
  }).join('\n');
  
  const exports = FILE_MAPPINGS.map(m => {
    const varName = m.chapterId.replace(/-/g, '_');
    return `  '${m.chapterId}': ${varName},`;
  }).join('\n');
  
  return `/**
 * Big Book V2 Content Index
 * 
 * Exports all chapters in structured format.
 */

import { BigBookChapter } from '@/types/bigbook-v2';

${imports}

export const bigBookContent: Record<string, BigBookChapter> = {
${exports}
};

/**
 * Get a specific chapter by ID
 */
export function getChapter(chapterId: string): BigBookChapter | undefined {
  return bigBookContent[chapterId];
}

/**
 * Get all chapters as an array
 */
export function getAllChapters(): BigBookChapter[] {
  return Object.values(bigBookContent);
}
`;
}

// Run the converter
main();

