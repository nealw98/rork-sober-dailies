const fs = require('fs');
const path = require('path');

// Complete scraping script for all Big Book content
async function scrapeCompleteAnonymousPress() {
  const sections = [
    {
      id: 'doctors-opinion',
      title: 'The Doctor\'s Opinion',
      url: 'https://anonpress.org/bb/docsopin.htm',
      type: 'single-file'
    },
    {
      id: 'foreword-first',
      title: 'Foreword to First Edition (1939)',
      url: 'https://anonpress.org/bb/foreword.htm',
      type: 'single-file'
    },
    {
      id: 'chapter-1',
      title: 'Chapter 1 - Bill\'s Story',
      startPage: '1',
      pages: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
      type: 'multi-page'
    },
    {
      id: 'chapter-2',
      title: 'Chapter 2 - There Is a Solution', 
      startPage: '17',
      pages: ['17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43'],
      type: 'multi-page'
    },
    {
      id: 'chapter-3',
      title: 'Chapter 3 - More About Alcoholism',
      startPage: '44',
      pages: ['44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57'],
      type: 'multi-page'
    },
    {
      id: 'chapter-4',
      title: 'Chapter 4 - We Agnostics',
      startPage: '58',
      pages: ['58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71'],
      type: 'multi-page'
    },
    {
      id: 'chapter-5',
      title: 'Chapter 5 - How It Works',
      startPage: '72',
      pages: ['72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88'],
      type: 'multi-page'
    },
    {
      id: 'chapter-6',
      title: 'Chapter 6 - Into Action',
      startPage: '89',
      pages: ['89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '100', '101', '102', '103'],
      type: 'multi-page'
    },
    {
      id: 'chapter-7',
      title: 'Chapter 7 - Working with Others',
      startPage: '104',
      pages: ['104', '105', '106', '107', '108', '109', '110', '111', '112', '113', '114', '115', '116', '117', '118', '119', '120', '121', '122'],
      type: 'multi-page'
    },
    {
      id: 'chapter-8',
      title: 'Chapter 8 - To Wives',
      startPage: '123',
      pages: ['123', '124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '135', '136', '137', '138', '139', '140', '141', '142'],
      type: 'multi-page'
    },
    {
      id: 'chapter-9',
      title: 'Chapter 9 - The Family Afterward',
      startPage: '143',
      pages: ['143', '144', '145', '146', '147', '148', '149', '150', '151', '152', '153', '154', '155', '156', '157', '158'],
      type: 'multi-page'
    },
    {
      id: 'chapter-10',
      title: 'Chapter 10 - To Employers',
      startPage: '159',
      pages: ['159', '160', '161', '162', '163', '164', '165', '166', '167', '168', '169', '170'],
      type: 'multi-page'
    },
    {
      id: 'chapter-11',
      title: 'Chapter 11 - A Vision for You',
      startPage: '171',
      pages: ['171', '172', '173', '174', '175', '176', '177', '178', '179', '180', '181', '182', '183', '184', '185', '186', '187', '188', '189', '190', '191', '192', '193', '194'],
      type: 'multi-page'
    },
    {
      id: 'spiritual-experience',
      title: 'Spiritual Experience (Appendix)',
      url: 'https://anonpress.org/bb/Spiritualexperience.htm',
      type: 'single-file'
    }
  ];

  const outputDir = path.join(__dirname, '..', 'constants', 'bigbook', '1st-edition-complete');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Starting complete 1st edition scraping...`);
  console.log(`Will process ${sections.length} sections total.\n`);

  for (const section of sections) {
    console.log(`Processing: ${section.title}`);
    
    try {
      if (section.type === 'single-file') {
        // Handle single file sections (foreword, doctor's opinion, etc.)
        const response = await fetch(section.url);
        if (!response.ok) {
          console.log(`    Warning: Could not fetch ${section.url} (${response.status})`);
          continue;
        }
        
        const html = await response.text();
        const content = extractContentFromSingleFile(html, section);
        
        if (content) {
          const formatted = formatSingleFileContent(section, content);
          const filename = `aa-${section.id}.md`;
          fs.writeFileSync(path.join(outputDir, filename), formatted);
          console.log(`  ✓ Created ${filename}`);
        }
        
      } else {
        // Handle multi-page sections (chapters)
        let allContent = [];
        let successCount = 0;
        
        for (const pageNum of section.pages) {
          const url = `https://anonpress.org/bb/Page_${pageNum}.htm`;
          
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
      
    } catch (error) {
      console.error(`  ✗ Error processing ${section.title}:`, error.message);
    }
    
    // Delay between sections to be respectful to the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function extractContentFromSingleFile(html, section) {
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

    // Extract paragraphs - look for various paragraph patterns
    const paragraphRegex = /<P[^>]*>(.*?)<\/P>/gis;
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
          paragraph.length > 5 && 
          !paragraph.toLowerCase().includes('next page') &&
          !paragraph.toLowerCase().includes('previous page') &&
          !paragraph.toLowerCase().includes('back to') &&
          !paragraph.toLowerCase().includes('return to')) {
        paragraphs.push(paragraph);
      }
    }
    
    return paragraphs;
    
  } catch (error) {
    console.error(`Error extracting content from single file:`, error);
    return null;
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

function formatSingleFileContent(section, paragraphs) {
  let formatted = `# ${section.title}\n\n`;
  
  // For single files, we'll add a generic page marker
  formatted += `--${section.id}--\n\n`;
  
  // Add paragraphs with proper spacing
  for (const paragraph of paragraphs) {
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
  
  return formatted.trim();
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

// Run the complete scraper
scrapeCompleteAnonymousPress()
  .then(() => {
    console.log('\n🎉 Complete 1st edition scraping finished!');
    console.log('Check the 1st-edition-complete folder for all results.');
    console.log('\nFiles created:');
    
    const outputDir = path.join(__dirname, '..', 'constants', 'bigbook', '1st-edition-complete');
    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.md'));
    files.forEach(file => {
      console.log(`  - ${file}`);
    });
  })
  .catch(error => {
    console.error('\n✗ Complete scraping failed:', error);
  });
