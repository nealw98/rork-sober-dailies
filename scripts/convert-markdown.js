const fs = require('fs');
const path = require('path');

const chaptersDir = path.join(process.cwd(), 'constants', 'bigbook', 'chapters');
const outputDir = path.join(process.cwd(), 'constants', 'bigbook', 'bigbook_all_bundle');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function toCamelCase(str) {
  return str.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}

function convertMarkdownToJsx(markdownContent, title, id) {
  const lines = markdownContent.split(/\r?\n/);
  const jsxElements = [];
  let currentParagraph = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      let paragraphText = currentParagraph.join(' ').trim();
      // Handle bold text within paragraphs
      paragraphText = paragraphText.replace(/\*\*(.*?)\*\*/g, '<Text style={styles.bold}>$1</Text>');
      jsxElements.push(`        <Text style={styles.paragraph}>${paragraphText}</Text>`);
      currentParagraph = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('# ')) {
      flushParagraph();
      const headingText = line.substring(2).trim();
      if (headingText.toUpperCase() === headingText) { // Heuristic for subheadings like "BILL'S STORY"
        jsxElements.push(`        <Text style={styles.subheading}>${headingText}</Text>`);
      } else {
        jsxElements.push(`        <Text style={styles.heading}>${headingText}</Text>`);
      }
    } else if (line.startsWith('--- *Page')) {
      flushParagraph();
      jsxElements.push(`        <Text style={styles.pageNumber}>${line.replace(/^--- \*/, '').replace(/\*$/, '')}</Text>`);
    } else if (line.trim() === '') {
      flushParagraph();
    } else {
      currentParagraph.push(line.trim());
    }
  }
  flushParagraph(); // Flush any remaining paragraph content

  return `import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16 
  },
  heading: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginVertical: 16,
    textAlign: 'center'
  },
  subheading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
    textAlign: 'center'
  },
  pageNumber: { 
    fontSize: 14, 
    fontStyle: 'italic', 
    textAlign: 'center', 
    marginVertical: 12,
    color: '#666'
  },
  paragraph: { 
    fontSize: 16, 
    lineHeight: 24, 
    marginVertical: 8,
    textAlign: 'justify'
  },
  bold: {
    fontWeight: 'bold'
  }
});

export const ${toCamelCase(id)} = {
  id: '${id}',
  title: "${title}",
  content: (
    <ScrollView style={styles.container}>
${jsxElements.join('\n')}
    </ScrollView>
  )
};`;
}

const markdownFiles = fs.readdirSync(chaptersDir).filter(file => file.endsWith('.md'));

markdownFiles.forEach(file => {
  const filePath = path.join(chaptersDir, file);
  const markdownContent = fs.readFileSync(filePath, 'utf8');
  const fileNameWithoutExt = path.basename(file, '.md');
  
  // Extract title and ID based on filename pattern
  let title, id;
  if (fileNameWithoutExt.startsWith('aa-chapter-')) {
    const chapterNum = fileNameWithoutExt.match(/aa-chapter-(\d+)/)[1];
    id = `chapter-${chapterNum}`;
    title = markdownContent.split('\n').find(line => line.startsWith('# ')).substring(2).trim();
  } else if (fileNameWithoutExt === 'aa-doctors-opinion') {
    id = 'doctors-opinion';
    title = "THE DOCTOR'S OPINION";
  } else if (fileNameWithoutExt === 'aa-foreword-first') {
    id = 'foreword-first';
    title = "FOREWORD TO FIRST EDITION";
  } else if (fileNameWithoutExt === 'aa-foreword-second') {
    id = 'foreword-second';
    title = "FOREWORD TO SECOND EDITION";
  } else if (fileNameWithoutExt === 'aa-preface') {
    id = 'preface';
    title = "PREFACE";
  } else if (fileNameWithoutExt.startsWith('appendix-')) {
    const appendixNum = fileNameWithoutExt.match(/appendix-(\d+)/)[1];
    id = `appendix-${appendixNum}`;
    title = markdownContent.split('\n').find(line => line.startsWith('# ')).substring(2).trim();
  }

  const jsxOutput = convertMarkdownToJsx(markdownContent, title, id);
  const outputFileName = `bigbook_${fileNameWithoutExt}.tsx`;
  const outputPath = path.join(outputDir, outputFileName);
  fs.writeFileSync(outputPath, jsxOutput);
  console.log(`Generated ${outputPath}`);
});