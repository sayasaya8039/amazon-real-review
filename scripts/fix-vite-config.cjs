const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'vite.config.ts');
let content = fs.readFileSync(configPath, 'utf-8');

// Check if viteStaticCopy is already imported
if (!content.includes('viteStaticCopy')) {
  // Add import
  content = content.replace(
    "import { crx } from '@crxjs/vite-plugin';",
    "import { crx } from '@crxjs/vite-plugin';\nimport { viteStaticCopy } from 'vite-plugin-static-copy';"
  );

  // Add plugin
  content = content.replace(
    'crx({ manifest }),',
    `crx({ manifest }),
    viteStaticCopy({
      targets: [
        {
          src: 'src/styles/content.css',
          dest: 'src/styles',
        },
      ],
    }),`
  );

  fs.writeFileSync(configPath, content);
  console.log('Updated vite.config.ts with static copy plugin');
} else {
  console.log('viteStaticCopy already configured');
}
