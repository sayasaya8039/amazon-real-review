import type { ProductInfo, Review } from '@/types';

export async function extractAmazonProduct(): Promise<ProductInfo | null> {
  try {
    // 商品ID (ASIN)
    const asinMatch = window.location.href.match(/\/dp\/([A-Z0-9]+)/);
    const productId = asinMatch?.[1] ?? `amazon-${Date.now()}`;

    // 商品タイトル
    const titleEl = document.querySelector('#productTitle');
    const title = titleEl?.textContent?.trim() || '不明な商品';

    // 価格
    const priceEl = document.querySelector('.a-price-whole') ||
                    document.querySelector('#priceblock_ourprice') ||
                    document.querySelector('#priceblock_dealprice');
    const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '') || '0';
    const price = parseInt(priceText, 10);

    // 画像URL
    const mainImage = document.querySelector('#landingImage, #imgBlkFront') as HTMLImageElement;
    const imageUrls = mainImage?.src ? [mainImage.src] : [];

    // サムネイル画像も取得
    const thumbs = document.querySelectorAll('#altImages img');
    thumbs.forEach(thumb => {
      const src = (thumb as HTMLImageElement).src;
      if (src && !src.includes('sprite')) {
        // 大きい画像URLに変換
        const largeUrl = src.replace(/\._.*_\./, '._AC_SL1500_.');
        imageUrls.push(largeUrl);
      }
    });

    // レビュー抽出
    const reviews = await extractAmazonReviews();

    return {
      id: productId,
      title,
      price,
      currency: 'JPY',
      imageUrls: [...new Set(imageUrls)], // 重複削除
      reviews,
      platform: 'amazon',
      url: window.location.href,
    };
  } catch (error) {
    console.error('[サクラ探知機] Amazon extraction error:', error);
    return null;
  }
}

async function extractAmazonReviews(): Promise<Review[]> {
  const reviews: Review[] = [];

  // ページ内のレビューを取得
  const reviewEls = document.querySelectorAll('[data-hook="review"]');

  reviewEls.forEach((reviewEl, index) => {
    try {
      const authorEl = reviewEl.querySelector('.a-profile-name');
      const ratingEl = reviewEl.querySelector('[data-hook="review-star-rating"], [data-hook="cmps-review-star-rating"]');
      const contentEl = reviewEl.querySelector('[data-hook="review-body"]');
      const dateEl = reviewEl.querySelector('[data-hook="review-date"]');
      const verifiedEl = reviewEl.querySelector('[data-hook="avp-badge"]');

      const ratingText = ratingEl?.textContent || '';
      const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
      const rating = ratingMatch?.[1] ? parseFloat(ratingMatch[1]) : 0;

      reviews.push({
        id: `review-${index}`,
        author: authorEl?.textContent?.trim() || '匿名',
        rating,
        content: contentEl?.textContent?.trim() || '',
        date: dateEl?.textContent?.trim() || '',
        isVerified: !!verifiedEl,
      });
    } catch (e) {
      console.error('[サクラ探知機] Review parse error:', e);
    }
  });

  return reviews;
}


// マーケットプレイス出品を非表示にする
export function hideMarketplaceSellers(): void {
  // 非表示にするセレクター
  const selectors = [
    '#aod-offer-list',              // オファーリスト
    '#aod-pinned-offer',            // ピン留めオファー
    '#olp_feature_div',             // 他の出品者リンク
    '#mbc',                         // マーケットプレイスボックス
    '#buybox-see-all-buying-choices', // 「他の出品者を見る」ボタン
    '.mbc-offer-row',               // 個別オファー行
    '[data-action="show-all-offers-display"]', // オファー表示トリガー
    '#all-offers-display',          // 全オファー表示
  ];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
  });

  // Amazon販売以外の出品者情報を非表示
  const merchantInfo = document.querySelector('#merchant-info');
  if (merchantInfo) {
    const text = merchantInfo.textContent || '';
    // Amazon.co.jp以外が販売している場合は警告を表示
    if (!text.includes('Amazon.co.jp') && !text.includes('Amazon.co.jpが販売')) {
      const warning = document.createElement('div');
      warning.id = 'sakura-marketplace-warning';
      warning.style.cssText = 'background:#fff3cd;border:1px solid #ffc107;padding:10px;margin:10px 0;border-radius:4px;font-size:14px;';
      warning.innerHTML = '⚠️ <strong>マーケットプレイス出品</strong>: この商品はAmazon以外の出品者が販売しています';
      
      // 既存の警告がなければ追加
      if (!document.getElementById('sakura-marketplace-warning')) {
        merchantInfo.parentElement?.insertBefore(warning, merchantInfo);
      }
    }
  }

  console.log('[サクラ探知機] Marketplace sellers hidden');
}

// マーケットプレイス非表示を解除
export function showMarketplaceSellers(): void {
  const selectors = [
    '#aod-offer-list',
    '#aod-pinned-offer',
    '#olp_feature_div',
    '#mbc',
    '#buybox-see-all-buying-choices',
    '.mbc-offer-row',
    '[data-action="show-all-offers-display"]',
    '#all-offers-display',
  ];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      (el as HTMLElement).style.display = '';
    });
  });

  // 警告を削除
  const warning = document.getElementById('sakura-marketplace-warning');
  if (warning) {
    warning.remove();
  }

  console.log('[サクラ探知機] Marketplace sellers shown');
}


// 検索結果ページでPrime以外の商品を非表示にする
export function hideNonPrimeInSearchResults(): void {
  // 検索結果の各商品アイテムを取得
  const searchResults = document.querySelectorAll('[data-component-type="s-search-result"]');
  
  let hiddenCount = 0;
  
  searchResults.forEach((item) => {
    const element = item as HTMLElement;
    
    // Prime badgeを確認（複数のセレクターで検出）
    const hasPrimeBadge = 
      element.querySelector('.a-icon-prime') !== null ||
      element.querySelector('[data-component-type="s-prime-badge"]') !== null ||
      element.querySelector('[aria-label*="Prime"]') !== null ||
      element.querySelector('.s-prime') !== null ||
      element.querySelector('i.a-icon.a-icon-prime') !== null;
    
    // Amazon.co.jpが販売・発送しているか確認
    const shippingInfo = element.textContent || '';
    const isAmazonFulfilled = 
      shippingInfo.includes('Amazon.co.jpが発送') ||
      shippingInfo.includes('Amazonが発送');
    
    // Prime badgeがない、かつAmazon発送でない場合は非表示
    if (!hasPrimeBadge && !isAmazonFulfilled) {
      element.style.display = 'none';
      element.setAttribute('data-sakura-hidden', 'marketplace');
      hiddenCount++;
    }
  });
  
  // 非表示件数を表示
  showHiddenCountBanner(hiddenCount);
  
  console.log('[サクラ探知機] Search results: hidden ' + hiddenCount + ' non-Prime items');
}

// 検索結果ページの非表示を解除
export function showNonPrimeInSearchResults(): void {
  const hiddenItems = document.querySelectorAll('[data-sakura-hidden="marketplace"]');
  
  hiddenItems.forEach((item) => {
    const element = item as HTMLElement;
    element.style.display = '';
    element.removeAttribute('data-sakura-hidden');
  });
  
  // バナーを削除
  const banner = document.getElementById('sakura-hidden-count-banner');
  if (banner) {
    banner.remove();
  }
  
  console.log('[サクラ探知機] Search results: showing all items');
}

// 非表示件数バナーを表示
function showHiddenCountBanner(count: number): void {
  // 既存のバナーを削除
  const existingBanner = document.getElementById('sakura-hidden-count-banner');
  if (existingBanner) {
    existingBanner.remove();
  }
  
  if (count === 0) return;
  
  const banner = document.createElement('div');
  banner.id = 'sakura-hidden-count-banner';
  banner.style.cssText = 'background:#e8f5e9;border:1px solid #4caf50;padding:10px 15px;margin:10px 0;border-radius:4px;font-size:14px;display:flex;align-items:center;justify-content:space-between;';
  banner.innerHTML = 
    '<span>✅ <strong>' + count + '件</strong>のマーケットプレイス出品を非表示にしました（Prime対象のみ表示中）</span>' +
    '<button id="sakura-show-all-btn" style="background:#4caf50;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;">すべて表示</button>';
  
  // 検索結果の上に挿入
  const searchResultsContainer = document.querySelector('.s-main-slot') || 
                                  document.querySelector('[data-component-type="s-search-results"]') ||
                                  document.querySelector('#search');
  
  if (searchResultsContainer) {
    searchResultsContainer.parentElement?.insertBefore(banner, searchResultsContainer);
    
    // 「すべて表示」ボタンのイベント
    const showAllBtn = document.getElementById('sakura-show-all-btn');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        showNonPrimeInSearchResults();
      });
    }
  }
}

// ページタイプを判定
export function getAmazonPageType(): 'product' | 'search' | 'other' {
  const url = window.location.href;
  if (url.includes('/dp/')) return 'product';
  if (url.includes('/s?') || url.includes('/s/')) return 'search';
  return 'other';
}


// AutoPages対応: 動的に追加される商品を監視
let searchResultsObserver: MutationObserver | null = null;
let totalHiddenCount = 0;

// 単一の商品アイテムを処理
function processSearchResultItem(element: HTMLElement): boolean {
  // 既に処理済みならスキップ
  if (element.hasAttribute('data-sakura-processed')) {
    return false;
  }
  
  // Prime badgeを確認
  const hasPrimeBadge = 
    element.querySelector('.a-icon-prime') !== null ||
    element.querySelector('[data-component-type="s-prime-badge"]') !== null ||
    element.querySelector('[aria-label*="Prime"]') !== null ||
    element.querySelector('.s-prime') !== null ||
    element.querySelector('i.a-icon.a-icon-prime') !== null;
  
  // Amazon.co.jpが販売・発送しているか確認
  const shippingInfo = element.textContent || '';
  const isAmazonFulfilled = 
    shippingInfo.includes('Amazon.co.jpが発送') ||
    shippingInfo.includes('Amazonが発送');
  
  // 処理済みマークを付ける
  element.setAttribute('data-sakura-processed', 'true');
  
  // Prime badgeがない、かつAmazon発送でない場合は非表示
  if (!hasPrimeBadge && !isAmazonFulfilled) {
    element.style.display = 'none';
    element.setAttribute('data-sakura-hidden', 'marketplace');
    return true; // 非表示にした
  }
  
  return false; // 表示のまま
}

// バナーの件数を更新
function updateHiddenCountBanner(): void {
  const banner = document.getElementById('sakura-hidden-count-banner');
  if (banner) {
    const countSpan = banner.querySelector('span');
    if (countSpan) {
      countSpan.innerHTML = '✅ <strong>' + totalHiddenCount + '件</strong>のマーケットプレイス出品を非表示にしました（Prime対象のみ表示中）';
    }
  } else if (totalHiddenCount > 0) {
    // バナーがなければ作成
    showHiddenCountBannerWithCount(totalHiddenCount);
  }
}

// 件数指定でバナー表示
function showHiddenCountBannerWithCount(count: number): void {
  const existingBanner = document.getElementById('sakura-hidden-count-banner');
  if (existingBanner) {
    existingBanner.remove();
  }
  
  if (count === 0) return;
  
  const banner = document.createElement('div');
  banner.id = 'sakura-hidden-count-banner';
  banner.style.cssText = 'background:#e8f5e9;border:1px solid #4caf50;padding:10px 15px;margin:10px 0;border-radius:4px;font-size:14px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:1000;';
  banner.innerHTML = 
    '<span>✅ <strong>' + count + '件</strong>のマーケットプレイス出品を非表示にしました（Prime対象のみ表示中）</span>' +
    '<button id="sakura-show-all-btn" style="background:#4caf50;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;">すべて表示</button>';
  
  const searchResultsContainer = document.querySelector('.s-main-slot') || 
                                  document.querySelector('[data-component-type="s-search-results"]') ||
                                  document.querySelector('#search');
  
  if (searchResultsContainer) {
    searchResultsContainer.parentElement?.insertBefore(banner, searchResultsContainer);
    
    const showAllBtn = document.getElementById('sakura-show-all-btn');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        stopSearchResultsObserver();
        showNonPrimeInSearchResults();
      });
    }
  }
}

// 検索結果の監視を開始（AutoPages対応）
export function startSearchResultsObserver(): void {
  // 既に監視中なら何もしない
  if (searchResultsObserver) {
    return;
  }
  
  totalHiddenCount = 0;
  
  // 初回処理
  const searchResults = document.querySelectorAll('[data-component-type="s-search-result"]');
  searchResults.forEach((item) => {
    if (processSearchResultItem(item as HTMLElement)) {
      totalHiddenCount++;
    }
  });
  
  updateHiddenCountBanner();
  console.log('[サクラ探知機] Initial scan: hidden ' + totalHiddenCount + ' non-Prime items');
  
  // MutationObserverで新しい商品を監視
  const targetNode = document.querySelector('.s-main-slot') || 
                     document.querySelector('[data-component-type="s-search-results"]') ||
                     document.querySelector('#search') ||
                     document.body;
  
  searchResultsObserver = new MutationObserver((mutations) => {
    let newHiddenCount = 0;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // 追加されたノードが検索結果アイテムか確認
          if (element.matches && element.matches('[data-component-type="s-search-result"]')) {
            if (processSearchResultItem(element)) {
              newHiddenCount++;
            }
          }
          
          // 子要素にも検索結果アイテムがあるか確認
          const childResults = element.querySelectorAll?.('[data-component-type="s-search-result"]');
          childResults?.forEach((child) => {
            if (processSearchResultItem(child as HTMLElement)) {
              newHiddenCount++;
            }
          });
        }
      });
    });
    
    if (newHiddenCount > 0) {
      totalHiddenCount += newHiddenCount;
      updateHiddenCountBanner();
      console.log('[サクラ探知機] AutoPages: hidden ' + newHiddenCount + ' new non-Prime items (total: ' + totalHiddenCount + ')');
    }
  });
  
  searchResultsObserver.observe(targetNode, {
    childList: true,
    subtree: true,
  });
  
  console.log('[サクラ探知機] Search results observer started (AutoPages ready)');
}

// 検索結果の監視を停止
export function stopSearchResultsObserver(): void {
  if (searchResultsObserver) {
    searchResultsObserver.disconnect();
    searchResultsObserver = null;
    totalHiddenCount = 0;
    console.log('[サクラ探知機] Search results observer stopped');
  }
}

// 処理済みマークをリセット
export function resetProcessedMarks(): void {
  const processedItems = document.querySelectorAll('[data-sakura-processed]');
  processedItems.forEach((item) => {
    item.removeAttribute('data-sakura-processed');
  });
}
