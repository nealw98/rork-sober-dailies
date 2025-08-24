const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Verbatim Text Extractor for anonpress.org Big Book 1st Edition
 * Zero interpretation - preserve exact structure and content
 */

const fetchPage = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

// Extract text while preserving paragraph structure and removing navigation
const extractVerbatimText = (html) => {
  // Remove scripts, styles, and comments first
  let text = html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<!--.*?-->/gs, '');
  
  // Remove navigation elements and page headers
  text = text
    .replace(/<P align=right>Page \d+<\/P>/gi, '') // Remove "Page X" headers
    .replace(/<a href="[^"]*"><img[^>]*alt="Next Page"[^>]*><\/A>/gi, '') // Remove Next Page buttons
    .replace(/<P align=right><a href="[^"]*">[^<]*<\/a><\/P>/gi, '') // Remove right-aligned navigation links
    .replace(/<font[^>]*><\/font>/gi, '') // Remove empty font tags
    .replace(/<dl><dd>/gi, '') // Remove definition list navigation
    .replace(/<\/dd><\/dl>/gi, ''); // Close definition lists
  
  // Convert HTML entities to text
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&#151;/g, '—') // Em dash
    .replace(/&#150;/g, '–') // En dash
    .replace(/&#8217;/g, "'") // Right single quote
    .replace(/&#8216;/g, "'") // Left single quote
    .replace(/&#8221;/g, '"') // Right double quote
    .replace(/&#8220;/g, '"'); // Left double quote
  
  // Convert block elements to paragraph breaks
  text = text
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/center>/gi, '\n\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Clean up whitespace while preserving paragraph structure
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0) // Remove empty lines
    .join('\n\n') // Join with double newlines for proper paragraphs
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();
  
  // Remove website navigation text patterns and book page headers
  text = text
    .replace(/^Page \d+$/gm, '') // Remove standalone "Page X" lines
    .replace(/^Chapter \d+$/gm, '') // Remove standalone "Chapter X" lines that are navigation
    .replace(/^Alcoholics Anonymous$/gm, '') // Remove page headers from original book
    .replace(/^\s*$/gm, '') // Remove lines with only whitespace
    .replace(/\n{3,}/g, '\n\n') // Clean up extra newlines again
    .trim();
  
  return text;
};

// Test extraction with a single page first
const testSinglePage = async (pageNum) => {
  try {
    const url = `https://anonpress.org/bb/Page_${pageNum}.htm`;
    console.log(`Testing extraction for page ${pageNum}...`);
    
    const html = await fetchPage(url);
    const text = extractVerbatimText(html);
    
    console.log(`✓ Extracted ${text.length} characters from page ${pageNum}`);
    
    // Save for inspection
    fs.writeFileSync(`./test-page-${pageNum}-extracted.txt`, text);
    console.log(`✓ Saved to: test-page-${pageNum}-extracted.txt`);
    
    return text;
    
  } catch (error) {
    console.error(`❌ Error extracting page ${pageNum}:`, error.message);
    return '';
  }
};

// Extract special sections (foreword, doctor's opinion) with proper formatting
const extractSpecialSection = async (sectionInfo) => {
  try {
    console.log(`Extracting ${sectionInfo.title}...`);
    
    const url = `https://anonpress.org/bb/${sectionInfo.file}`;
    const html = await fetchPage(url);
    let text = extractVerbatimText(html);
    
    // Additional cleanup for special sections
    text = text
      .replace(/^FOREWORD TO FIRST EDITION$/gm, '') // Remove duplicate title
      .replace(/^THE DOCTOR'S OPINION$/gm, '') // Remove duplicate title
      .replace(/^\s*\n/gm, '') // Remove lines with only whitespace
      .trim();
    
    const content = `# ${sectionInfo.title}\n\n${text}`;
    return content;
    
  } catch (error) {
    console.error(`❌ Error extracting ${sectionInfo.title}:`, error.message);
    return `# ${sectionInfo.title}\n\n[ERROR: Could not extract content]`;
  }
};

// Extract a full chapter with proper formatting
const extractChapter = async (chapterInfo) => {
  console.log(`\nExtracting ${chapterInfo.title}...`);
  
  let chapterContent = '';
  
  // Add chapter header
  if (chapterInfo.num) {
    chapterContent = `# Chapter ${chapterInfo.num}\n\n## ${chapterInfo.title}\n\n`;
  } else {
    chapterContent = `# ${chapterInfo.title}\n\n`;
  }
  
  // Extract each page
  for (let pageNum = chapterInfo.startPage; pageNum <= chapterInfo.endPage; pageNum++) {
    try {
      console.log(`  Extracting page ${pageNum}...`);
      
      const url = `https://anonpress.org/bb/Page_${pageNum}.htm`;
      const html = await fetchPage(url);
      let text = extractVerbatimText(html);
      
      // Additional cleanup for chapter pages
      text = text
        .replace(new RegExp(`^${chapterInfo.title}$`, 'gm'), '') // Remove duplicate chapter title
        .replace(/^BILL'S STORY$/gm, '') // Remove duplicate section titles
        .replace(/^THERE IS A SOLUTION$/gm, '')
        .replace(/^MORE ABOUT ALCOHOLISM$/gm, '')
        .replace(/^WE AGNOSTICS$/gm, '')
        .replace(/^HOW IT WORKS$/gm, '')
        .replace(/^INTO ACTION$/gm, '')
        .replace(/^WORKING WITH OTHERS$/gm, '')
        .replace(/^TO WIVES$/gm, '')
        .replace(/^THE FAMILY AFTERWARD$/gm, '')
        .replace(/^TO EMPLOYERS$/gm, '')
        .replace(/^A VISION FOR YOU$/gm, '')
        .replace(/^\s*\n/gm, '') // Remove lines with only whitespace
        .trim();
      
      // Only add content if there's meaningful text
      if (text.length > 0) {
        chapterContent += `--- *Page ${pageNum}* ---\n\n${text}\n\n`;
      } else {
        console.log(`  ⚠️  Page ${pageNum} appears to be mostly navigation - skipping`);
      }
      
      // Respectful delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  ❌ Error on page ${pageNum}:`, error.message);
      chapterContent += `--- *Page ${pageNum}* ---\n\n[ERROR: Could not extract page ${pageNum}]\n\n`;
    }
  }
  
  return chapterContent;
};

// Content definitions for 1st edition
const SPECIAL_SECTIONS = [
  { id: 'foreword-first', title: 'FOREWORD TO FIRST EDITION', file: 'foreword.htm' },
  { id: 'doctors-opinion', title: 'THE DOCTOR\'S OPINION', file: 'docsopin.htm' },
  { id: 'appendix-2', title: 'SPIRITUAL EXPERIENCE', file: 'Spiritualexperience.htm' }
];

const CHAPTERS = [
  { id: 'chapter-1', num: 1, title: 'BILL\'S STORY', startPage: 1, endPage: 16 },
  { id: 'chapter-2', num: 2, title: 'THERE IS A SOLUTION', startPage: 17, endPage: 29 },
  { id: 'chapter-3', num: 3, title: 'MORE ABOUT ALCOHOLISM', startPage: 30, endPage: 43 },
  { id: 'chapter-4', num: 4, title: 'WE AGNOSTICS', startPage: 44, endPage: 57 },
  { id: 'chapter-5', num: 5, title: 'HOW IT WORKS', startPage: 58, endPage: 71 },
  { id: 'chapter-6', num: 6, title: 'INTO ACTION', startPage: 72, endPage: 88 },
  { id: 'chapter-7', num: 7, title: 'WORKING WITH OTHERS', startPage: 89, endPage: 103 },
  { id: 'chapter-8', num: 8, title: 'TO WIVES', startPage: 104, endPage: 121 },
  { id: 'chapter-9', num: 9, title: 'THE FAMILY AFTERWARD', startPage: 122, endPage: 135 },
  { id: 'chapter-10', num: 10, title: 'TO EMPLOYERS', startPage: 136, endPage: 150 },
  { id: 'chapter-11', num: 11, title: 'A VISION FOR YOU', startPage: 151, endPage: 164 }
];

// Main extraction function
const extractAll = async () => {
  const outputDir = './constants/bigbook/chapters-1st-edition-extracted';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('🚀 Starting Big Book 1st Edition extraction...\n');
  
  // Extract special sections first
  for (const section of SPECIAL_SECTIONS) {
    try {
      const content = await extractSpecialSection(section);
      
      const filename = `aa-${section.id}.md`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`✅ Created: ${filename}`);
      
      // Delay between sections
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing ${section.title}:`, error.message);
    }
  }
  
  // Extract chapters
  for (const chapter of CHAPTERS) {
    try {
      const content = await extractChapter(chapter);
      
      const filename = `aa-${chapter.id}.md`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`✅ Created: ${filename}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${chapter.title}:`, error.message);
    }
  }
  
  console.log('\n🎉 Extraction complete!');
  console.log(`📁 Files saved to: ${outputDir}`);
  console.log('\n📝 Next steps:');
  console.log('1. Review the extracted files');
  console.log('2. Compare with your existing files');
  console.log('3. Replace existing files if quality is good');
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'test') {
    const pageNum = parseInt(args[1]) || 1;
    testSinglePage(pageNum);
  } else if (args[0] === 'chapter') {
    const chapterNum = parseInt(args[1]);
    if (chapterNum && chapterNum >= 1 && chapterNum <= 11) {
      const chapter = CHAPTERS[chapterNum - 1];
      extractChapter(chapter).then(content => {
        console.log(`✅ Chapter ${chapterNum} extracted (${content.length} characters)`);
        fs.writeFileSync(`./test-chapter-${chapterNum}.md`, content);
        console.log(`💾 Saved to: test-chapter-${chapterNum}.md`);
      });
    } else {
      console.log('Usage: node scripts/extract-bigbook-1st-edition.js chapter <1-11>');
    }
  } else if (args[0] === 'all') {
    extractAll();
  } else {
    console.log('Big Book 1st Edition Extractor');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/extract-bigbook-1st-edition.js test [page]    # Test single page');
    console.log('  node scripts/extract-bigbook-1st-edition.js chapter <1-11> # Extract one chapter');
    console.log('  node scripts/extract-bigbook-1st-edition.js all            # Extract everything');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/extract-bigbook-1st-edition.js test 1        # Test page 1');
    console.log('  node scripts/extract-bigbook-1st-edition.js chapter 5     # Extract Chapter 5');
    console.log('  node scripts/extract-bigbook-1st-edition.js all           # Extract all content');
  }
}

module.exports = { extractVerbatimText, extractChapter, testSinglePage, extractAll };
