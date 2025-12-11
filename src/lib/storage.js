// storage.js - 設定管理

const STORAGE_KEYS = {
  GOOGLE_API_KEY: 'googleApiKey',
  GOOGLE_SEARCH_ENGINE_ID: 'googleSearchEngineId',
  YOUTUBE_API_KEY: 'youtubeApiKey',
  OPENAI_API_KEY: 'openaiApiKey',
  GEMINI_API_KEY: 'geminiApiKey',
  AI_PROVIDER: 'aiProvider', // 'openai' or 'gemini'
  CACHE: 'reviewCache',
  SETTINGS: 'settings'
};

// 設定を保存
async function saveSettings(settings) {
  return chrome.storage.local.set(settings);
}

// 設定を取得
async function getSettings(keys = null) {
  if (keys) {
    return chrome.storage.local.get(keys);
  }
  return chrome.storage.local.get(Object.values(STORAGE_KEYS));
}

// APIキーを保存
async function saveApiKeys(keys) {
  const data = {};
  if (keys.googleApiKey !== undefined) data[STORAGE_KEYS.GOOGLE_API_KEY] = keys.googleApiKey;
  if (keys.googleSearchEngineId !== undefined) data[STORAGE_KEYS.GOOGLE_SEARCH_ENGINE_ID] = keys.googleSearchEngineId;
  if (keys.youtubeApiKey !== undefined) data[STORAGE_KEYS.YOUTUBE_API_KEY] = keys.youtubeApiKey;
  if (keys.openaiApiKey !== undefined) data[STORAGE_KEYS.OPENAI_API_KEY] = keys.openaiApiKey;
  if (keys.geminiApiKey !== undefined) data[STORAGE_KEYS.GEMINI_API_KEY] = keys.geminiApiKey;
  if (keys.aiProvider !== undefined) data[STORAGE_KEYS.AI_PROVIDER] = keys.aiProvider;
  return chrome.storage.local.set(data);
}

// APIキーを取得
async function getApiKeys() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.GOOGLE_API_KEY,
    STORAGE_KEYS.GOOGLE_SEARCH_ENGINE_ID,
    STORAGE_KEYS.YOUTUBE_API_KEY,
    STORAGE_KEYS.OPENAI_API_KEY,
    STORAGE_KEYS.GEMINI_API_KEY,
    STORAGE_KEYS.AI_PROVIDER
  ]);
  return {
    googleApiKey: result[STORAGE_KEYS.GOOGLE_API_KEY] || '',
    googleSearchEngineId: result[STORAGE_KEYS.GOOGLE_SEARCH_ENGINE_ID] || '',
    youtubeApiKey: result[STORAGE_KEYS.YOUTUBE_API_KEY] || '',
    openaiApiKey: result[STORAGE_KEYS.OPENAI_API_KEY] || '',
    geminiApiKey: result[STORAGE_KEYS.GEMINI_API_KEY] || '',
    aiProvider: result[STORAGE_KEYS.AI_PROVIDER] || 'openai'
  };
}

// キャッシュを保存（商品ASIN単位）
async function saveCache(asin, data) {
  const cacheData = await chrome.storage.local.get(STORAGE_KEYS.CACHE);
  const cache = cacheData[STORAGE_KEYS.CACHE] || {};
  cache[asin] = {
    data,
    timestamp: Date.now()
  };
  // 古いキャッシュを削除（100件まで保持）
  const keys = Object.keys(cache);
  if (keys.length > 100) {
    const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
    for (let i = 0; i < keys.length - 100; i++) {
      delete cache[sorted[i]];
    }
  }
  return chrome.storage.local.set({ [STORAGE_KEYS.CACHE]: cache });
}

// キャッシュを取得（24時間有効）
async function getCache(asin) {
  const cacheData = await chrome.storage.local.get(STORAGE_KEYS.CACHE);
  const cache = cacheData[STORAGE_KEYS.CACHE] || {};
  const entry = cache[asin];
  if (!entry) return null;

  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    return null;
  }
  return entry.data;
}

// キャッシュをクリア
async function clearCache() {
  return chrome.storage.local.remove(STORAGE_KEYS.CACHE);
}

export {
  STORAGE_KEYS,
  saveSettings,
  getSettings,
  saveApiKeys,
  getApiKeys,
  saveCache,
  getCache,
  clearCache
};
