// サクラ度スコア
export interface SakuraScore {
  score: number; // 0-100
  confidence: number; // 0-1
  factors: SakuraFactor[];
  analyzedAt: number;
}

export interface SakuraFactor {
  type: 'grammar' | 'pattern' | 'timing' | 'similarity' | 'profile';
  weight: number;
  description: string;
}

// 転売検出結果
export interface ResaleDetection {
  isResale: boolean;
  confidence: number;
  originalPrice?: number;
  originalCurrency?: string;
  originalUrl?: string;
  originalSite?: string;
  priceMarkup?: number; // percentage
  detectedAt: number;
  imageHashMatch?: ImageHashMatch; // 画像ハッシュマッチ結果
}

// 画像ハッシュマッチ結果
export interface ImageHashMatch {
  hasMatch: boolean;
  similarity: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchedSource?: string; // 'aliexpress' | 'taobao' | 'stock' | 'official'
  message: string;
}

// レビュー情報
export interface Review {
  id: string;
  author: string;
  rating: number;
  content: string;
  date: string;
  isVerified: boolean;
  sakuraScore?: SakuraScore;
}

// 商品情報
export interface ProductInfo {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrls: string[];
  reviews: Review[];
  platform: 'mercari' | 'amazon';
  url: string;
}

// 分析結果
export interface AnalysisResult {
  productId: string;
  overallSakuraScore: number;
  resaleDetection: ResaleDetection | null;
  reviewAnalysis: {
    totalReviews: number;
    analyzedReviews: number;
    suspiciousReviews: number;
    averageSakuraScore: number;
  };
  warnings: Warning[];
  analyzedAt: number;
}

export interface Warning {
  level: 'high' | 'medium' | 'low';
  type: 'sakura' | 'resale' | 'price' | 'other';
  message: string;
}

// ストレージ
export interface StorageData {
  settings: Settings;
  cache: AnalysisCache;
  stats: Stats;
}

export interface Settings {
  enabled: boolean;
  geminiApiKey: string;
  autoAnalyze: boolean;
  sakuraThreshold: number; // 0-100
  showBadges: boolean;
  checkResale: boolean;
  language: 'ja' | 'en';
  hideMarketplaceSellers: boolean;
}

export interface AnalysisCache {
  [productId: string]: {
    result: AnalysisResult;
    expiresAt: number;
  };
}

export interface Stats {
  totalAnalyzed: number;
  sakuraDetected: number;
  resaleDetected: number;
  lastAnalyzedAt: number;
}

// メッセージング
export type MessageType =
  | 'ANALYZE_PRODUCT'
  | 'ANALYZE_REVIEWS'
  | 'CHECK_RESALE'
  | 'COMPARE_IMAGE_HASH'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_CACHE'
  | 'GET_CACHED_RESULT'
  | 'CLEAR_CACHE'
  | 'GET_STATS'
  | 'GET_HASH_DB_STATS'
  | 'ADD_STOCK_HASH';

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
