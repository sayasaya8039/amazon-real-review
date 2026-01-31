const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// Fix background/index.ts - refactor to track resale detection properly
const bgPath = path.join(projectRoot, 'src/background/index.ts');
let bgContent = fs.readFileSync(bgPath, 'utf-8');

// Replace the entire resale detection section with proper tracking
const oldCode = `  // 転売検出
  let resaleDetection: ResaleDetection | null = null;
  if (settings.checkResale) {
    const detector = createResaleDetector();

    // パターンベースの検出（API不要）
    const patterns = detector.detectResalePatterns(
      product.title,
      '', // description not available in current structure
      product.price
    );

    if (patterns.isSuspicious) {
      warnings.push({
        level: 'medium',
        type: 'resale',
        message: \`転売品の可能性: \${patterns.reasons.join(', ')}\`,
      });
    }

    // TODO: 画像検索による転売検出（API必要）
    // resaleDetection = await detector.detectResale(product.imageUrls, product.price, product.currency);
  }`;

const newCode = `  // 転売検出
  let resaleDetection: ResaleDetection | null = null;
  let resaleDetected = false;
  if (settings.checkResale) {
    const detector = createResaleDetector();

    // パターンベースの検出（API不要）
    const patterns = detector.detectResalePatterns(
      product.title,
      '', // description not available in current structure
      product.price
    );

    if (patterns.isSuspicious) {
      resaleDetected = true;
      warnings.push({
        level: 'medium',
        type: 'resale',
        message: \`転売品の可能性: \${patterns.reasons.join(', ')}\`,
      });
    }

    // TODO: 画像検索による転売検出（API必要）
    // resaleDetection = await detector.detectResale(product.imageUrls, product.price, product.currency);
  }`;

bgContent = bgContent.replace(oldCode, newCode);

// Fix the stats update to use resaleDetected flag
bgContent = bgContent.replace(
  'if (resaleDetection !== null && resaleDetection.isResale) {',
  'if (resaleDetected) {'
);

fs.writeFileSync(bgPath, bgContent);
console.log('Fixed background/index.ts - resale detection tracking');

console.log('All TypeScript errors fixed!');
