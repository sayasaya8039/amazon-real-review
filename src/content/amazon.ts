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
