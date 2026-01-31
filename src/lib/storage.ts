import type { StorageData, Settings, AnalysisCache, Stats, AnalysisResult } from '@/types';

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  geminiApiKey: '',
  autoAnalyze: true,
  sakuraThreshold: 60,
  showBadges: true,
  checkResale: true,
  language: 'ja',
  hideMarketplaceSellers: false,
};

const DEFAULT_STATS: Stats = {
  totalAnalyzed: 0,
  sakuraDetected: 0,
  resaleDetected: 0,
  lastAnalyzedAt: 0,
};

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間

export const storage = {
  async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get('settings');
    return { ...DEFAULT_SETTINGS, ...(result.settings as Partial<Settings>) };
  },

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    const current = await this.getSettings();
    await chrome.storage.local.set({
      settings: { ...current, ...settings },
    });
  },

  async getCache(): Promise<AnalysisCache> {
    const result = await chrome.storage.local.get('cache');
    return (result.cache as AnalysisCache) || {};
  },

  async getCachedResult(productId: string): Promise<AnalysisResult | null> {
    const cache = await this.getCache();
    const cached = cache[productId];

    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    return null;
  },

  async setCachedResult(productId: string, result: AnalysisResult): Promise<void> {
    const cache = await this.getCache();
    cache[productId] = {
      result,
      expiresAt: Date.now() + CACHE_TTL,
    };
    await chrome.storage.local.set({ cache });
  },

  async clearCache(): Promise<void> {
    await chrome.storage.local.set({ cache: {} });
  },

  async getStats(): Promise<Stats> {
    const result = await chrome.storage.local.get('stats');
    return { ...DEFAULT_STATS, ...(result.stats as Partial<Stats>) };
  },

  async updateStats(updates: Partial<Stats>): Promise<void> {
    const current = await this.getStats();
    await chrome.storage.local.set({
      stats: { ...current, ...updates },
    });
  },

  async incrementStats(field: keyof Stats): Promise<void> {
    const stats = await this.getStats();
    if (typeof stats[field] === 'number') {
      await this.updateStats({
        [field]: (stats[field] as number) + 1,
        lastAnalyzedAt: Date.now(),
      });
    }
  },

  async getAll(): Promise<StorageData> {
    const [settings, cache, stats] = await Promise.all([
      this.getSettings(),
      this.getCache(),
      this.getStats(),
    ]);
    return { settings, cache, stats };
  },
};

export default storage;
