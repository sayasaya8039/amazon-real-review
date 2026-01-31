import type { ResaleDetection } from '@/types';

// Google Lens API または類似サービスを使用した画像検索
// 注: 実際の実装ではAPIキーと適切なエンドポイントが必要

interface ImageSearchResult {
  url: string;
  title: string;
  site: string;
  price?: number;
  currency?: string;
}

export class ResaleDetector {
  constructor(_apiKey?: string) {
    // API key will be used for image search implementation
  }

  async detectResale(
    imageUrls: string[],
    currentPrice: number,
    _currency: string
  ): Promise<ResaleDetection> {
    // 複数の画像で検索
    const results: ImageSearchResult[] = [];

    for (const imageUrl of imageUrls.slice(0, 3)) { // 最初の3枚のみ
      const searchResults = await this.searchImage(imageUrl);
      results.push(...searchResults);
    }

    // AliExpress/Alibaba/Taobaoの結果をフィルタリング
    const chinaResults = results.filter(r =>
      r.site.includes('aliexpress') ||
      r.site.includes('alibaba') ||
      r.site.includes('taobao') ||
      r.site.includes('1688')
    );

    if (chinaResults.length === 0) {
      return {
        isResale: false,
        confidence: 0.7,
        detectedAt: Date.now(),
      };
    }

    // 最安値を見つける
    const cheapest = chinaResults
      .filter(r => r.price !== undefined)
      .sort((a, b) => (a.price || 0) - (b.price || 0))[0];

    if (!cheapest || cheapest.price === undefined) {
      return {
        isResale: true,
        confidence: 0.5, // 価格情報がないので信頼度低め
        originalUrl: chinaResults[0]?.url,
        originalSite: chinaResults[0]?.site,
        detectedAt: Date.now(),
      };
    }

    // 価格比較（JPYに変換）
    const originalPriceJPY = this.convertToJPY(cheapest.price, cheapest.currency || 'USD');
    const priceMarkup = ((currentPrice - originalPriceJPY) / originalPriceJPY) * 100;

    return {
      isResale: true,
      confidence: 0.85,
      originalPrice: cheapest.price,
      originalCurrency: cheapest.currency || 'USD',
      originalUrl: cheapest.url,
      originalSite: cheapest.site,
      priceMarkup: Math.round(priceMarkup),
      detectedAt: Date.now(),
    };
  }

  private async searchImage(imageUrl: string): Promise<ImageSearchResult[]> {
    // 実装オプション:
    // 1. Google Custom Search API (有料)
    // 2. SerpApi (有料)
    // 3. TinEye API (有料)
    // 4. 自前のスクレイピング (グレーゾーン)

    // TODO: 実際のAPI実装
    // 現在はモック結果を返す

    console.log('Searching for image:', imageUrl);

    // モック: 実際の実装では外部APIを呼び出す
    return this.mockImageSearch(imageUrl);
  }

  private mockImageSearch(_imageUrl: string): ImageSearchResult[] {
    // デモ用のモック結果
    // 実際の実装では削除する
    return [];
  }

  private convertToJPY(price: number, currency: string): number {
    // 簡易的な為替レート（実際は外部APIで取得すべき）
    const rates: Record<string, number> = {
      USD: 150,
      CNY: 21,
      EUR: 165,
      JPY: 1,
    };

    return price * (rates[currency] || 150);
  }

  // ローカルでの転売検出（画像検索なし）
  detectResalePatterns(
    title: string,
    description: string,
    price: number
  ): { isSuspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // パターン1: 中国系ブランド名の検出
    const chinaPatterns = [
      /\bgeneric\b/i,
      /\bnoname\b/i,
      /\bunbranded\b/i,
      /互換品/,
      /ノーブランド/,
      /汎用/,
    ];

    if (chinaPatterns.some(p => p.test(title) || p.test(description))) {
      reasons.push('ノーブランド/互換品の可能性');
    }

    // パターン2: 不自然な価格帯
    // (実際には商品カテゴリごとの相場と比較すべき)
    if (price > 0 && price < 500) {
      reasons.push('極端に安い価格設定');
    }

    // パターン3: 海外発送の示唆
    const overseasPatterns = [
      /海外/,
      /中国/,
      /発送まで.*日/,
      /\d+[-~]\d+日/,
    ];

    if (overseasPatterns.some(p => p.test(description))) {
      reasons.push('海外発送の可能性');
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }
}

export const createResaleDetector = (apiKey?: string): ResaleDetector => {
  return new ResaleDetector(apiKey);
};
