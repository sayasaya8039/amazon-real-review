import type { ProductInfo, Review } from '@/types';

export async function extractMercariProduct(): Promise<ProductInfo | null> {
  try {
    // 商品ID取得
    const urlMatch = window.location.href.match(/item\/([a-zA-Z0-9]+)/);
    const productId = urlMatch?.[1] ?? `mercari-${Date.now()}`;

    // 商品タイトル
    const titleEl = document.querySelector('[data-testid="name"]') ||
                    document.querySelector('h1');
    const title = titleEl?.textContent?.trim() || '不明な商品';

    // 価格
    const priceEl = document.querySelector('[data-testid="price"]') ||
                    document.querySelector('.price');
    const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '') || '0';
    const price = parseInt(priceText, 10);

    // 画像URL
    const imageEls = document.querySelectorAll('[data-testid="image-0"] img, .item-photo img');
    const imageUrls = Array.from(imageEls)
      .map(img => (img as HTMLImageElement).src)
      .filter(Boolean);

    // メルカリは個別商品にレビューがないので、出品者評価を参考にする
    const reviews: Review[] = [];

    // 出品者評価を取得（あれば）
    const sellerRatingEl = document.querySelector('[data-testid="seller-info"] .rating');
    if (sellerRatingEl) {
      reviews.push({
        id: 'seller-rating',
        author: '出品者評価',
        rating: parseFloat(sellerRatingEl.textContent || '0'),
        content: '出品者の総合評価',
        date: new Date().toISOString(),
        isVerified: true,
      });
    }

    return {
      id: productId,
      title,
      price,
      currency: 'JPY',
      imageUrls,
      reviews,
      platform: 'mercari',
      url: window.location.href,
    };
  } catch (error) {
    console.error('[サクラ探知機] Mercari extraction error:', error);
    return null;
  }
}
