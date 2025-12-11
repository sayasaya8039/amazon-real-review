// options.js - 設定画面ロジック

(function() {
  'use strict';

  // Storage Keys
  const STORAGE_KEYS = {
    GOOGLE_API_KEY: 'googleApiKey',
    GOOGLE_SEARCH_ENGINE_ID: 'googleSearchEngineId',
    YOUTUBE_API_KEY: 'youtubeApiKey',
    OPENAI_API_KEY: 'openaiApiKey',
    GEMINI_API_KEY: 'geminiApiKey',
    AI_PROVIDER: 'aiProvider',
    CACHE: 'reviewCache'
  };

  // sync storageを使用（Googleアカウントで同期、より永続的）
  // localにもバックアップ保存
  async function saveApiKeys(keys) {
    const data = {};
    if (keys.googleApiKey !== undefined) data[STORAGE_KEYS.GOOGLE_API_KEY] = keys.googleApiKey;
    if (keys.googleSearchEngineId !== undefined) data[STORAGE_KEYS.GOOGLE_SEARCH_ENGINE_ID] = keys.googleSearchEngineId;
    if (keys.youtubeApiKey !== undefined) data[STORAGE_KEYS.YOUTUBE_API_KEY] = keys.youtubeApiKey;
    if (keys.openaiApiKey !== undefined) data[STORAGE_KEYS.OPENAI_API_KEY] = keys.openaiApiKey;
    if (keys.geminiApiKey !== undefined) data[STORAGE_KEYS.GEMINI_API_KEY] = keys.geminiApiKey;
    if (keys.aiProvider !== undefined) data[STORAGE_KEYS.AI_PROVIDER] = keys.aiProvider;

    // syncとlocalの両方に保存（冗長性確保）
    await Promise.all([
      chrome.storage.sync.set(data),
      chrome.storage.local.set(data)
    ]);
  }

  async function getApiKeys() {
    // まずsyncから取得、なければlocalから取得
    let result = await chrome.storage.sync.get([
      STORAGE_KEYS.GOOGLE_API_KEY,
      STORAGE_KEYS.GOOGLE_SEARCH_ENGINE_ID,
      STORAGE_KEYS.YOUTUBE_API_KEY,
      STORAGE_KEYS.OPENAI_API_KEY,
      STORAGE_KEYS.GEMINI_API_KEY,
      STORAGE_KEYS.AI_PROVIDER
    ]);

    // syncに無ければlocalから取得（移行対応）
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
        // localにあったらsyncにも保存
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

  async function clearCache() {
    return chrome.storage.local.remove(STORAGE_KEYS.CACHE);
  }

  // 設定をJSONファイルにエクスポート
  async function exportSettings() {
    const keys = await getApiKeys();
    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      settings: keys
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'honneReview_settings_' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  // JSONファイルから設定をインポート
  async function importSettings(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(e) {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.settings) {
            reject(new Error('無効な設定ファイルです'));
            return;
          }
          await saveApiKeys(data.settings);
          resolve(data.settings);
        } catch (err) {
          reject(new Error('ファイルの読み込みに失敗しました: ' + err.message));
        }
      };
      reader.onerror = function() {
        reject(new Error('ファイルの読み込みに失敗しました'));
      };
      reader.readAsText(file);
    });
  }

  const form = document.getElementById('settings-form');
  const statusEl = document.getElementById('status');
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFileInput = document.getElementById('import-file');

  const inputs = {
    googleApiKey: document.getElementById('google-api-key'),
    googleSearchEngineId: document.getElementById('google-search-engine-id'),
    openaiApiKey: document.getElementById('openai-api-key'),
    geminiApiKey: document.getElementById('gemini-api-key'),
    youtubeApiKey: document.getElementById('youtube-api-key')
  };

  const statusBadges = {
    googleApi: document.getElementById('google-api-status'),
    searchEngine: document.getElementById('search-engine-status'),
    openai: document.getElementById('openai-status'),
    gemini: document.getElementById('gemini-status'),
    youtube: document.getElementById('youtube-status')
  };

  async function init() {
    await loadSettings();
    setupEventListeners();
  }

  async function loadSettings() {
    const keys = await getApiKeys();
    inputs.googleApiKey.value = keys.googleApiKey || '';
    inputs.googleSearchEngineId.value = keys.googleSearchEngineId || '';
    inputs.openaiApiKey.value = keys.openaiApiKey || '';
    inputs.geminiApiKey.value = keys.geminiApiKey || '';
    inputs.youtubeApiKey.value = keys.youtubeApiKey || '';

    const aiProvider = keys.aiProvider || 'openai';
    const radioEl = document.querySelector('input[name="ai-provider"][value="' + aiProvider + '"]');
    if (radioEl) radioEl.checked = true;

    updateStatusBadges(keys);
  }

  function updateStatusBadges(keys) {
    updateBadge(statusBadges.googleApi, keys.googleApiKey);
    updateBadge(statusBadges.searchEngine, keys.googleSearchEngineId);
    updateBadge(statusBadges.openai, keys.openaiApiKey);
    updateBadge(statusBadges.gemini, keys.geminiApiKey);
    updateBadge(statusBadges.youtube, keys.youtubeApiKey);
  }

  function updateBadge(badge, value) {
    if (value) {
      badge.textContent = '設定済み ✓';
      badge.className = 'key-status set';
    } else {
      badge.textContent = '未設定';
      badge.className = 'key-status not-set';
    }
  }

  function setupEventListeners() {
    form.addEventListener('submit', handleSubmit);
    clearCacheBtn.addEventListener('click', handleClearCache);

    // エクスポート/インポートボタン
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', function() {
      importFileInput.click();
    });
    importFileInput.addEventListener('change', handleImport);

    inputs.googleApiKey.addEventListener('input', function() {
      updateBadge(statusBadges.googleApi, inputs.googleApiKey.value);
    });
    inputs.googleSearchEngineId.addEventListener('input', function() {
      updateBadge(statusBadges.searchEngine, inputs.googleSearchEngineId.value);
    });
    inputs.openaiApiKey.addEventListener('input', function() {
      updateBadge(statusBadges.openai, inputs.openaiApiKey.value);
    });
    inputs.geminiApiKey.addEventListener('input', function() {
      updateBadge(statusBadges.gemini, inputs.geminiApiKey.value);
    });
    inputs.youtubeApiKey.addEventListener('input', function() {
      updateBadge(statusBadges.youtube, inputs.youtubeApiKey.value);
    });
  }

  async function handleExport() {
    try {
      await exportSettings();
      showStatus('設定をエクスポートしました', 'success');
    } catch (error) {
      showStatus('エクスポートに失敗しました: ' + error.message, 'error');
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const settings = await importSettings(file);
      await loadSettings();
      showStatus('設定をインポートしました', 'success');
    } catch (error) {
      showStatus('インポートに失敗しました: ' + error.message, 'error');
    }

    // ファイル選択をリセット
    importFileInput.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const aiProviderEl = document.querySelector('input[name="ai-provider"]:checked');
    const aiProvider = aiProviderEl ? aiProviderEl.value : 'openai';

    const keys = {
      googleApiKey: inputs.googleApiKey.value.trim(),
      googleSearchEngineId: inputs.googleSearchEngineId.value.trim(),
      openaiApiKey: inputs.openaiApiKey.value.trim(),
      geminiApiKey: inputs.geminiApiKey.value.trim(),
      youtubeApiKey: inputs.youtubeApiKey.value.trim(),
      aiProvider: aiProvider
    };

    if (!keys.googleApiKey || !keys.googleSearchEngineId) {
      showStatus('Google Custom Search APIの設定は必須です', 'error');
      return;
    }

    if (!keys.openaiApiKey && !keys.geminiApiKey) {
      const confirmed = confirm(
        'AI APIキーが設定されていません。\n' +
        'AI分析機能（要約・スコア算出）は利用できませんが、続行しますか？'
      );
      if (!confirmed) return;
    }

    try {
      await saveApiKeys(keys);
      showStatus('設定を保存しました', 'success');
      updateStatusBadges(keys);
    } catch (error) {
      showStatus('保存に失敗しました: ' + error.message, 'error');
    }
  }

  async function handleClearCache() {
    const confirmed = confirm('キャッシュをクリアしますか？\n次回検索時に再取得します。');
    if (!confirmed) return;

    try {
      await clearCache();
      showStatus('キャッシュをクリアしました', 'success');
    } catch (error) {
      showStatus('キャッシュのクリアに失敗しました: ' + error.message, 'error');
    }
  }

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;

    setTimeout(function() {
      statusEl.className = 'status';
    }, 3000);
  }

  init();
})();
