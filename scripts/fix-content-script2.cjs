const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, '..', 'src', 'content', 'index.ts');
let content = fs.readFileSync(contentPath, 'utf-8');

// Fix the warning type from 'info' to 'other'
content = content.replace("type: 'info',", "type: 'other',");

fs.writeFileSync(contentPath, content);
console.log('Fixed warning type in content/index.ts');
