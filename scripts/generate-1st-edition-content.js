const fs = require('fs');
const path = require('path');

console.log('Generating complete 1st edition content.ts from chapters folder...');

const chaptersDir = path.join(__dirname, '..', 'constants', 'bigbook', 'chapters');
const outputFile = path.join(__dirname, '..', 'constants', 'bigbook', 'content.ts');

// Map file names to content keys
const fileMapping = {
  'aa-doctors-opinion.md': 'doctors-opinion',
  'aa-foreword-first.md': 'foreword-first', 
  'aa-chapter-1.md': 'chapter-1',
  'aa-chapter-2.md': 'chapter-2',
  'aa-chapter-3.md': 'chapter-3',
  'aa-chapter-4.md': 'chapter-4',
  'aa-chapter-5.md': 'chapter-5',
  'aa-chapter-6.md': 'chapter-6',
  'aa-chapter-7.md': 'chapter-7',
  'aa-chapter-8.md': 'chapter-8',
  'aa-chapter-9.md': 'chapter-9',
  'aa-chapter-10.md': 'chapter-10',
  'aa-chapter-11.md': 'chapter-11',
  'appendix-spiritual-experience.md': 'appendix-1'
};

function convertPageMarkers(content) {
  // Convert *— Page X —* format to the standard format
  return content.replace(/\*— Page (\w+) —\*/g, '*— Page $1 —*');
}

function generateContent() {
  const contentEntries = [];
  let processedCount = 0;

  for (const [filename, contentKey] of Object.entries(fileMapping)) {
    const filePath = path.join(chaptersDir, filename);
    
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Convert page markers to consistent format
        content = convertPageMarkers(content);
        
        // Escape backticks and template literals
        content = content.replace(/`/g, '\\`').replace(/\${/g, '\\${');
        
        contentEntries.push(`  "${contentKey}": \`${content}\``);
        console.log(`✓ Processed ${filename} → ${contentKey}`);
        processedCount++;
      } catch (error) {
        console.error(`✗ Error processing ${filename}:`, error.message);
      }
    } else {
      console.log(`⚠ File not found: ${filename}`);
    }
  }

  // Generate the complete content.ts file
  const fileContent = `// Big Book Markdown Content - 1st Edition (1939)
// Generated from markdown files in chapters folder

export const markdownContent: Record<string, string> = {
${contentEntries.join(',\n')}
};

// Compatibility export for existing code
export const allMarkdownContent = markdownContent;
`;

  fs.writeFileSync(outputFile, fileContent, 'utf8');
  
  const stats = fs.statSync(outputFile);
  const fileSizeKB = (stats.size / 1024).toFixed(1);
  
  console.log(`\\n🎉 Generation completed!`);
  console.log(`✓ Processed ${processedCount}/${Object.keys(fileMapping).length} files`);
  console.log(`✓ Created: ${outputFile}`);
  console.log(`\\nFile size: ${fileSizeKB} KB`);
  
  // Show preview of first entry
  const firstKey = Object.values(fileMapping)[0];
  const previewContent = contentEntries[0].substring(0, 150);
  console.log(`\\nSample content preview:`);
  console.log(`- ${firstKey}: ${previewContent}...`);
  
  return true;
}

try {
  generateContent();
  console.log('\\n✅ 1st edition content.ts generation successful!');
} catch (error) {
  console.error('\\n❌ Error generating content.ts:', error);
  process.exit(1);
}
