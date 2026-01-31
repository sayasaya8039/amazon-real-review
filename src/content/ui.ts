import type { AnalysisResult } from '@/types';

const BADGE_ID = 'sakura-detector-badge';
const PANEL_ID = 'sakura-detector-panel';

export function injectUI(result: AnalysisResult, platform: 'mercari' | 'amazon', imageUrls: string[] = []) {
  // 既存のUIを削除
  removeExistingUI();

  // バッジを注入
  injectBadge(result);

  // 詳細パネルを注入
  injectPanel(result, platform, imageUrls);
}

function removeExistingUI() {
  document.getElementById(BADGE_ID)?.remove();
  document.getElementById(PANEL_ID)?.remove();
}

function injectBadge(result: AnalysisResult) {
  const badge = document.createElement('div');
  badge.id = BADGE_ID;

  const score = result.overallSakuraScore;
  let bgColor = '#22c55e'; // safe green
  let emoji = '✅';
  let text = '安全';

  if (score >= 70) {
    bgColor = '#ef4444'; // danger red
    emoji = '⚠️';
    text = '危険';
  } else if (score >= 50) {
    bgColor = '#f59e0b'; // warning yellow
    emoji = '⚡';
    text = '注意';
  }

  badge.innerHTML = `
    <div style="
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 999999;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s;
    " id="sakura-badge-inner">
      <span style="font-size: 18px; margin-right: 8px;">${emoji}</span>
      サクラ度: ${score}% (${text})
    </div>
  `;

  document.body.appendChild(badge);

  // クリックで詳細パネルを表示/非表示
  badge.addEventListener('click', () => {
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  });

  // ホバーエフェクト
  const innerBadge = badge.querySelector('#sakura-badge-inner') as HTMLElement;
  innerBadge.addEventListener('mouseenter', () => {
    innerBadge.style.transform = 'scale(1.05)';
  });
  innerBadge.addEventListener('mouseleave', () => {
    innerBadge.style.transform = 'scale(1)';
  });
}

function injectPanel(result: AnalysisResult, platform: string, imageUrls: string[]) {
  const panel = document.createElement('div');
  panel.id = PANEL_ID;

  // Google Lens検索用のボタンHTML
  const googleLensButton = imageUrls.length > 0 ? `
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">🔎 転売元を調査</div>
      <button id="sakura-lens-btn" style="
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #4285f4, #34a853);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: opacity 0.2s;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        Google Lensで画像検索
      </button>
      <p style="font-size: 10px; color: #999; margin-top: 8px; text-align: center;">
        AliExpress等で同じ商品が安く売られていないか確認できます
      </p>
    </div>
  ` : '';

  const warnings = result.warnings.map(w => `
    <div style="
      padding: 8px 12px;
      margin: 8px 0;
      background: ${w.level === 'high' ? '#fef2f2' : w.level === 'medium' ? '#fffbeb' : '#f0fdf4'};
      border-left: 4px solid ${w.level === 'high' ? '#ef4444' : w.level === 'medium' ? '#f59e0b' : '#22c55e'};
      border-radius: 4px;
      font-size: 13px;
    ">
      ${w.message}
    </div>
  `).join('');

  panel.innerHTML = `
    <div style="
      position: fixed;
      top: 140px;
      right: 20px;
      z-index: 999998;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      width: 320px;
      max-height: 400px;
      overflow-y: auto;
      display: none;
    ">
      <div style="
        padding: 16px;
        border-bottom: 1px solid #eee;
        font-weight: bold;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <span>🔍 分析結果</span>
        <button id="sakura-panel-close" style="
          border: none;
          background: none;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        ">×</button>
      </div>

      <div style="padding: 16px;">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">サクラ度スコア</div>
          <div style="
            background: #f3f4f6;
            border-radius: 8px;
            height: 24px;
            overflow: hidden;
          ">
            <div style="
              background: ${result.overallSakuraScore >= 70 ? '#ef4444' : result.overallSakuraScore >= 50 ? '#f59e0b' : '#22c55e'};
              height: 100%;
              width: ${result.overallSakuraScore}%;
              transition: width 0.5s;
            "></div>
          </div>
          <div style="text-align: right; font-size: 24px; font-weight: bold; margin-top: 4px;">
            ${result.overallSakuraScore}%
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">レビュー分析</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold;">${result.reviewAnalysis.totalReviews}</div>
              <div style="font-size: 11px; color: #666;">総レビュー数</div>
            </div>
            <div style="background: ${result.reviewAnalysis.suspiciousReviews > 0 ? '#fef2f2' : '#f0fdf4'}; padding: 12px; border-radius: 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: ${result.reviewAnalysis.suspiciousReviews > 0 ? '#ef4444' : '#22c55e'};">
                ${result.reviewAnalysis.suspiciousReviews}
              </div>
              <div style="font-size: 11px; color: #666;">疑わしいレビュー</div>
            </div>
          </div>
        </div>

        ${result.resaleDetection?.imageHashMatch?.hasMatch ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">🔍 画像ハッシュ分析</div>
            <div style="
              padding: 12px;
              background: ${result.resaleDetection.imageHashMatch.confidence === 'high' ? '#fef2f2' : '#fffbeb'};
              border-radius: 8px;
              border-left: 4px solid ${result.resaleDetection.imageHashMatch.confidence === 'high' ? '#ef4444' : '#f59e0b'};
            ">
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">
                類似度: ${result.resaleDetection.imageHashMatch.similarity}%
              </div>
              <div style="font-size: 12px; color: #666;">
                ${result.resaleDetection.imageHashMatch.message}
              </div>
              <div style="
                display: inline-block;
                margin-top: 8px;
                padding: 2px 8px;
                background: ${result.resaleDetection.imageHashMatch.confidence === 'high' ? '#ef4444' : '#f59e0b'};
                color: white;
                border-radius: 4px;
                font-size: 11px;
              ">
                ${result.resaleDetection.imageHashMatch.confidence === 'high' ? '⚠️ 高確度マッチ' : '⚡ 中確度マッチ'}
              </div>
            </div>
          </div>
        ` : ''}

        ${warnings.length > 0 ? `
          <div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">⚠️ 警告</div>
            ${warnings}
          </div>
        ` : ''}

        ${googleLensButton}

        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999;">
          Platform: ${platform} | 分析日時: ${new Date(result.analyzedAt).toLocaleString('ja-JP')}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // 閉じるボタン
  document.getElementById('sakura-panel-close')?.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  // Google Lensボタン
  const lensBtn = document.getElementById('sakura-lens-btn');
  const firstImageUrl = imageUrls[0];
  if (lensBtn && firstImageUrl) {
    lensBtn.addEventListener('click', () => {
      // 最初の画像でGoogle Lens検索を開く
      const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(firstImageUrl)}`;
      window.open(lensUrl, '_blank');
    });

    // ホバーエフェクト
    lensBtn.addEventListener('mouseenter', () => {
      (lensBtn as HTMLElement).style.opacity = '0.9';
    });
    lensBtn.addEventListener('mouseleave', () => {
      (lensBtn as HTMLElement).style.opacity = '1';
    });
  }
}
