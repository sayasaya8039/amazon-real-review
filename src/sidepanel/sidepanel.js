// sidepanel.js - サイドパネルロジック

// サイト設定
const SITE_CONFIGS = {
  reddit: { name: 'Reddit', icon: '🔴' },
  youtube: { name: 'YouTube', icon: '📺' },
  kakaku: { name: '価格.com', icon: '💰' },
  twitter: { name: 'X (Twitter)', icon: '🐦' },
  fivech: { name: '5ch', icon: '📝' },
  zenn: { name: 'Zenn', icon: '📘' },
  qiita: { name: 'Qiita', icon: '📗' }
};

// スコアを星表示に変換
function scoreToStars(score) {
  const fullStars = Math.floor(score);
  const halfStar = score - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
}

// DOM要素
const elements = {
  productInfo: document.getElementById('product-info'),
  productImage: document.getElementById('product-image'),
  productName: document.getElementById('product-name'),
  amazonRating: document.getElementById('amazon-rating'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  errorMessage: document.getElementById('error-message'),
  retryBtn: document.getElementById('retry-btn'),
  setupNotice: document.getElementById('setup-notice'),
  setupBtn: document.getElementById('setup-btn'),
  analysis: document.getElementById('analysis'),
  confidenceBadge: document.getElementById('confidence-badge'),
  scoreStars: document.getElementById('score-stars'),
  scoreValue: document.getElementById('score-value'),
  analysisSummary: document.getElementById('analysis-summary'),
  positivesList: document.getElementById('positives-list'),
  negativesList: document.getElementById('negatives-list'),
  warningsSection: document.getElementById('warnings-section'),
  warningsList: document.getElementById('warnings-list'),
  tabs: document.getElementById('tabs'),
  tabButtons: document.getElementById('tab-buttons'),
  results: document.getElementById('results'),
  resultsContent: document.getElementById('results-content'),
  emptyState: document.getElementById('empty-state'),
  cacheIndicator: document.getElementById('cache-indicator'),
  lastUpdated: document.getElementById('last-updated'),
  settingsBtn: document.getElementById('settings-btn'),
  sakuraCheckerLink: document.getElementById('sakura-checker-link')
};

// 現在の状態
let currentProduct = null;
let currentResults = null;
let activeTab = 'all';

// 初期化
async function init() {
  setupEventListeners();
  await checkCurrentTab();
}

// イベントリスナー設定
function setupEventListeners() {
  elements.settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  elements.setupBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  elements.retryBtn.addEventListener('click', () => {
    if (currentProduct) {
      searchReviews(currentProduct);
    }
  });
}

// 現在のタブをチェック
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || (!tab.url.includes('amazon.co.jp') && !tab.url.includes('amazon.com'))) {
      showEmptyState();
      return;
    }

    // content scriptから商品情報を取得
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCT_INFO' });

      if (response && response.success && response.data) {
        currentProduct = response.data;
        showProductInfo(currentProduct);
        await searchReviews(currentProduct);
      } else {
        showEmptyState();
      }
    } catch (e) {
      // content scriptがまだ読み込まれていない可能性
      console.log('Content script not ready, retrying...');
      setTimeout(checkCurrentTab, 1000);
    }
  } catch (error) {
    console.error('Failed to get product info:', error);
    showEmptyState();
  }
}

// 商品情報を表示
function showProductInfo(product) {
  elements.emptyState.classList.add('hidden');
  elements.productInfo.classList.remove('hidden');

  elements.productName.textContent = product.name || '商品名を取得中...';

  if (product.image) {
    elements.productImage.src = product.image;
  }

  if (product.amazonRating) {
    elements.amazonRating.innerHTML = `
      Amazon評価: <span class="stars">${'★'.repeat(Math.round(product.amazonRating))}${'☆'.repeat(5 - Math.round(product.amazonRating))}</span>
      ${product.amazonRating} (${product.reviewCount || 0}件)
    `;
  }

  // サクラチェッカーのリンクを設定
  if (product.asin && elements.sakuraCheckerLink) {
    elements.sakuraCheckerLink.href = `https://sakura-checker.jp/search/${product.asin}/`;
  }
}

// レビュー検索
async function searchReviews(product) {
  showLoading();

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SEARCH_REVIEWS',
      data: {
        asin: product.asin,
        productName: product.name
      }
    });

    if (response.needsSetup) {
      showSetupNotice();
      return;
    }

    if (!response.success) {
      showError(response.error);
      return;
    }

    currentResults = response.data;
    showResults(response.data, response.fromCache);

  } catch (error) {
    console.error('Search error:', error);
    showError('検索中にエラーが発生しました');
  }
}

// 読み込み中を表示
function showLoading() {
  hideAll();
  elements.productInfo.classList.remove('hidden');
  elements.loading.classList.remove('hidden');
}

// エラーを表示
function showError(message) {
  hideAll();
  elements.productInfo.classList.remove('hidden');
  elements.error.classList.remove('hidden');
  elements.errorMessage.textContent = message;
}

// セットアップ案内を表示
function showSetupNotice() {
  hideAll();
  elements.productInfo.classList.remove('hidden');
  elements.setupNotice.classList.remove('hidden');
}

// 空の状態を表示
function showEmptyState() {
  hideAll();
  elements.emptyState.classList.remove('hidden');
}

// 全て非表示
function hideAll() {
  elements.loading.classList.add('hidden');
  elements.error.classList.add('hidden');
  elements.setupNotice.classList.add('hidden');
  elements.analysis.classList.add('hidden');
  elements.tabs.classList.add('hidden');
  elements.results.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.cacheIndicator.classList.add('hidden');
}

// 結果を表示
function showResults(data, fromCache) {
  hideAll();
  elements.productInfo.classList.remove('hidden');

  // AI分析を表示
  if (data.analysis && data.analysis.score !== null) {
    showAnalysis(data.analysis);
  }

  // タブを生成
  generateTabs(data.searchResults);

  // 検索結果を表示
  showSearchResults(data.searchResults);

  // キャッシュ表示
  if (fromCache) {
    elements.cacheIndicator.classList.remove('hidden');
  }

  // 更新時刻
  if (data.timestamp) {
    const date = new Date(data.timestamp);
    elements.lastUpdated.textContent = `更新: ${date.toLocaleString('ja-JP')}`;
  }
}

// AI分析を表示
function showAnalysis(analysis) {
  elements.analysis.classList.remove('hidden');

  // スコア
  if (analysis.score) {
    elements.scoreStars.textContent = scoreToStars(analysis.score);
    elements.scoreValue.textContent = analysis.score.toFixed(1);
  } else {
    elements.scoreStars.textContent = '';
    elements.scoreValue.textContent = '-';
  }

  // 信頼度バッジ
  const confidenceLabels = {
    high: '信頼度: 高',
    medium: '信頼度: 中',
    low: '信頼度: 低',
    none: ''
  };
  elements.confidenceBadge.textContent = confidenceLabels[analysis.confidence] || '';
  elements.confidenceBadge.className = `confidence-badge ${analysis.confidence}`;

  // 要約
  elements.analysisSummary.textContent = analysis.summary || '';

  // 良い点
  elements.positivesList.innerHTML = '';
  (analysis.positives || []).forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    elements.positivesList.appendChild(li);
  });

  // 悪い点
  elements.negativesList.innerHTML = '';
  (analysis.negatives || []).forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    elements.negativesList.appendChild(li);
  });

  // 注意点
  if (analysis.warnings && analysis.warnings.length > 0) {
    elements.warningsSection.classList.remove('hidden');
    elements.warningsList.innerHTML = '';
    analysis.warnings.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      elements.warningsList.appendChild(li);
    });
  } else {
    elements.warningsSection.classList.add('hidden');
  }
}

// タブを生成
function generateTabs(searchResults) {
  elements.tabs.classList.remove('hidden');
  elements.tabButtons.innerHTML = '';

  // 全てタブ
  const allCount = searchResults.reduce((sum, site) => sum + site.results.length, 0);
  const allBtn = createTabButton('all', '全て', allCount);
  elements.tabButtons.appendChild(allBtn);

  // サイト別タブ
  searchResults.forEach(site => {
    if (site.results.length > 0) {
      const btn = createTabButton(site.site, `${site.icon} ${site.name}`, site.results.length);
      elements.tabButtons.appendChild(btn);
    }
  });
}

// タブボタン作成
function createTabButton(id, label, count) {
  const btn = document.createElement('button');
  btn.className = `tab-btn ${activeTab === id ? 'active' : ''}`;
  btn.innerHTML = `${label}<span class="count">(${count})</span>`;
  btn.addEventListener('click', () => {
    activeTab = id;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    showSearchResults(currentResults.searchResults);
  });
  return btn;
}

// 検索結果を表示
function showSearchResults(searchResults) {
  elements.results.classList.remove('hidden');
  elements.resultsContent.innerHTML = '';

  let resultsToShow = [];

  if (activeTab === 'all') {
    searchResults.forEach(site => {
      site.results.forEach(result => {
        resultsToShow.push({ ...result, siteIcon: site.icon, siteName: site.name });
      });
    });
  } else {
    const site = searchResults.find(s => s.site === activeTab);
    if (site) {
      resultsToShow = site.results.map(result => ({
        ...result,
        siteIcon: site.icon,
        siteName: site.name
      }));
    }
  }

  if (resultsToShow.length === 0) {
    elements.resultsContent.innerHTML = '<div class="no-results">検索結果がありません</div>';
    return;
  }

  resultsToShow.forEach(result => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <a href="${escapeHtml(result.link)}" target="_blank">${escapeHtml(result.title)}</a>
      <div class="snippet">${escapeHtml(result.snippet || '')}</div>
      <div class="source">${result.siteIcon} ${result.siteName} - ${escapeHtml(result.displayLink)}</div>
    `;
    elements.resultsContent.appendChild(card);
  });
}

// HTMLエスケープ
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// タブ変更時のメッセージを監視
chrome.tabs.onActivated.addListener(() => {
  checkCurrentTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    checkCurrentTab();
  }
});

// 初期化実行
init();
