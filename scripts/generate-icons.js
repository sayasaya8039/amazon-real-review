import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 32, 48, 128];

const createIcon = (size) => {
  const rx = Math.round(size / 8);
  const cx = size * 0.5;
  const cy = size * 0.45;
  const r = size * 0.25;
  const sw = Math.max(2, size / 16);
  const x1 = size * 0.68;
  const y1 = size * 0.62;
  const x2 = size * 0.82;
  const y2 = size * 0.78;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea" />
      <stop offset="100%" style="stop-color:#764ba2" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="white" stroke-width="${sw}"/>
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="white" stroke-width="${sw}" stroke-linecap="round"/>
</svg>`;
};

for (const size of sizes) {
  const svg = createIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg, 'utf8');
  console.log(`Created icon${size}.svg`);
}

console.log('\nNote: SVG icons created. Chrome MV3 supports SVG icons.');
