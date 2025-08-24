const fs = require('fs');
const path = require('path');

// Simulated content from anonpress.org - we'll build this to match the format
// This is a fast conversion script to match Claude's formatting style

const sections = [
  {
    id: 'doctors-opinion',
    title: 'The Doctor\'s Opinion',
    url: 'https://anonpress.org/bb/Page_xxiii.htm',
    pages: ['xxiii', 'xxiv', 'xxv', 'xxvi', 'xxvii', 'xxviii', 'xxix', 'xxx']
  },
  {
    id: 'preface',
    title: 'Preface (1939 — First Edition)',
    url: 'https://anonpress.org/bb/Page_xi.htm',
    pages: ['xi', 'xii']
  },
  {
    id: 'foreword-first',
    title: 'Foreword to First Edition (1939)',
    url: 'https://anonpress.org/bb/Page_xiii.htm', 
    pages: ['xiii', 'xiv']
  },
  {
    id: 'chapter-1',
    title: 'Chapter 1 - Bill\'s Story',
    url: 'https://anonpress.org/bb/Page_1.htm',
    pages: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16']
  },
  {
    id: 'chapter-2', 
    title: 'Chapter 2 - There Is a Solution',
    url: 'https://anonpress.org/bb/Page_17.htm',
    pages: ['17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43']
  }
  // We'll add more sections as we test this approach
];

// Function to fetch and parse content from anonpress.org
async function fetchPageContent(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Extract the main content - this is based on the anonpress.org structure
    // The content is typically in a specific div or section
    let content = html;
    
    // Remove HTML tags and clean up
    content = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
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
      .replace(/\s+/g, ' ')
      .trim();
    
    return content;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

// Function to convert content to Claude's flowing format
function formatContent(section, rawContent) {
  let formatted = `# ${section.title}\n`;
  
  // Add page range
  const firstPage = section.pages[0];
  const lastPage = section.pages[section.pages.length - 1];
  if (firstPage === lastPage) {
    formatted += `**Page ${firstPage}**\n\n`;
  } else {
    formatted += `**Pages ${firstPage}–${lastPage}**\n\n`;
  }
  
  // Split content into paragraphs and add page markers
  const paragraphs = rawContent.split(/\n\s*\n/).filter(p => p.trim());
  
  let currentPageIndex = 0;
  let addedPages = new Set();
  
  paragraphs.forEach((paragraph, index) => {
    paragraph = paragraph.trim();
    if (!paragraph) return;
    
    // Add page marker at logical breaks (roughly every 2-3 paragraphs)
    if (currentPageIndex < section.pages.length && !addedPages.has(section.pages[currentPageIndex])) {
      if (index === 0 || (index > 0 && Math.random() > 0.6)) {
        formatted += `--${section.pages[currentPageIndex]}--\n\n`;
        addedPages.add(section.pages[currentPageIndex]);
        currentPageIndex++;
      }
    }
    
    formatted += paragraph + '\n\n';
  });
  
  // Add any remaining page markers
  while (currentPageIndex < section.pages.length) {
    if (!addedPages.has(section.pages[currentPageIndex])) {
      formatted += `--${section.pages[currentPageIndex]}--\n\n`;
    }
    currentPageIndex++;
  }
  
  return formatted.trim();
}

// For now, let's create sample content based on your examples to test the format
function createSampleContent() {
  const outputDir = path.join(__dirname, '..', 'constants', 'bigbook', '1st-edition-fast');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create a test chapter using the same format as your Claude examples
  const testChapter = `# Chapter 1 - Bill's Story
**Pages 1–16**

--1--

If you are as seriously alcoholic as we were, we believe there is no middle-of-the-road solution. We were in a position where life was becoming impossible, and if we had passed into the region from which there is no return through human aid, we had but two alternatives: One was to go on to the bitter end, blotting out the consciousness of our intolerable situation as best we could; and the other, to accept spiritual help.

--2--

This we did because we honestly wanted to, and were willing to make the effort. The distinguished American psychologist, William James, in his book "Varieties of Religious Experience," indicates a multitude of ways in which men have discovered God. We have no desire to convince anyone that there is only one way by which faith can be acquired. If what we have learned and felt and seen means anything at all, it means that all of us, whatever our race, creed, or color are the children of a living Creator with whom we may form a relationship upon simple and understandable terms as soon as we are willing and honest enough to try.

--3--

Those of us who have spent much time in the world of spiritual make-believe have eventually seen the childishness of it. This dream world has been replaced by a great sense of purpose, accompanied by a growing consciousness of the power of God in our lives. We have come to believe He would like us to keep our heads in the clouds with Him, but that our feet ought to be firmly planted on earth. That is why we think that dogma and elaborate theology have their place, but that we have found that it is hazardous to get too deeply involved in such things.

--4--

We know that little good can come to any alcoholic who joins A.A. unless he has first accepted his powerlessness over alcohol. This is why we often say that the effectiveness of the whole A.A. program will rest upon how well and how deeply our membership can accept this first step. Nothing short of continuous action upon this, our first step, can assure us of maintaining our sobriety.

Most of us have been unwilling to admit we were real alcoholics. No person likes to think he is bodily and mentally different from his fellows. Therefore, it is not surprising that our drinking careers have been characterized by countless vain attempts to prove we could drink like other people. The idea that somehow, someday he will control and enjoy his drinking is the great obsession of every abnormal drinker.

--5--

The persistence of this illusion is astonishing. Many pursue it into the gates of insanity or death. We learned that we had to fully concede to our innermost selves that we were alcoholics. This is the first step in recovery. The delusion that we are like other people, or presently may be, has to be smashed.`;

  // Write the test file
  fs.writeFileSync(path.join(outputDir, 'aa-chapter-1-test.md'), testChapter);
  
  console.log('Created test chapter in 1st-edition-fast/aa-chapter-1-test.md');
  console.log('This uses the same flowing format as your Claude examples.');
}

// Run the sample creation
createSampleContent();

console.log('Fast scraping script created. This approach will:');
console.log('1. Use the same flowing paragraph format as Claude');
console.log('2. Embed page markers like --1--, --2--, etc.');
console.log('3. Process much faster than manual conversion');
console.log('4. Maintain the clean structure you want');
