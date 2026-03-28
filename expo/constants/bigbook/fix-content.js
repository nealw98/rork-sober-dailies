const fs = require('fs');

let content = fs.readFileSync('content.ts', 'utf8');

content = content.replace(/`([^`]+)`/g, (match, markdownContent) => {
  let fixed = markdownContent
    .replace(/\?M-\^@M-\^T/g, '—')
    .replace(/—\s+Page\s+/g, '— Page ')
    .replace(/\s+—/g, ' —');
  
  fixed = fixed
    .split(/\n\n+/)
    .map(paragraph => {
      if (paragraph.startsWith('#') || paragraph.startsWith('*—')) {
        return paragraph;
      }
      return paragraph.replace(/\n(?!$)/g, ' ');
    })
    .join('\n\n');
  
  return '`' + fixed + '`';
});

fs.writeFileSync('content.ts', content);
console.log('Fixed content written to content.ts');
