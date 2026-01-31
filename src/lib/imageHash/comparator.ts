/**
 * Image Hash Comparator Service
 * 画像ハッシュを比較して類似画像を検出するサービス
 */

import { hashFromUrl, hammingDistance, similarity, findBestMatch } from './index';
import { getAllHashes, incrementMatchCount, type StockPhotoHash } from './database';

export interface ComparisonResult {
  isMatch: boolean;
  similarity: number;
  distance: number;
  matchedHash?: StockPhotoHash;
  confidence: 'high' | 'medium' | 'low' | 'none';
  message: string;
}

// 類似度の閾値
const THRESHOLDS = {
  HIGH_MATCH: 90,    // 90%以上 = ほぼ同一画像
  MEDIUM_MATCH: 75,  // 75%以上 = 類似画像
  LOW_MATCH: 60,     // 60%以上 = やや類似
};

/**
 * 画像URLと既知のストック画像を比較
 */
export async function compareImageToDatabase(imageUrl: string): Promise<ComparisonResult> {
  try {
    // 画像からハッシュを計算
    const { hash: targetHash } = await hashFromUrl(imageUrl, 'dHash');

    // データベースから全ハッシュを取得
    const stockHashes = await getAllHashes();

    if (stockHashes.length === 0) {
      return {
        isMatch: false,
        similarity: 0,
        distance: 64,
        confidence: 'none',
        message: 'データベースにハッシュがありません',
      };
    }

    // 最も類似したハッシュを検索
    const candidates = stockHashes.map(h => ({
      hash: h.hash,
      id: h.hash,
      metadata: h,
    }));

    const { match, similarity: sim, distance } = findBestMatch(targetHash, candidates);

    // マッチした場合はカウントを増やす
    if (match && sim >= THRESHOLDS.LOW_MATCH) {
      await incrementMatchCount(match.id);
    }

    // 結果を構築
    const matchedHash = match?.metadata as StockPhotoHash | undefined;

    if (sim >= THRESHOLDS.HIGH_MATCH) {
      return {
        isMatch: true,
        similarity: sim,
        distance,
        matchedHash,
        confidence: 'high',
        message: `⚠️ ストック画像と酷似 (${sim}%)`,
      };
    } else if (sim >= THRESHOLDS.MEDIUM_MATCH) {
      return {
        isMatch: true,
        similarity: sim,
        distance,
        matchedHash,
        confidence: 'medium',
        message: `⚡ ストック画像に類似 (${sim}%)`,
      };
    } else if (sim >= THRESHOLDS.LOW_MATCH) {
      return {
        isMatch: false,
        similarity: sim,
        distance,
        matchedHash,
        confidence: 'low',
        message: `やや類似あり (${sim}%)`,
      };
    }

    return {
      isMatch: false,
      similarity: sim,
      distance,
      confidence: 'none',
      message: 'ストック画像とのマッチなし',
    };
  } catch (error) {
    console.error('[Comparator] Error comparing image:', error);
    return {
      isMatch: false,
      similarity: 0,
      distance: 64,
      confidence: 'none',
      message: `比較エラー: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 複数の画像を一括比較
 */
export async function compareMultipleImages(imageUrls: string[]): Promise<{
  results: ComparisonResult[];
  hasMatch: boolean;
  highestSimilarity: number;
}> {
  const results: ComparisonResult[] = [];
  let highestSimilarity = 0;
  let hasMatch = false;

  for (const url of imageUrls) {
    try {
      const result = await compareImageToDatabase(url);
      results.push(result);

      if (result.similarity > highestSimilarity) {
        highestSimilarity = result.similarity;
      }

      if (result.isMatch) {
        hasMatch = true;
      }
    } catch (error) {
      results.push({
        isMatch: false,
        similarity: 0,
        distance: 64,
        confidence: 'none',
        message: `エラー: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return { results, hasMatch, highestSimilarity };
}

/**
 * 2つの画像URL間の類似度を計算
 */
export async function compareImages(url1: string, url2: string): Promise<{
  similarity: number;
  distance: number;
  isMatch: boolean;
}> {
  try {
    const [hash1, hash2] = await Promise.all([
      hashFromUrl(url1, 'dHash'),
      hashFromUrl(url2, 'dHash'),
    ]);

    const distance = hammingDistance(hash1.hash, hash2.hash);
    const sim = similarity(hash1.hash, hash2.hash);

    return {
      similarity: sim,
      distance,
      isMatch: sim >= THRESHOLDS.MEDIUM_MATCH,
    };
  } catch (error) {
    console.error('[Comparator] Error comparing images:', error);
    throw error;
  }
}

/**
 * 画像URLからハッシュを計算して保存用データを生成
 */
export async function generateHashData(
  imageUrl: string,
  source: StockPhotoHash['source'],
  category?: string,
  keywords?: string[]
): Promise<StockPhotoHash> {
  const { hash } = await hashFromUrl(imageUrl, 'dHash');

  return {
    hash,
    source,
    category,
    keywords,
    originalUrl: imageUrl,
    addedAt: Date.now(),
    matchCount: 0,
  };
}
