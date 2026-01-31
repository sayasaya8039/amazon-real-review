const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Update icons to PNG
manifest.icons = {
  "16": "public/icons/icon16.png",
  "32": "public/icons/icon32.png",
  "48": "public/icons/icon48.png",
  "128": "public/icons/icon128.png"
};

manifest.action.default_icon = {
  "16": "public/icons/icon16.png",
  "32": "public/icons/icon32.png",
  "48": "public/icons/icon48.png",
  "128": "public/icons/icon128.png"
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Updated manifest.json to use PNG icons');
