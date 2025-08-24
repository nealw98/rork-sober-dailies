const fs = require('fs');
const path = require('path');

// Real scraping script for anonpress.org with proper flowing paragraph formatting
async function scrapeAnonymousPress() {
  const sections = [
    {
      id: 'doctors-opinion',
      title: 'The Doctor\'s Opinion',
      startPage: 'xxiii',
      pages: ['xxiii', 'xxiv', 'xxv', 'xxvi', 'xxvii', 'xxviii', 'xxix', 'xxx']
    },
    {
      id: 'preface',
      title: 'Preface (1939 — First Edition)', 
      startPage: 'xi',
      pages: ['xi', 'xii']
    },
    {
      id: 'foreword-first',
      title: 'Foreword to First Edition (1939)',
      startPage: 'xiii', 
      pages: ['xiii', 'xiv']
    },
    {
      id: 'chapter-1',
      title: 'Chapter 1 - Bill\'s Story',
      startPage: '1',
      pages: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16']
    },
    {
      id: 'chapter-2',
      title: 'Chapter 2 - There Is a Solution', 
      startPage: '17',
      pages: ['17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43']
    }
  ];

  const outputDir = path.join(__dirname, '..', 'constants', 'bigbook', '1st-edition-scraped');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const section of sections) {
    console.log(`\nProcessing: ${section.title}`);
    
    try {
      // Fetch all pages for this section
      let allContent = '';
      
      for (const pageNum of section.pages) {
        const url = `https://anonpress.org/bb/Page_${pageNum}.htm`;
        console.log(`  Fetching page ${pageNum}...`);
        
        const response = await fetch(url);
        if (!response.ok) {
          console.log(`    Warning: Could not fetch page ${pageNum} (${response.status})`);
          continue;
        }
        
        const html = await response.text();
        const pageContent = extractContentFromPage(html, pageNum);
        
        if (pageContent) {
          allContent += pageContent + '\n\n';
        }
      }
      
      if (allContent.trim()) {
        // Format the content with flowing paragraphs
        const formatted = formatFlowingContent(section, allContent);
        
        // Write to file
        const filename = `aa-${section.id}.md`;
        fs.writeFileSync(path.join(outputDir, filename), formatted);
        console.log(`  ✓ Created ${filename}`);
      } else {
        console.log(`  ✗ No content found for ${section.title}`);
      }
      
    } catch (error) {
      console.error(`  ✗ Error processing ${section.title}:`, error.message);
    }
    
    // Small delay to be respectful to the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

function extractContentFromPage(html, pageNum) {
  try {
    // Clean up HTML and extract text content
    let content = html
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Convert HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    // Try to find the main content area
    // Look for patterns that indicate actual book content vs navigation
    const lines = content.split(/\s+/);
    
    // Filter out navigation, headers, footers
    const filteredLines = lines.filter(line => {
      const lower = line.toLowerCase();
      return !lower.includes('navigation') && 
             !lower.includes('copyright') &&
             !lower.includes('anonpress') &&
             !lower.includes('page') && 
             line.length > 3;
    });
    
    // Add page marker at the beginning
    const pageContent = `--${pageNum}--\n\n${filteredLines.join(' ')}`;
    
    return pageContent;
    
  } catch (error) {
    console.error(`Error extracting content from page ${pageNum}:`, error);
    return null;
  }
}

function formatFlowingContent(section, rawContent) {
  // Start with title and page range
  const firstPage = section.pages[0];
  const lastPage = section.pages[section.pages.length - 1];
  
  let formatted = `# ${section.title}\n`;
  if (firstPage === lastPage) {
    formatted += `**Page ${firstPage}**\n\n`;
  } else {
    formatted += `**Pages ${firstPage}–${lastPage}**\n\n`;
  }
  
  // Process the content to create flowing paragraphs
  let processedContent = rawContent
    // Split by page markers first
    .split(/--(\w+)--/)
    .map((part, index) => {
      if (index % 2 === 1) {
        // This is a page number
        return `--${part}--`;
      } else if (part.trim()) {
        // This is content - make it flow properly
        return part
          // Remove excessive whitespace
          .replace(/\s+/g, ' ')
          // Split into sentences and rejoin to create flowing paragraphs
          .replace(/\.\s+/g, '. ')
          // Create paragraph breaks at logical points (double spaces, etc.)
          .replace(/\.\s{2,}/g, '.\n\n')
          .trim();
      }
      return '';
    })
    .filter(part => part.trim())
    .join('\n\n');
  
  // Clean up any remaining formatting issues
  processedContent = processedContent
    // Ensure page markers are on their own lines
    .replace(/(--\w+--)/g, '\n$1\n')
    // Remove excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Ensure paragraphs flow properly (no line breaks within paragraphs)
    .split('\n\n')
    .map(paragraph => {
      if (paragraph.match(/^--\w+--$/)) {
        return paragraph; // Keep page markers as-is
      } else {
        // For content paragraphs, remove internal line breaks
        return paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      }
    })
    .filter(p => p.trim())
    .join('\n\n');
  
  formatted += processedContent;
  
  return formatted.trim();
}

// Run the scraper
console.log('Starting anonpress.org scraping with flowing paragraph format...');
console.log('This will create content with:');
console.log('- No line breaks within paragraphs (flowing text)'); 
console.log('- Paragraph breaks between thoughts');
console.log('- Page markers embedded in content');
console.log('');

scrapeAnonymousPress()
  .then(() => {
    console.log('\n✓ Scraping completed!');
    console.log('Check the 1st-edition-scraped folder for results.');
  })
  .catch(error => {
    console.error('\n✗ Scraping failed:', error);
  });
