import type { Settings } from '../../types';

interface Props {
  settings: Settings;
  onUpdate: (settings: Settings) => void;
}

export default function SettingsPanel({ settings, onUpdate }: Props) {
  const handleChange = (key: keyof Settings, value: unknown) => {
    onUpdate({ ...settings, [key]: value });
  };

  return (
    <div className="settings-panel">
      <div className="setting-item">
        <label>
          <input type="checkbox" checked={settings.enabled} onChange={(e) => handleChange('enabled', e.target.checked)} />
          <span>自動分析を有効にする</span>
        </label>
      </div>
      <div className="setting-item">
        <label>
          <input type="checkbox" checked={settings.autoAnalyze} onChange={(e) => handleChange('autoAnalyze', e.target.checked)} />
          <span>ページ読み込み時に自動分析</span>
        </label>
      </div>
      <div className="setting-item">
        <label>
          <input type="checkbox" checked={settings.showBadges} onChange={(e) => handleChange('showBadges', e.target.checked)} />
          <span>商品ページにバッジを表示</span>
        </label>
      </div>
      <div className="setting-item">
        <label>
          <input type="checkbox" checked={settings.checkResale} onChange={(e) => handleChange('checkResale', e.target.checked)} />
          <span>転売チェックを有効にする</span>
        </label>
      </div>
      <div className="setting-item">
        <label>
          <input type="checkbox" checked={settings.hideMarketplaceSellers} onChange={(e) => handleChange('hideMarketplaceSellers', e.target.checked)} />
          <span>マーケットプレイス出品を非表示</span>
        </label>
        <p className="hint">Amazon公式以外の出品者を非表示にします</p>
      </div>
      <div className="setting-item">
        <label>
          <span>警告レベル閾値</span>
          <input type="range" min={0} max={100} value={settings.sakuraThreshold} onChange={(e) => handleChange('sakuraThreshold', parseInt(e.target.value))} />
          <span className="threshold-value">{settings.sakuraThreshold}%</span>
        </label>
      </div>
      <div className="setting-item">
        <label>
          <span>Gemini APIキー</span>
          <input type="password" value={settings.geminiApiKey || ''} onChange={(e) => handleChange('geminiApiKey', e.target.value)} placeholder="APIキーを入力" />
        </label>
        <p className="hint">
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">APIキーを取得 →</a>
        </p>
      </div>
    </div>
  );
}
