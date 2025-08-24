const fs = require('fs');
const path = require('path');

// Clean generation script for ALL BigBook React Native files

// Input and output paths
const chaptersDir = path.join(process.cwd(), 'constants', 'bigbook', 'chapters');
const outputDir = path.join(process.cwd(), 'constants', 'bigbook', 'bigbook_all_bundle');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Utility functions
function escapeText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function readMdFile(fileName) {
  const filePath = path.join(chaptersDir, fileName);
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`Error reading ${fileName}:`, e.message);
    return null;
  }
}

function extractTitle(md) {
  const match = md.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : 'Untitled';
}

function normalizeId(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function mdToPlainText(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/---\s*\*Page \d+\*\s*---/g, '') // Remove page markers
    .replace(/\n{3,}/g, '\n\n') // Normalize whitespace
    .trim();
}

function generateTsFile(fileName, id, title, md) {
  const plainText = escapeText(mdToPlainText(md));
  
  const content = `import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  paragraph: { fontSize: 16, lineHeight: 24, marginVertical: 8, textAlign: 'justify' },
  pageNumber: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginVertical: 12, color: '#666' },
  heading: { fontSize: 24, fontWeight: 'bold', marginVertical: 16, textAlign: 'center' },
  subheading: { fontSize: 20, fontWeight: 'bold', marginVertical: 12, textAlign: 'center' },
});

export const ${toCamelCase(fileName.replace('.ts', ''))} = {
  '${id}': {
    title: "${escapeText(title)}",
    plainText: "${plainText}",
    content: (
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>${escapeText(title)}</Text>
        <Text style={styles.paragraph}>This content will be properly formatted from the markdown.</Text>
      </ScrollView>
    ),
  },
};
`;

  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, content);
  console.log(`Generated: ${fileName}`);
  return { fileName, id, title };
}

function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

// File mappings - each entry: [markdown_file, output_file, id]
const fileMapping = [
  // Frontmatter
  ['aa-preface.md', 'bigbook_frontmatter.ts', 'preface'],
  ['aa-foreword-first.md', 'bigbook_frontmatter.ts', 'foreword-first'],
  ['aa-foreword-second.md', 'bigbook_frontmatter.ts', 'foreword-second'],
  
  // Doctor's Opinion
  ['aa-doctors-opinion.md', 'bigbook_doctors_opinion.ts', 'doctors-opinion'],
  
  // Chapters
  ['aa-chapter-01-bills-story.md', 'bigbook_chapter_1.ts', 'chapter-1'],
  ['aa-chapter-02-there-is-a-solution.md', 'bigbook_chapter_2.ts', 'chapter-2'],
  ['aa-chapter-03-more-about-alcoholism.md', 'bigbook_chapter_3.ts', 'chapter-3'],
  ['aa-chapter-04-we-agnostics.md', 'bigbook_chapter_4.ts', 'chapter-4'],
  ['aa-chapter-05-how-it-works.md', 'bigbook_chapter_5.ts', 'chapter-5'],
  ['aa-chapter-06-into-action.md', 'bigbook_chapter_6.ts', 'chapter-6'],
  ['aa-chapter-07-working-with-others.md', 'bigbook_chapter_7.ts', 'chapter-7'],
  ['aa-chapter-08-to_wives.md', 'bigbook_chapter_8.ts', 'chapter-8'],
  ['aa-chapter-09-the-family-afterward.md', 'bigbook_chapter_9.ts', 'chapter-9'],
  ['aa-chapter-10-to-employers.md', 'bigbook_chapter_10.ts', 'chapter-10'],
  ['aa-chapter-11-a-vision-for-you.md', 'bigbook_chapter_11.ts', 'chapter-11'],
  
  // Appendices
  ['appendix-01.md', 'bigbook_appendices.ts', 'appendix-1'],
  ['appendix-02.md', 'bigbook_appendices.ts', 'appendix-2'],
  ['appendix-03.md', 'bigbook_appendices.ts', 'appendix-3'],
  ['appendix-04.md', 'bigbook_appendices.ts', 'appendix-4'],
  ['appendix-05.md', 'bigbook_appendices.ts', 'appendix-5'],
  ['appendix-06.md', 'bigbook_appendices.ts', 'appendix-6'],
];

// Process individual files first
const individualFiles = fileMapping.filter(([, outputFile]) => 
  !outputFile.includes('frontmatter') && !outputFile.includes('appendices')
);

console.log('Generating individual files...');
const generatedFiles = [];

individualFiles.forEach(([mdFile, outputFile, id]) => {
  const md = readMdFile(mdFile);
  if (md) {
    const title = extractTitle(md);
    const result = generateTsFile(outputFile, id, title, md);
    generatedFiles.push(result);
  }
});

// Generate combined frontmatter file
console.log('Generating frontmatter file...');
const frontmatterFiles = fileMapping.filter(([, outputFile]) => outputFile.includes('frontmatter'));
const frontmatterContent = frontmatterFiles.map(([mdFile, , id]) => {
  const md = readMdFile(mdFile);
  const title = extractTitle(md);
  const plainText = escapeText(mdToPlainText(md));
  return {
    id,
    title: escapeText(title),
    plainText,
  };
}).filter(Boolean);

if (frontmatterContent.length > 0) {
  const frontmatterExports = frontmatterContent.map(({ id, title, plainText }) => `
  '${id}': {
    title: "${title}",
    plainText: "${plainText}",
    content: (
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>${title}</Text>
        <Text style={styles.paragraph}>This content will be properly formatted from the markdown.</Text>
      </ScrollView>
    ),
  },`).join('');

  const frontmatterFile = `import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  paragraph: { fontSize: 16, lineHeight: 24, marginVertical: 8, textAlign: 'justify' },
  pageNumber: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginVertical: 12, color: '#666' },
  heading: { fontSize: 24, fontWeight: 'bold', marginVertical: 16, textAlign: 'center' },
  subheading: { fontSize: 20, fontWeight: 'bold', marginVertical: 12, textAlign: 'center' },
});

export const bigBookFrontmatter = {${frontmatterExports}
};
`;

  fs.writeFileSync(path.join(outputDir, 'bigbook_frontmatter.ts'), frontmatterFile);
  console.log('Generated: bigbook_frontmatter.ts');
}

// Generate combined appendices file
console.log('Generating appendices file...');
const appendicesFiles = fileMapping.filter(([, outputFile]) => outputFile.includes('appendices'));
const appendicesContent = appendicesFiles.map(([mdFile, , id]) => {
  const md = readMdFile(mdFile);
  const title = extractTitle(md);
  const plainText = escapeText(mdToPlainText(md));
  return {
    id,
    title: escapeText(title),
    plainText,
  };
}).filter(Boolean);

if (appendicesContent.length > 0) {
  const appendicesExports = appendicesContent.map(({ id, title, plainText }) => `
  '${id}': {
    title: "${title}",
    plainText: "${plainText}",
    content: (
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>${title}</Text>
        <Text style={styles.paragraph}>This content will be properly formatted from the markdown.</Text>
      </ScrollView>
    ),
  },`).join('');

  const appendicesFile = `import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  paragraph: { fontSize: 16, lineHeight: 24, marginVertical: 8, textAlign: 'justify' },
  pageNumber: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginVertical: 12, color: '#666' },
  heading: { fontSize: 24, fontWeight: 'bold', marginVertical: 16, textAlign: 'center' },
  subheading: { fontSize: 20, fontWeight: 'bold', marginVertical: 12, textAlign: 'center' },
});

export const bigBookAppendices = {${appendicesExports}
};
`;

  fs.writeFileSync(path.join(outputDir, 'bigbook_appendices.ts'), appendicesFile);
  console.log('Generated: bigbook_appendices.ts');
}

console.log('\nAll files generated successfully!');
console.log('Total individual files:', generatedFiles.length);
console.log('Frontmatter entries:', frontmatterContent.length);
console.log('Appendices entries:', appendicesContent.length);
