import type { Message, MessageResponse, ProductInfo, AnalysisResult, Warning, ResaleDetection, ImageHashMatch } from '@/types';
import { createGeminiAnalyzer } from '@/lib/api/gemini';
import { createResaleDetector } from '@/lib/detector/resale';
import { storage } from '@/lib/storage';
import { compareMultipleImages, generateHashData } from '@/lib/imageHash/comparator';
import { openDatabase, seedInitialData, getDatabaseStats, addHash, type StockPhotoHash } from '@/lib/imageHash/database';

// メッセージハンドラー
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // 非同期レスポンスを有効化
});

async function handleMessage(message: Message): Promise<MessageResponse> {
  try {
    switch (message.type) {
      case 'ANALYZE_PRODUCT':
        return await analyzeProduct(message.payload as ProductInfo);

      case 'GET_SETTINGS':
        return { success: true, data: await storage.getSettings() };

      case 'UPDATE_SETTINGS':
        await storage.updateSettings(message.payload as Record<string, unknown>);
        return { success: true };

      case 'GET_CACHE':
        return { success: true, data: await storage.getCache() };

      case 'GET_CACHED_RESULT':
        const productId = message.payload as string;
        if (productId) {
          const cachedResult = await storage.getCachedResult(productId);
          return { success: true, data: cachedResult };
        }
        return { success: false, error: 'Product ID required' };

      case 'CLEAR_CACHE':
        await storage.clearCache();
        return { success: true };

      case 'GET_STATS':
        return { success: true, data: await storage.getStats() };

      case 'COMPARE_IMAGE_HASH':
        return await compareImageHashes(message.payload as string[]);

      case 'GET_HASH_DB_STATS':
        return { success: true, data: await getDatabaseStats() };

      case 'ADD_STOCK_HASH':
        const hashPayload = message.payload as { imageUrl: string; source: string; category?: string };
        const hashData = await generateHashData(
          hashPayload.imageUrl,
          hashPayload.source as StockPhotoHash['source'],
          hashPayload.category
        );
        await addHash(hashData);
        return { success: true, data: hashData };

      default:
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    console.error('Background script error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function analyzeProduct(product: ProductInfo): Promise<MessageResponse<AnalysisResult>> {
  const settings = await storage.getSettings();

  // キャッシュチェック
  const cached = await storage.getCachedResult(product.id);
  if (cached) {
    return { success: true, data: cached };
  }

  const warnings: Warning[] = [];
  let overallSakuraScore = 0;
  let suspiciousReviews = 0;

  // レビュー分析
  if (settings.geminiApiKey && product.reviews.length > 0) {
    try {
      const analyzer = createGeminiAnalyzer(settings.geminiApiKey);
      const scores = await analyzer.analyzeReviews(product.reviews);

      let totalScore = 0;
      scores.forEach((score) => {
        totalScore += score.score;
        if (score.score >= settings.sakuraThreshold) {
          suspiciousReviews++;
        }
      });

      overallSakuraScore = Math.round(totalScore / scores.size);

      if (overallSakuraScore >= 70) {
        warnings.push({
          level: 'high',
          type: 'sakura',
          message: `サクラレビューの疑いが高いです（スコア: ${overallSakuraScore}）`,
        });
      } else if (overallSakuraScore >= 50) {
        warnings.push({
          level: 'medium',
          type: 'sakura',
          message: `一部のレビューに不自然な点があります（スコア: ${overallSakuraScore}）`,
        });
      }
    } catch (error) {
      console.error('Review analysis failed:', error);
      // フォールバック: ローカル分析
      const analyzer = createGeminiAnalyzer('');
      let totalScore = 0;
      product.reviews.forEach((review) => {
        const score = analyzer.localAnalyze(review);
        totalScore += score.score;
        if (score.score >= settings.sakuraThreshold) {
          suspiciousReviews++;
        }
      });
      overallSakuraScore = Math.round(totalScore / product.reviews.length);
    }
  }

  // 転売検出
  let resaleDetection: ResaleDetection | null = null;
  let resaleDetected = false;
  if (settings.checkResale) {
    const detector = createResaleDetector();

    // パターンベースの検出（API不要）
    const patterns = detector.detectResalePatterns(
      product.title,
      '', // description not available in current structure
      product.price
    );

    if (patterns.isSuspicious) {
      resaleDetected = true;
      warnings.push({
        level: 'medium',
        type: 'resale',
        message: `転売品の可能性: ${patterns.reasons.join(', ')}`,
      });
    }

    // 画像ハッシュ比較による転売検出
    if (product.imageUrls.length > 0) {
      try {
        const hashResult = await compareMultipleImages(product.imageUrls.slice(0, 3)); // 最大3枚

        if (hashResult.hasMatch) {
          const imageHashMatch: ImageHashMatch = {
            hasMatch: true,
            similarity: hashResult.highestSimilarity,
            confidence: hashResult.highestSimilarity >= 90 ? 'high' :
                       hashResult.highestSimilarity >= 75 ? 'medium' : 'low',
            message: `ストック画像との類似度: ${hashResult.highestSimilarity}%`,
          };

          resaleDetection = {
            isResale: true,
            confidence: hashResult.highestSimilarity / 100,
            detectedAt: Date.now(),
            imageHashMatch,
          };

          resaleDetected = true;
          warnings.push({
            level: hashResult.highestSimilarity >= 90 ? 'high' : 'medium',
            type: 'resale',
            message: `🔍 画像がストック写真と${hashResult.highestSimilarity}%一致`,
          });
        }
      } catch (error) {
        console.error('[Background] Image hash comparison failed:', error);
      }
    }
  }

  const result: AnalysisResult = {
    productId: product.id,
    overallSakuraScore,
    resaleDetection,
    reviewAnalysis: {
      totalReviews: product.reviews.length,
      analyzedReviews: product.reviews.length,
      suspiciousReviews,
      averageSakuraScore: overallSakuraScore,
    },
    warnings,
    analyzedAt: Date.now(),
  };

  // キャッシュに保存
  await storage.setCachedResult(product.id, result);

  // 統計を更新
  await storage.incrementStats('totalAnalyzed');
  if (suspiciousReviews > 0) {
    await storage.incrementStats('sakuraDetected');
  }
  if (resaleDetected) {
    await storage.incrementStats('resaleDetected');
  }

  return { success: true, data: result };
}

// 画像ハッシュ比較関数
async function compareImageHashes(imageUrls: string[]): Promise<MessageResponse<{
  hasMatch: boolean;
  highestSimilarity: number;
  results: Array<{ similarity: number; confidence: string; message: string }>;
}>> {
  try {
    const result = await compareMultipleImages(imageUrls);
    return {
      success: true,
      data: {
        hasMatch: result.hasMatch,
        highestSimilarity: result.highestSimilarity,
        results: result.results.map(r => ({
          similarity: r.similarity,
          confidence: r.confidence,
          message: r.message,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image comparison failed',
    };
  }
}

// 拡張機能インストール時の初期化
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('サクラ＆転売 探知機 installed');
    // デフォルト設定を保存
    await storage.updateSettings({});
    // 画像ハッシュDBを初期化
    await initializeHashDatabase();
  } else if (details.reason === 'update') {
    console.log('サクラ＆転売 探知機 updated');
    await initializeHashDatabase();
  }
});

// 画像ハッシュDBの初期化
async function initializeHashDatabase(): Promise<void> {
  try {
    await openDatabase();
    await seedInitialData();
    console.log('[Background] Hash database initialized');
  } catch (error) {
    console.error('[Background] Failed to initialize hash database:', error);
  }
}

// サービスワーカー起動時にDBを初期化
initializeHashDatabase();

console.log('サクラ＆転売 探知機 background script loaded');
