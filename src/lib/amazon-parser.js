// amazon-parser.js - Amazon商品情報取得

// URLからASINを抽出
function extractAsinFromUrl(url) {
  // パターン1: /dp/ASIN
  let match = url.match(/\/dp\/([A-Z0-9]{10})/);
  if (match) return match[1];

  // パターン2: /gp/product/ASIN
  match = url.match(/\/gp\/product\/([A-Z0-9]{10})/);
  if (match) return match[1];

  // パターン3: /product/ASIN
  match = url.match(/\/product\/([A-Z0-9]{10})/);
  if (match) return match[1];

  // パターン4: /ASIN/
  match = url.match(/\/([A-Z0-9]{10})(?:\/|$|\?)/);
  if (match) return match[1];

  return null;
}

// DOMから商品名を取得
function extractProductName() {
  // 複数のセレクタを試す
  const selectors = [
    '#productTitle',
    '#title',
    'h1.a-size-large',
    'h1[data-automation-id="title"]',
    'span.product-title-word-break'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent.trim();
      if (text) return text;
    }
  }
  return null;
}

// DOMから商品画像を取得
function extractProductImage() {
  const selectors = [
    '#landingImage',
    '#imgBlkFront',
    '#main-image',
    '.a-dynamic-image'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.src) {
      return element.src;
    }
  }
  return null;
}

// DOMから価格を取得
function extractPrice() {
  const selectors = [
    '.a-price .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price-whole'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent.trim();
      if (text) return text;
    }
  }
  return null;
}

// DOMからAmazonの評価を取得
function extractAmazonRating() {
  const ratingElement = document.querySelector('#acrPopover, .a-icon-star');
  if (ratingElement) {
    const title = ratingElement.getAttribute('title') || ratingElement.textContent;
    const match = title.match(/([0-9.]+)/);
    if (match) return parseFloat(match[1]);
  }
  return null;
}

// DOMからレビュー数を取得
function extractReviewCount() {
  const countElement = document.querySelector('#acrCustomerReviewText');
  if (countElement) {
    const text = countElement.textContent;
    const match = text.match(/([0-9,]+)/);
    if (match) return parseInt(match[1].replace(/,/g, ''));
  }
  return null;
}

// 商品情報をまとめて取得
function getProductInfo() {
  const url = window.location.href;
  const asin = extractAsinFromUrl(url);

  if (!asin) {
    return null;
  }

  return {
    asin,
    name: extractProductName(),
    image: extractProductImage(),
    price: extractPrice(),
    amazonRating: extractAmazonRating(),
    reviewCount: extractReviewCount(),
    url
  };
}

// 商品ページかどうかを判定
function isProductPage() {
  const url = window.location.href;
  return extractAsinFromUrl(url) !== null;
}

// 関数はグローバルスコープで利用可能（content_scriptsで読み込み）
