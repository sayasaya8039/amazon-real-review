import type { AnalysisResult } from '../../types';
import ScoreGauge from './ScoreGauge';

interface Props {
  result: AnalysisResult | null;
  onAnalyze: () => void;
  loading: boolean;
  error?: string | null;
  isSupported?: boolean;
}

export default function StatusCard({ result, onAnalyze, loading, error, isSupported = true }: Props) {
  if (!result) {
    return (
      <div className="status-card empty">
        <div className="empty-icon">{isSupported ? '🛒' : '⚠️'}</div>
        {error ? (
          <p className="error-message" style={{ color: '#ef4444', fontSize: '13px' }}>{error}</p>
        ) : (
          <p>{isSupported ? '商品ページを開いて分析してください' : 'Amazon.co.jp または Mercari の商品ページで使用してください'}</p>
        )}
        <button className="analyze-btn" onClick={onAnalyze} disabled={loading || !isSupported}>
          {loading ? '分析中...' : '現在のページを分析'}
        </button>
      </div>
    );
  }

  const getSakuraLevel = (score: number) => {
    if (score >= 80) return { level: '危険', cls: 'danger' };
    if (score >= 60) return { level: '要注意', cls: 'warning' };
    if (score >= 40) return { level: '注意', cls: 'caution' };
    return { level: '安全', cls: 'safe' };
  };

  const sakuraInfo = getSakuraLevel(result.overallSakuraScore);
  const levelClass = `level ${sakuraInfo.cls}`;
  const resaleBadgeClass = result.resaleDetection ? `resale-badge ${result.resaleDetection.isResale ? 'detected' : 'safe'}` : '';

  return (
    <div className="status-card">
      <div className="scores">
        <div className="score-item">
          <h4>サクラ度</h4>
          <ScoreGauge score={result.overallSakuraScore} type="sakura" />
          <span className={levelClass}>{sakuraInfo.level}</span>
        </div>
        {result.resaleDetection && (
          <div className="score-item">
            <h4>転売判定</h4>
            <div className={resaleBadgeClass}>
              {result.resaleDetection.isResale ? '転売の可能性' : '転売なし'}
            </div>
            {result.resaleDetection.originalPrice && (
              <p className="original-price">元値: ¥{result.resaleDetection.originalPrice.toLocaleString()}</p>
            )}
            {result.resaleDetection.imageHashMatch && result.resaleDetection.imageHashMatch.hasMatch && (
              <div className="hash-match" style={{
                marginTop: '8px',
                padding: '8px',
                background: result.resaleDetection.imageHashMatch.confidence === 'high' ? '#fef2f2' : '#fffbeb',
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                <span style={{ marginRight: '4px' }}>🔍</span>
                画像類似度: {result.resaleDetection.imageHashMatch.similarity}%
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  background: result.resaleDetection.imageHashMatch.confidence === 'high' ? '#ef4444' : '#f59e0b',
                  color: 'white'
                }}>
                  {result.resaleDetection.imageHashMatch.confidence === 'high' ? '高確度' : '中確度'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {result.warnings.length > 0 && (
        <div className="reasons">
          <h4>警告</h4>
          <ul>
            {result.warnings.slice(0, 3).map((w, i) => (
              <li key={i} className={`warning-${w.level}`}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
      <button className="analyze-btn secondary" onClick={onAnalyze} disabled={loading}>再分析</button>
    </div>
  );
}
