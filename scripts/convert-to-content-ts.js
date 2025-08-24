const fs = require('fs');
const path = require('path');

// Script to convert the scraped 1st edition markdown files to content.ts format
function convertToContentTs() {
  const inputDir = path.join(__dirname, '..', 'constants', 'bigbook', '1st-edition-corrected');
  const outputFile = path.join(__dirname, '..', 'constants', 'bigbook', 'content-1st-edition.ts');
  
  // Mapping from file names to content.ts keys
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
    'aa-spiritual-experience.md': 'appendix-1'
  };
  
  console.log('Converting 1st edition markdown files to content.ts format...\n');
  
  let contentObject = {};
  let processedCount = 0;
  
  // Process each file
  for (const [filename, key] of Object.entries(fileMapping)) {
    const filePath = path.join(inputDir, filename);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Convert page markers from --123-- to *— Page 123 —* format for consistency
      const convertedContent = content.replace(/--(\w+)--/g, '*— Page $1 —*');
      
      contentObject[key] = convertedContent;
      console.log(`✓ Processed ${filename} → ${key}`);
      processedCount++;
    } else {
      console.log(`✗ Missing file: ${filename}`);
    }
  }
  
  // Generate the TypeScript content
  const tsContent = `// 1st Edition Big Book Content - Generated from anonpress.org
// This file contains the complete 1st edition (1939) text with proper formatting

export const bigBookTextContent = {
${Object.entries(contentObject)
  .map(([key, content]) => `  "${key}": \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\``)
  .join(',\n\n')}
};

export default bigBookTextContent;
`;

  // Write the output file
  fs.writeFileSync(outputFile, tsContent);
  
  console.log(`\n🎉 Conversion completed!`);
  console.log(`✓ Processed ${processedCount}/${Object.keys(fileMapping).length} files`);
  console.log(`✓ Created: ${outputFile}`);
  console.log(`\nFile size: ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`);
  
  // Show a sample of what was created
  console.log(`\nSample content preview:`);
  console.log(`- doctors-opinion: ${contentObject['doctors-opinion']?.substring(0, 100)}...`);
  console.log(`- chapter-1: ${contentObject['chapter-1']?.substring(0, 100)}...`);
}

// Run the conversion
convertToContentTs();
