const fs = require('fs');
const path = require('path');

// Quick script to get Chapter 11 with correct page range
async function getChapter11() {
  const section = {
    id: 'chapter-11',
    title: 'Chapter 11 - A Vision for You',
    startPage: '151',
    pages: ['151', '152', '153', '154', '155', '156', '157', '158', '159', '160', '161', '162', '163', '164'],
    type: 'multi-page'
  };

  const outputDir = path.join(__dirname, '..', 'constants', 'bigbook', '1st-edition-corrected');
  
  console.log(`Processing: ${section.title}`);
  
  let allContent = [];
  let successCount = 0;
  
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
      successCount++;
    }
    
    // Small delay between pages
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (allContent.length > 0) {
    const formatted = formatFlowingContent(section, allContent);
    const filename = `aa-${section.id}.md`;
    fs.writeFileSync(path.join(outputDir, filename), formatted);
    console.log(`  ✓ Created ${filename} (${successCount}/${section.pages.length} pages)`);
  } else {
    console.log(`  ✗ No content found for ${section.title}`);
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

// Run the script
getChapter11()
  .then(() => {
    console.log('\n✓ Chapter 11 completed!');
  })
  .catch(error => {
    console.error('\n✗ Chapter 11 failed:', error);
  });
