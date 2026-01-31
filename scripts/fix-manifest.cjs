const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Remove invalid name_ja key
if (manifest.name_ja) {
  manifest.name = manifest.name_ja; // Use the longer name
  delete manifest.name_ja;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Removed name_ja key from manifest.json');
} else {
  console.log('name_ja already removed');
}
