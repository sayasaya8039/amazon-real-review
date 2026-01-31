import { useEffect, useState } from 'react';
import Header from './components/Header';
import StatusCard from './components/StatusCard';
import SettingsPanel from './components/SettingsPanel';
import StatsPanel from './components/StatsPanel';
import type { Settings, AnalysisResult, Stats } from '../types';

type Tab = 'status' | 'settings' | 'stats';

export default function App() {
  const [tab, setTab] = useState<Tab>('status');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => { loadData(); }, []);

  const extractProductId = (url: string): string | null => {
    // Mercari: https://jp.mercari.com/item/m12345678
    const mercariMatch = url.match(/mercari\.com\/(?:jp\/)?item[s]?\/([a-zA-Z0-9]+)/);
    if (mercariMatch?.[1]) return mercariMatch[1];
    // Amazon: https://www.amazon.co.jp/dp/B01234567
    const amazonMatch = url.match(/amazon\.co\.jp\/(?:.*\/)?(?:dp|gp\/product)\/([A-Z0-9]+)/i);
    if (amazonMatch?.[1]) return amazonMatch[1];
    return null;
  };

  const isSupportedUrl = (url: string): boolean => {
    return url.includes('mercari.com') || url.includes('amazon.co.jp');
  };

  const loadData = async () => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) setSettings(response.data);
      const statsResponse = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (statsResponse.success) setStats(statsResponse.data);

      // 現在のタブのキャッシュ結果を取得
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.url) {
        setCurrentUrl(activeTab.url);
        const productId = extractProductId(activeTab.url);
        if (productId) {
          const cacheResponse = await chrome.runtime.sendMessage({
            type: 'GET_CACHED_RESULT',
            payload: productId
          });
          if (cacheResponse.success && cacheResponse.data) {
            setCurrentResult(cacheResponse.data);
          }
        }
      }
    } catch (err) { console.error('Failed to load data:', err); }
    finally { setLoading(false); }
  };

  const updateSettings = async (newSettings: Settings) => {
    try {
      await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: newSettings });
      setSettings(newSettings);
    } catch (error) { console.error('Failed to update settings:', error); }
  };

  const analyzeCurrentPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.url || !isSupportedUrl(activeTab.url)) {
        setError('このページは対応していません。Amazon.co.jpまたはMercariの商品ページで使用してください。');
        setLoading(false);
        return;
      }
      if (activeTab?.id) {
        try {
          await chrome.tabs.sendMessage(activeTab.id, { type: 'ANALYZE_PAGE' });
          setTimeout(loadData, 2000);
        } catch {
          // コンテンツスクリプトが読み込まれていない場合、ページをリロードしてもらう
          setError('ページを再読み込みしてから、もう一度お試しください。');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to analyze page:', err);
      setError('分析に失敗しました。ページを再読み込みしてください。');
      setLoading(false);
    }
  };

  if (loading) {
    return (<div className="popup-container"><div className="loading"><div className="spinner"></div><p>読み込み中...</p></div></div>);
  }

  const tabClass = (t: Tab) => `tab ${tab === t ? 'active' : ''}`;

  return (
    <div className="popup-container">
      <Header />
      <nav className="tabs">
        <button className={tabClass('status')} onClick={() => setTab('status')}>ステータス</button>
        <button className={tabClass('settings')} onClick={() => setTab('settings')}>設定</button>
        <button className={tabClass('stats')} onClick={() => setTab('stats')}>統計</button>
      </nav>
      <main className="content">
        {tab === 'status' && <StatusCard result={currentResult} onAnalyze={analyzeCurrentPage} loading={loading} error={error} isSupported={isSupportedUrl(currentUrl)} />}
        {tab === 'settings' && settings && <SettingsPanel settings={settings} onUpdate={updateSettings} />}
        {tab === 'stats' && <StatsPanel stats={stats} />}
      </main>
    </div>
  );
}
