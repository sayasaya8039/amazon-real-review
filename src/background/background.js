// background.js - Service Worker

const STORAGE_KEYS = {
  GOOGLE_API_KEY: 'googleApiKey',
  GOOGLE_SEARCH_ENGINE_ID: 'googleSearchEngineId',
  YOUTUBE_API_KEY: 'youtubeApiKey',
  OPENAI_API_KEY: 'openaiApiKey',
  GEMINI_API_KEY: 'geminiApiKey',
  AI_PROVIDER: 'aiProvider',
  CACHE: 'reviewCache'
};

const SITE_CONFIGS = {
  reddit: { name: 'Reddit', siteFilter: 'site:reddit.com', icon: '🔴' },
  youtube: { name: 'YouTube', siteFilter: 'site:youtube.com', icon: '📺' },
  kakaku: { name: '価格.com', siteFilter: 'site:kakaku.com', icon: '💰' },
  twitter: { name: 'X (Twitter)', siteFilter: 'site:twitter.com OR site:x.com', icon: '🐦' },
  fivech: { name: '5ch', siteFilter: 'site:5ch.net OR site:2ch.sc', icon: '📝' },
  zenn: { name: 'Zenn', siteFilter: 'site:zenn.dev', icon: '📘' },
  qiita: { name: 'Qiita', siteFilter: 'site:qiita.com', icon: '📗' }
};

const ANALYSIS_PROMPT = `あなたは商品レビューの分析専門家です。
以下の検索結果から、商品についての本音のレビュー・評判を分析してください。

【分析対象商品】
{productName}

【検索結果】
{searchResults}

以下のJSON形式で回答してください（日本語で）：
{
  "score": 数値（1.0〜5.0、0.1刻み、口コミに基づく実際の評価）,
  "summary": "総合評価の要約（2-3文）",
  "positives": ["良い点1", "良い点2", "良い点3"],
  "negatives": ["悪い点1", "悪い点2", "悪い点3"],
  "warnings": ["購入前に知っておくべき注意点（あれば）"],
  "confidence": "high/medium/low（情報量に基づく信頼度）"
}

注意事項：
- 検索結果が少ない場合は confidence を low にしてください
- ステマや偽レビューの可能性がある内容は除外してください
- 実際のユーザー体験に基づいた情報を重視してください
- 日本語で回答してください`;

async function getApiKeys() {
  // まずsync storageから取得（Googleアカウントと同期）
  let result = await chrome.storage.sync.get([
    STORAGE_KEYS.GOOGLE_API_KEY,
    STORAGE_KEYS.GOOGLE_SEARCH_ENGINE_ID,
    STORAGE_KEYS.YOUTUBE_API_KEY,
    STORAGE_KEYS.OPENAI_API_KEY,
    STORAGE_KEYS.GEMINI_API_KEY,
    STORAGE_KEYS.AI_PROVIDER
  ]);

  // syncに無ければlocal storageから取得（下位互換性）
  if (!result[STORAGE_KEYS.GOOGLE_API_KEY]) {
    const localResult = await chrome.storage.local.get([
      STORAGE_KEYS.GOOGLE_API_KEY,
      STORAGE_KEYS.GOOGLE_SEARCH_ENGINE_ID,
      STORAGE_KEYS.YOUTUBE_API_KEY,
      STORAGE_KEYS.OPENAI_API_KEY,
      STORAGE_KEYS.GEMINI_API_KEY,
      STORAGE_KEYS.AI_PROVIDER
    ]);
    if (localResult[STORAGE_KEYS.GOOGLE_API_KEY]) {
      result = localResult;
      // localにあったらsyncにも保存（自動移行）
      await chrome.storage.sync.set(localResult);
    }
  }

  return {
    googleApiKey: result[STORAGE_KEYS.GOOGLE_API_KEY] || '',
    googleSearchEngineId: result[STORAGE_KEYS.GOOGLE_SEARCH_ENGINE_ID] || '',
    youtubeApiKey: result[STORAGE_KEYS.YOUTUBE_API_KEY] || '',
    openaiApiKey: result[STORAGE_KEYS.OPENAI_API_KEY] || '',
    geminiApiKey: result[STORAGE_KEYS.GEMINI_API_KEY] || '',
    aiProvider: result[STORAGE_KEYS.AI_PROVIDER] || 'openai'
  };
}

async function saveCache(asin, data) {
  const cacheData = await chrome.storage.local.get(STORAGE_KEYS.CACHE);
  const cache = cacheData[STORAGE_KEYS.CACHE] || {};
  cache[asin] = { data: data, timestamp: Date.now() };
  const keys = Object.keys(cache);
  if (keys.length > 100) {
    const sorted = keys.sort(function(a, b) { return cache[a].timestamp - cache[b].timestamp; });
    for (let i = 0; i < keys.length - 100; i++) { delete cache[sorted[i]]; }
  }
  return chrome.storage.local.set({ [STORAGE_KEYS.CACHE]: cache });
}

async function getCache(asin) {
  const cacheData = await chrome.storage.local.get(STORAGE_KEYS.CACHE);
  const cache = cacheData[STORAGE_KEYS.CACHE] || {};
  const entry = cache[asin];
  if (!entry) return null;
  const CACHE_DURATION = 24 * 60 * 60 * 1000;
  if (Date.now() - entry.timestamp > CACHE_DURATION) return null;
  return entry.data;
}

async function searchGoogle(query, apiKey, searchEngineId, siteFilter) {
  const searchQuery = siteFilter ? query + ' ' + siteFilter : query;
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', searchEngineId);
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('num', '10');
  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Google Search API error');
  }
  const data = await response.json();
  return data.items || [];
}

async function searchSite(productName, site, apiKey, searchEngineId) {
  const config = SITE_CONFIGS[site];
  if (!config) throw new Error('Unknown site: ' + site);
  try {
    const results = await searchGoogle(productName, apiKey, searchEngineId, config.siteFilter);
    return {
      site: site,
      name: config.name,
      icon: config.icon,
      results: results.map(function(item) {
        return { title: item.title, link: item.link, snippet: item.snippet, displayLink: item.displayLink };
      }),
      error: null
    };
  } catch (error) {
    return { site: site, name: config.name, icon: config.icon, results: [], error: error.message };
  }
}

async function searchAllSites(productName, apiKey, searchEngineId) {
  const targetSites = Object.keys(SITE_CONFIGS);
  return Promise.all(targetSites.map(function(site) {
    return searchSite(productName, site, apiKey, searchEngineId);
  }));
}

function extractTextForAnalysis(searchResults) {
  const texts = [];
  for (let i = 0; i < searchResults.length; i++) {
    const siteResult = searchResults[i];
    if (siteResult.results.length > 0) {
      texts.push('【' + siteResult.name + '】');
      const items = siteResult.results.slice(0, 5);
      for (let j = 0; j < items.length; j++) {
        texts.push('- ' + items[j].title);
        if (items[j].snippet) texts.push('  ' + items[j].snippet);
      }
      texts.push('');
    }
  }
  return texts.join('\n');
}

async function analyzeWithOpenAI(productName, searchResultsText, apiKey) {
  const prompt = ANALYSIS_PROMPT.replace('{productName}', productName).replace('{searchResults}', searchResultsText);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'あなたは商品レビュー分析の専門家です。正確で客観的な分析を提供してください。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function analyzeWithGemini(productName, searchResultsText, apiKey) {
  const prompt = ANALYSIS_PROMPT.replace('{productName}', productName).replace('{searchResults}', searchResultsText);
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }
  const data = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

async function analyzeReviews(productName, searchResultsText, apiKeys) {
  if (apiKeys.aiProvider === 'openai' && apiKeys.openaiApiKey) {
    return analyzeWithOpenAI(productName, searchResultsText, apiKeys.openaiApiKey);
  }
  if (apiKeys.aiProvider === 'gemini' && apiKeys.geminiApiKey) {
    return analyzeWithGemini(productName, searchResultsText, apiKeys.geminiApiKey);
  }
  if (apiKeys.openaiApiKey) return analyzeWithOpenAI(productName, searchResultsText, apiKeys.openaiApiKey);
  if (apiKeys.geminiApiKey) return analyzeWithGemini(productName, searchResultsText, apiKeys.geminiApiKey);
  throw new Error('AIのAPIキーが設定されていません');
}

function getDefaultAnalysis() {
  return { score: null, summary: 'AI分析を利用するにはAPIキーを設定してください', positives: [], negatives: [], warnings: [], confidence: 'none' };
}

async function handleSearchReviews(data) {
  const asin = data.asin;
  const productName = data.productName;
  try {
    const apiKeys = await getApiKeys();
    if (!apiKeys.googleApiKey || !apiKeys.googleSearchEngineId) {
      return { success: false, error: 'Google Custom Search APIキーが設定されていません', needsSetup: true };
    }
    const cached = await getCache(asin);
    if (cached) return { success: true, data: cached, fromCache: true };
    const searchResults = await searchAllSites(productName, apiKeys.googleApiKey, apiKeys.googleSearchEngineId);
    let analysis;
    if (apiKeys.openaiApiKey || apiKeys.geminiApiKey) {
      try {
        const textForAnalysis = extractTextForAnalysis(searchResults);
        analysis = await analyzeReviews(productName, textForAnalysis, apiKeys);
      } catch (error) {
        console.error('AI analysis error:', error);
        analysis = Object.assign({}, getDefaultAnalysis(), { summary: 'AI分析エラー: ' + error.message });
      }
    } else {
      analysis = getDefaultAnalysis();
    }
    const result = { searchResults: searchResults, analysis: analysis, timestamp: Date.now() };
    await saveCache(asin, result);
    return { success: true, data: result, fromCache: false };
  } catch (error) {
    console.error('Search error:', error);
    return { success: false, error: error.message };
  }
}

async function handleGetCachedReviews(data) {
  const cached = await getCache(data.asin);
  if (cached) return { success: true, data: cached, fromCache: true };
  return { success: false, error: 'No cache found' };
}

async function handleCheckApiKeys() {
  const apiKeys = await getApiKeys();
  return {
    hasGoogleApi: !!(apiKeys.googleApiKey && apiKeys.googleSearchEngineId),
    hasOpenAi: !!apiKeys.openaiApiKey,
    hasGemini: !!apiKeys.geminiApiKey,
    aiProvider: apiKeys.aiProvider
  };
}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.action.onClicked.addListener(async function(tab) {
  if (tab.url && (tab.url.includes('amazon.co.jp') || tab.url.includes('amazon.com'))) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  (async function() {
    let response;
    switch (message.type) {
      case 'GET_PRODUCT_INFO': response = { success: true }; break;
      case 'SEARCH_REVIEWS': response = await handleSearchReviews(message.data); break;
      case 'GET_CACHED_REVIEWS': response = await handleGetCachedReviews(message.data); break;
      case 'CHECK_API_KEYS': response = await handleCheckApiKeys(); break;
      case 'OPEN_SIDE_PANEL':
        if (sender.tab) await chrome.sidePanel.open({ tabId: sender.tab.id });
        response = { success: true };
        break;
      default: response = { error: 'Unknown message type' };
    }
    sendResponse(response);
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});
