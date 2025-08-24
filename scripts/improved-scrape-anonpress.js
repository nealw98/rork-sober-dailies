const fs = require('fs');
const path = require('path');

// Improved scraping script that properly extracts and formats content
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

  const outputDir = path.join(__dirname, '..', 'constants', 'bigbook', '1st-edition-improved');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const section of sections) {
    console.log(`\nProcessing: ${section.title}`);
    
    try {
      let allContent = [];
      
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
        
        if (pageContent && pageContent.paragraphs.length > 0) {
          allContent.push({
            pageNum,
            paragraphs: pageContent.paragraphs
          });
        }
      }
      
      if (allContent.length > 0) {
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
    // Clean up HTML entities first
    let content = html
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
      .replace(/&ndash;/g, '–');

    // Extract paragraphs with ALIGN="JUSTIFY" - this is where the main content is
    const paragraphRegex = /<P ALIGN="?JUSTIFY"?[^>]*>(.*?)<\/P>/gis;
    const paragraphs = [];
    let match;
    
    while ((match = paragraphRegex.exec(content)) !== null) {
      let paragraph = match[1];
      
      // Remove HTML tags but preserve line breaks in poetry/quotes
      paragraph = paragraph
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Skip empty paragraphs and navigation elements
      if (paragraph && 
          paragraph.length > 10 && 
          !paragraph.toLowerCase().includes('next page') &&
          !paragraph.toLowerCase().includes('previous page')) {
        paragraphs.push(paragraph);
      }
    }
    
    return {
      pageNum,
      paragraphs
    };
    
  } catch (error) {
    console.error(`Error extracting content from page ${pageNum}:`, error);
    return null;
  }
}

function formatFlowingContent(section, allContent) {
  // Start with title and page range
  const firstPage = section.pages[0];
  const lastPage = section.pages[section.pages.length - 1];
  
  let formatted = `# ${section.title}\n`;
  if (firstPage === lastPage) {
    formatted += `**Page ${firstPage}**\n\n`;
  } else {
    formatted += `**Pages ${firstPage}–${lastPage}**\n\n`;
  }
  
  // Process each page's content
  for (const pageData of allContent) {
    // Add page marker
    formatted += `--${pageData.pageNum}--\n\n`;
    
    // Add paragraphs with proper spacing
    for (const paragraph of pageData.paragraphs) {
      // Ensure paragraph flows properly (no internal line breaks except for poetry)
      let cleanParagraph = paragraph;
      
      // If it contains poetry/quotes (multiple line breaks), preserve them
      if (paragraph.includes('\n') && paragraph.split('\n').length <= 6) {
        // This looks like poetry or a short quote - preserve formatting
        cleanParagraph = paragraph;
      } else {
        // Regular paragraph - remove internal line breaks
        cleanParagraph = paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      }
      
      formatted += cleanParagraph + '\n\n';
    }
  }
  
  return formatted.trim();
}

// Run the scraper
console.log('Starting improved anonpress.org scraping...');
console.log('This will create content with:');
console.log('- Proper paragraph extraction from HTML');
console.log('- No line breaks within paragraphs (flowing text)'); 
console.log('- Paragraph breaks between thoughts');
console.log('- Page markers embedded in content');
console.log('- Preserved formatting for poetry/quotes');
console.log('');

scrapeAnonymousPress()
  .then(() => {
    console.log('\n✓ Improved scraping completed!');
    console.log('Check the 1st-edition-improved folder for results.');
  })
  .catch(error => {
    console.error('\n✗ Scraping failed:', error);
  });
