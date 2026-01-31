const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// Fix amazon.ts
const amazonPath = path.join(projectRoot, 'src/content/amazon.ts');
let amazonContent = fs.readFileSync(amazonPath, 'utf-8');
amazonContent = amazonContent.replace(
  'const productId = asinMatch ? asinMatch[1] : `amazon-${Date.now()}`;',
  'const productId = asinMatch?.[1] ?? `amazon-${Date.now()}`;'
);
fs.writeFileSync(amazonPath, amazonContent);
console.log('Fixed amazon.ts');

// Fix mercari.ts
const mercariPath = path.join(projectRoot, 'src/content/mercari.ts');
let mercariContent = fs.readFileSync(mercariPath, 'utf-8');
mercariContent = mercariContent.replace(
  'const productId = urlMatch ? urlMatch[1] : `mercari-${Date.now()}`;',
  'const productId = urlMatch?.[1] ?? `mercari-${Date.now()}`;'
);
fs.writeFileSync(mercariPath, mercariContent);
console.log('Fixed mercari.ts');

// Fix resale.ts
const resalePath = path.join(projectRoot, 'src/lib/detector/resale.ts');
let resaleContent = fs.readFileSync(resalePath, 'utf-8');
resaleContent = resaleContent.replace(
  'private imageSearchApiKey?: string;',
  'private _imageSearchApiKey?: string;'
);
resaleContent = resaleContent.replace(
  'this.imageSearchApiKey = apiKey;',
  'this._imageSearchApiKey = apiKey;'
);
resaleContent = resaleContent.replace(
  'currency: string\n  ): Promise<ResaleDetection>',
  '_currency: string\n  ): Promise<ResaleDetection>'
);
fs.writeFileSync(resalePath, resaleContent);
console.log('Fixed resale.ts');

// Fix background/index.ts
const bgPath = path.join(projectRoot, 'src/background/index.ts');
let bgContent = fs.readFileSync(bgPath, 'utf-8');
bgContent = bgContent.replace(
  "import type { Message, MessageResponse, ProductInfo, AnalysisResult, Warning } from '@/types';",
  "import type { Message, MessageResponse, ProductInfo, AnalysisResult, Warning, ResaleDetection } from '@/types';"
);
bgContent = bgContent.replace(
  '// 転売検出\n  let resaleDetection = null;',
  '// 転売検出\n  let resaleDetection: ResaleDetection | null = null;'
);
fs.writeFileSync(bgPath, bgContent);
console.log('Fixed background/index.ts');

console.log('All TypeScript errors fixed!');
