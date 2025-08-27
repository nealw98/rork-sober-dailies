const fs = require('fs');

let content = fs.readFileSync('content.ts', 'utf8');

// Fix the Doctor's Opinion page numbers
content = content.replace(/\*— Page vii —\*/g, '*— Page xvii —*');
content = content.replace(/\*— Page viii —\*/g, '*— Page xviii —*');
content = content.replace(/\*— Page ix —\*/g, '*— Page xxvii —*');
content = content.replace(/\*— Page x —\*/g, '*— Page xxviii —*');

// Fix the Foreword page numbers
content = content.replace(/\*— Page i —\*/g, '*— Page xiii —*');
content = content.replace(/\*— Page ii —\*/g, '*— Page xiv —*');
content = content.replace(/\*— Page iii —\*/g, '*— Page xv —*');

fs.writeFileSync('content-corrected.ts', content);
console.log('Fixed page numbers - written to content-corrected.ts');
console.log('You still need to manually remove the duplicate Page xviii content in your editor');
