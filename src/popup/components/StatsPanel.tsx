import type { Stats } from '../../types';

interface Props {
  stats: Stats | null;
}

export default function StatsPanel({ stats }: Props) {
  if (!stats) {
    return (
      <div className="stats-panel empty">
        <p>まだ分析データがありません</p>
      </div>
    );
  }

  return (
    <div className="stats-panel">
      <div className="stat-card">
        <div className="stat-value">{stats.totalAnalyzed}</div>
        <div className="stat-label">分析済み商品</div>
      </div>
      <div className="stat-card warning">
        <div className="stat-value">{stats.sakuraDetected}</div>
        <div className="stat-label">サクラ検出</div>
      </div>
      <div className="stat-card danger">
        <div className="stat-value">{stats.resaleDetected}</div>
        <div className="stat-label">転売検出</div>
      </div>
      {stats.lastAnalyzedAt > 0 && (
        <div className="last-analyzed">
          <p>最終分析: {new Date(stats.lastAnalyzedAt).toLocaleString('ja-JP')}</p>
        </div>
      )}
    </div>
  );
}
