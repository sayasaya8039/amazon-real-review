// content.js - Amazonページに注入
// 注: getProductInfo, isProductPage は amazon-parser.js で定義済み（manifest.jsonで先に読み込み）

console.log('[本音レビュー] content.js 読み込み開始');

// 初期化
function init() {
  console.log('[本音レビュー] init() 実行');
  console.log('[本音レビュー] isProductPage:', isProductPage());
  if (!isProductPage()) {
    console.log('[本音レビュー] 商品ページではないため終了');
    return;
  }

  // 商品情報を取得
  const productInfo = getProductInfo();
  console.log('[本音レビュー] productInfo:', productInfo);
  if (!productInfo) {
    return;
  }

  // フローティングボタンを追加
  addFloatingButton(productInfo);
}

// フローティングボタンを追加
function addFloatingButton(productInfo) {
  // 既存のボタンがあれば削除
  const existing = document.getElementById('real-review-btn');
  if (existing) {
    existing.remove();
  }

  const button = document.createElement('button');
  button.id = 'real-review-btn';
  button.innerHTML = '🔍 本音レビュー';
  button.title = 'Reddit・YouTube・価格.comなどの本音レビューを表示';

  button.addEventListener('click', async () => {
    try {
      // サイドパネルを開く
      await chrome.runtime.sendMessage({
        type: 'OPEN_SIDE_PANEL',
        data: productInfo
      });
    } catch (error) {
      console.error('Failed to open side panel:', error);
      // 拡張機能が再読み込みされた場合、ページのリフレッシュを促す
      if (error.message && error.message.includes('Extension context invalidated')) {
        alert('拡張機能が更新されました。\nページをリフレッシュしてください。');
      }
    }
  });

  document.body.appendChild(button);
}

// ページ遷移を監視（SPAの場合）
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(init, 500); // ページ読み込み待機
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// 初期化実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// サイドパネルからのメッセージを待機（グローバルスコープで常に登録）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[本音レビュー] メッセージ受信:', message.type);
  if (message.type === 'GET_PRODUCT_INFO') {
    const info = getProductInfo();
    console.log('[本音レビュー] 商品情報を返信:', info);
    sendResponse({ success: true, data: info });
  }
  return true;
});
