// Test script to verify 1st edition content and search functionality
const { searchBigBookContentEnhanced, navigateToPageWithHighlight } = require('../constants/bigbook/index.ts');

console.log('🧪 Testing 1st Edition Big Book Integration\n');

// Test 1: Basic search functionality
console.log('Test 1: Basic search for "alcohol"');
try {
  const results = searchBigBookContentEnhanced('alcohol', {
    caseSensitive: false,
    wholeWordsOnly: true,
    includePageNumbers: true
  });
  
  console.log(`✓ Found ${results.length} results for "alcohol"`);
  if (results.length > 0) {
    console.log(`  Sample result: "${results[0].excerpt.substring(0, 100)}..."`);
    console.log(`  Page: ${results[0].pageNumber}, Section: ${results[0].sectionTitle}`);
  }
} catch (error) {
  console.log(`✗ Search test failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: Page number search
console.log('Test 2: Page number search for "1"');
try {
  const pageResults = searchBigBookContentEnhanced('1', {
    caseSensitive: false,
    wholeWordsOnly: true,
    includePageNumbers: true
  });
  
  console.log(`✓ Found ${pageResults.length} results for page "1"`);
  const pageMarkerResults = pageResults.filter(r => r.excerpt.includes('— Page 1 —'));
  console.log(`✓ Found ${pageMarkerResults.length} page marker results`);
  
  if (pageMarkerResults.length > 0) {
    console.log(`  Page marker result: "${pageMarkerResults[0].excerpt}"`);
  }
} catch (error) {
  console.log(`✗ Page search test failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Navigation to specific page
console.log('Test 3: Navigation to page 5');
try {
  const navResult = navigateToPageWithHighlight('5', 'alcohol');
  
  if (navResult && navResult.content) {
    console.log(`✓ Successfully navigated to page 5`);
    console.log(`  Content preview: "${navResult.content.substring(0, 150)}..."`);
    console.log(`  Highlighted: ${navResult.highlightedContent ? 'Yes' : 'No'}`);
  } else {
    console.log(`✗ Navigation failed - no content returned`);
  }
} catch (error) {
  console.log(`✗ Navigation test failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 4: Content verification
console.log('Test 4: Content verification');
try {
  const { bigBookTextContent } = require('../constants/bigbook/index.ts');
  
  console.log(`✓ Loaded ${bigBookTextContent.length} sections`);
  
  const chapter1 = bigBookTextContent.find(item => item.id === 'chapter-1');
  if (chapter1 && chapter1.content) {
    console.log(`✓ Chapter 1 content loaded (${chapter1.content.length} characters)`);
    console.log(`  Title: ${chapter1.title}`);
    console.log(`  Preview: "${chapter1.content.substring(0, 100)}..."`);
    
    // Check for 1st edition markers
    const hasPageMarkers = chapter1.content.includes('— Page');
    const hasFlowingText = !chapter1.content.includes('\n\n\n'); // Should not have excessive line breaks
    
    console.log(`  Has page markers: ${hasPageMarkers ? '✓' : '✗'}`);
    console.log(`  Has flowing text: ${hasFlowingText ? '✓' : '✗'}`);
  } else {
    console.log(`✗ Chapter 1 content not found or empty`);
  }
} catch (error) {
  console.log(`✗ Content verification failed: ${error.message}`);
}

console.log('\n🎉 Test completed!');
