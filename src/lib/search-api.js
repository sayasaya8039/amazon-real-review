// search-api.js - Google Custom Search API

const SITE_CONFIGS = {
  reddit: {
    name: 'Reddit',
    siteFilter: 'site:reddit.com',
    icon: '🔴'
  },
  youtube: {
    name: 'YouTube',
    siteFilter: 'site:youtube.com',
    icon: '📺'
  },
  kakaku: {
    name: '価格.com',
    siteFilter: 'site:kakaku.com',
    icon: '💰'
  },
  twitter: {
    name: 'X (Twitter)',
    siteFilter: 'site:twitter.com OR site:x.com',
    icon: '🐦'
  },
  fivech: {
    name: '5ch',
    siteFilter: 'site:5ch.net OR site:2ch.sc',
    icon: '📝'
  },
  zenn: {
    name: 'Zenn',
    siteFilter: 'site:zenn.dev',
    icon: '📘'
  },
  qiita: {
    name: 'Qiita',
    siteFilter: 'site:qiita.com',
    icon: '📗'
  }
};

// Google Custom Search APIで検索
async function searchGoogle(query, apiKey, searchEngineId, siteFilter = '') {
  const searchQuery = siteFilter ? `${query} ${siteFilter}` : query;
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

// 特定サイトの検索結果を取得
async function searchSite(productName, site, apiKey, searchEngineId) {
  const config = SITE_CONFIGS[site];
  if (!config) {
    throw new Error(`Unknown site: ${site}`);
  }

  try {
    const results = await searchGoogle(
      productName,
      apiKey,
      searchEngineId,
      config.siteFilter
    );

    return {
      site,
      name: config.name,
      icon: config.icon,
      results: results.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink
      })),
      error: null
    };
  } catch (error) {
    return {
      site,
      name: config.name,
      icon: config.icon,
      results: [],
      error: error.message
    };
  }
}

// 全サイトを検索
async function searchAllSites(productName, apiKey, searchEngineId, sites = null) {
  const targetSites = sites || Object.keys(SITE_CONFIGS);

  // 並列で検索（ただしレート制限に注意）
  const results = await Promise.all(
    targetSites.map(site => searchSite(productName, site, apiKey, searchEngineId))
  );

  return results;
}

// 検索結果からテキストを抽出（AI分析用）
function extractTextForAnalysis(searchResults) {
  const texts = [];

  for (const siteResult of searchResults) {
    if (siteResult.results.length > 0) {
      texts.push(`【${siteResult.name}】`);
      for (const item of siteResult.results.slice(0, 5)) {
        texts.push(`- ${item.title}`);
        if (item.snippet) {
          texts.push(`  ${item.snippet}`);
        }
      }
      texts.push('');
    }
  }

  return texts.join('\n');
}

export {
  SITE_CONFIGS,
  searchGoogle,
  searchSite,
  searchAllSites,
  extractTextForAnalysis
};
