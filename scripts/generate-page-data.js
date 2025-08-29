const fs = require('fs');
const path = require('path');
const { allMarkdownContent } = require('../constants/bigbook/content');

function generatePageData() {
  const pageData = {};

  Object.entries(allMarkdownContent).forEach(([chapterId, content]) => {
    const pageMarkerRegex = /--- \*Page (\d+)\* ---\n\n(.*?)(?=(?:\n\n--- \*Page \d+\* ---|$))/gs;
    let match;
    
    while ((match = pageMarkerRegex.exec(content)) !== null) {
      const pageNumber = parseInt(match[1], 10);
      const pageContent = match[2];
      const startIndex = match.index + match[0].indexOf(pageContent);
      const endIndex = startIndex + pageContent.length;
      
      const pageId = `${chapterId}-page-${pageNumber}`;
      
      pageData[pageId] = {
        id: pageId,
        chapterId,
        pageNumber,
        content: pageContent,
        startIndex,
        endIndex
      };
    }
  });

  return pageData;
}

const pageData = generatePageData();
const output = `// Generated page data
export const pageData = ${JSON.stringify(pageData, null, 2)};

export function getPageById(pageId) {
  return pageData[pageId];
}

export function findPageForPosition(chapterId, position) {
  return Object.values(pageData).find(page => 
    page.chapterId === chapterId && 
    position >= page.startIndex && 
    position <= page.endIndex
  );
}

export function getPageByNumber(chapterId, pageNumber) {
  return Object.values(pageData).find(page => 
    page.chapterId === chapterId && 
    page.pageNumber === pageNumber
  );
}
`;

fs.writeFileSync(
  path.join(__dirname, '../constants/bigbook/pageData.ts'),
  output,
  'utf8'
);





