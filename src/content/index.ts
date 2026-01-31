import type { ProductInfo, AnalysisResult, Message, MessageResponse, Settings } from '@/types';
import { extractMercariProduct } from './mercari';
import { extractAmazonProduct, hideMarketplaceSellers, showMarketplaceSellers, hideNonPrimeInSearchResults, showNonPrimeInSearchResults, getAmazonPageType } from './amazon';
import { injectUI } from './ui';

function detectPlatform(): 'mercari' | 'amazon' | null {
  const url = window.location.href;
  if (url.includes('mercari.com')) return 'mercari';
  if (url.includes('amazon.co.jp')) return 'amazon';
  return null;
}

async function main() {
  console.log('[サクラ探知機] Content script started');

  const platform = detectPlatform();
  if (!platform) {
    console.log('[サクラ探知機] Not a supported platform');
    return;
  }

  console.log('[サクラ探知機] Platform detected:', platform);

  // 設定を取得してマーケットプレイス非表示を適用（Amazonのみ）
  if (platform === 'amazon') {
    try {
      const settingsResponse = await sendMessage<Settings>({ type: 'GET_SETTINGS' });
      if (settingsResponse.success && settingsResponse.data?.hideMarketplaceSellers) {
        const pageType = getAmazonPageType();
        console.log('[サクラ探知機] Amazon page type:', pageType);
        
        if (pageType === 'product') {
          hideMarketplaceSellers();
        } else if (pageType === 'search') {
          hideNonPrimeInSearchResults();
        }
      }
    } catch (error) {
      console.error('[サクラ探知機] Failed to get settings:', error);
    }
  }

  // 検索結果ページの場合は商品分析をスキップ
  if (platform === 'amazon' && getAmazonPageType() === 'search') {
    console.log('[サクラ探知機] Search page - skipping product analysis');
    return;
  }

  let product: ProductInfo | null = null;

  try {
    if (platform === 'mercari') {
      product = await extractMercariProduct();
    } else if (platform === 'amazon') {
      product = await extractAmazonProduct();
    }
  } catch (error) {
    console.error('[サクラ探知機] Product extraction error:', error);
    return;
  }

  if (!product) {
    console.log('[サクラ探知機] Could not extract product info');
    // 商品情報が取得できなくてもデモ表示
    showDemoUI(platform);
    return;
  }

  console.log('[サクラ探知機] Product extracted:', product.title);

  try {
    const response = await sendMessage<AnalysisResult>({
      type: 'ANALYZE_PRODUCT',
      payload: product,
    });

    console.log('[サクラ探知機] Response received:', response);

    if (response && response.success && response.data) {
      console.log('[サクラ探知機] Analysis complete:', response.data);
      injectUI(response.data, platform, product.imageUrls);
    } else {
      console.error('[サクラ探知機] Analysis failed:', response?.error || 'Unknown error');
      // エラー時もデモ表示
      showDemoUI(platform);
    }
  } catch (error) {
    console.error('[サクラ探知機] Message send error:', error);
    showDemoUI(platform);
  }
}

function showDemoUI(platform: 'mercari' | 'amazon', imageUrls: string[] = []) {
  // バックグラウンドスクリプトと通信できない場合のフォールバック
  const demoResult: AnalysisResult = {
    productId: 'demo',
    overallSakuraScore: 0,
    resaleDetection: null,
    reviewAnalysis: {
      totalReviews: 0,
      analyzedReviews: 0,
      suspiciousReviews: 0,
      averageSakuraScore: 0,
    },
    warnings: [{
      level: 'low',
      type: 'other',
      message: '分析待機中... (バックグラウンドスクリプトを確認してください)',
    }],
    analyzedAt: Date.now(),
  };
  injectUI(demoResult, platform, imageUrls);
}

function sendMessage<T>(message: Message): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
        if (chrome.runtime.lastError) {
          console.error('[サクラ探知機] Runtime error:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { success: false, error: 'No response' });
      });
    } catch (error) {
      console.error('[サクラ探知機] Send message error:', error);
      resolve({ success: false, error: String(error) });
    }
  });
}

// ページ読み込み完了後に実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(main, 500); // DOMが安定するまで少し待つ
  });
} else {
  setTimeout(main, 500);
}

// SPAでのページ遷移を検出
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log('[サクラ探知機] URL changed, re-running...');
    setTimeout(main, 1000);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// ポップアップからのメッセージを受信
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE') {
    console.log('[サクラ探知機] Manual analysis requested');
    main().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: String(error) });
    });
    return true; // 非同期レスポンスを有効化
  }
  return false;
});

console.log('[サクラ探知機] Content script loaded');

// 設定変更を監視（Amazonのみ）
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.settings) {
    const newSettings = changes.settings.newValue as Settings;
    const platform = detectPlatform();
    
    if (platform === 'amazon') {
      const pageType = getAmazonPageType();
      
      if (newSettings.hideMarketplaceSellers) {
        if (pageType === 'product') {
          hideMarketplaceSellers();
        } else if (pageType === 'search') {
          hideNonPrimeInSearchResults();
        }
      } else {
        if (pageType === 'product') {
          showMarketplaceSellers();
        } else if (pageType === 'search') {
          showNonPrimeInSearchResults();
        }
      }
    }
  }
});
