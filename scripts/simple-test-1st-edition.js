// Simple test to verify 1st edition content is loaded correctly
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing 1st Edition Content Loading\n');

// Test 1: Check if the 1st edition content file exists and is valid
console.log('Test 1: Content file verification');
try {
  const contentPath = path.join(__dirname, '..', 'constants', 'bigbook', 'content-1st-edition.ts');
  
  if (fs.existsSync(contentPath)) {
    const content = fs.readFileSync(contentPath, 'utf8');
    console.log(`✓ Content file exists (${(content.length / 1024).toFixed(1)} KB)`);
    
    // Check for key sections
    const hasChapter1 = content.includes('"chapter-1"');
    const hasDoctorsOpinion = content.includes('"doctors-opinion"');
    const hasPageMarkers = content.includes('— Page');
    
    console.log(`  Has Chapter 1: ${hasChapter1 ? '✓' : '✗'}`);
    console.log(`  Has Doctor's Opinion: ${hasDoctorsOpinion ? '✓' : '✗'}`);
    console.log(`  Has page markers: ${hasPageMarkers ? '✓' : '✗'}`);
    
    // Count sections
    const sectionCount = (content.match(/"[\w-]+": `/g) || []).length;
    console.log(`  Total sections: ${sectionCount}`);
    
  } else {
    console.log(`✗ Content file not found at ${contentPath}`);
  }
} catch (error) {
  console.log(`✗ Content file test failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: Check individual markdown files
console.log('Test 2: Individual markdown files verification');
try {
  const inputDir = path.join(__dirname, '..', 'constants', 'bigbook', '1st-edition-corrected');
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.md'));
  
  console.log(`✓ Found ${files.length} markdown files`);
  
  // Check a few key files
  const keyFiles = ['aa-chapter-1.md', 'aa-doctors-opinion.md', 'aa-chapter-11.md'];
  
  keyFiles.forEach(filename => {
    const filePath = path.join(inputDir, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasPageMarkers = content.includes('--') && (content.includes('--1--') || content.includes('--doctors-opinion--'));
      const hasFlowingText = content.includes('# Chapter') || content.includes('# The Doctor');
      
      console.log(`  ${filename}: ✓ (${(content.length / 1024).toFixed(1)} KB, markers: ${hasPageMarkers ? '✓' : '✗'}, text: ${hasFlowingText ? '✓' : '✗'})`);
    } else {
      console.log(`  ${filename}: ✗ Missing`);
    }
  });
  
} catch (error) {
  console.log(`✗ Markdown files test failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Sample content preview
console.log('Test 3: Sample content preview');
try {
  const chapter1Path = path.join(__dirname, '..', 'constants', 'bigbook', '1st-edition-corrected', 'aa-chapter-1.md');
  
  if (fs.existsSync(chapter1Path)) {
    const content = fs.readFileSync(chapter1Path, 'utf8');
    const lines = content.split('\n');
    
    console.log('✓ Chapter 1 preview (first 10 lines):');
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`  ${i + 1}: ${line}`);
    });
    
    // Check for specific 1st edition content
    const hasWarFever = content.includes('War fever ran high');
    const hasBillsStory = content.includes('BILL\'S STORY') || content.includes('Bill\'s Story');
    const hasPageOne = content.includes('--1--');
    
    console.log(`\n  1st Edition markers:`);
    console.log(`    War fever opening: ${hasWarFever ? '✓' : '✗'}`);
    console.log(`    Bill's Story title: ${hasBillsStory ? '✓' : '✗'}`);
    console.log(`    Page 1 marker: ${hasPageOne ? '✓' : '✗'}`);
    
  } else {
    console.log(`✗ Chapter 1 file not found`);
  }
} catch (error) {
  console.log(`✗ Content preview test failed: ${error.message}`);
}

console.log('\n🎉 Simple test completed!');
console.log('\n📱 To test the app integration:');
console.log('1. Run: npm start');
console.log('2. Open the app and go to Literature → Big Book');
console.log('3. Try searching for "alcohol" or "1" (page number)');
console.log('4. Verify the content shows 1st edition text with flowing paragraphs');
