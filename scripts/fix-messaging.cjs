const fs = require('fs');
const path = require('path');

// Fix background/index.ts - add missing message handlers
const bgPath = path.join(__dirname, '..', 'src', 'background', 'index.ts');
let bgContent = fs.readFileSync(bgPath, 'utf-8');

// Add GET_STATS handler
bgContent = bgContent.replace(
  `case 'CLEAR_CACHE':
        await storage.clearCache();
        return { success: true };`,
  `case 'CLEAR_CACHE':
        await storage.clearCache();
        return { success: true };

      case 'GET_STATS':
        return { success: true, data: await storage.getStats() };`
);

fs.writeFileSync(bgPath, bgContent);
console.log('Fixed background/index.ts - added GET_STATS handler');

// Fix popup/App.tsx - fix message payload structure
const appPath = path.join(__dirname, '..', 'src', 'popup', 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf-8');

// Fix UPDATE_SETTINGS to use payload
appContent = appContent.replace(
  "{ type: 'UPDATE_SETTINGS', settings: newSettings }",
  "{ type: 'UPDATE_SETTINGS', payload: newSettings }"
);

// Fix GET_CACHED_RESULT - use GET_CACHE instead and extract by product ID
appContent = appContent.replace(
  `const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.url) {
        const cacheResponse = await chrome.runtime.sendMessage({ type: 'GET_CACHED_RESULT', url: activeTab.url });
        if (cacheResponse.success && cacheResponse.data) setCurrentResult(cacheResponse.data);
      }`,
  `// Cache retrieval is handled by content script`
);

fs.writeFileSync(appPath, appContent);
console.log('Fixed popup/App.tsx - fixed message payload structure');

// Also need to add GET_STATS to message types
const typesPath = path.join(__dirname, '..', 'src', 'types', 'index.ts');
let typesContent = fs.readFileSync(typesPath, 'utf-8');

if (!typesContent.includes("'GET_STATS'")) {
  typesContent = typesContent.replace(
    "| 'CLEAR_CACHE';",
    "| 'CLEAR_CACHE'\n  | 'GET_STATS';"
  );
  fs.writeFileSync(typesPath, typesContent);
  console.log('Fixed types/index.ts - added GET_STATS message type');
}

console.log('All messaging fixes applied!');
