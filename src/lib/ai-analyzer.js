// ai-analyzer.js - AI要約・スコア算出

const ANALYSIS_PROMPT = `あなたは商品レビューの分析専門家です。
以下の検索結果から、商品についての本音のレビュー・評判を分析してください。

【分析対象商品】
{productName}

【検索結果】
{searchResults}

以下のJSON形式で回答してください（日本語で）：
{
  "score": 数値（1.0〜5.0、0.1刻み、口コミに基づく実際の評価）,
  "summary": "総合評価の要約（2-3文）",
  "positives": ["良い点1", "良い点2", "良い点3"],
  "negatives": ["悪い点1", "悪い点2", "悪い点3"],
  "warnings": ["購入前に知っておくべき注意点（あれば）"],
  "confidence": "high/medium/low（情報量に基づく信頼度）"
}

注意事項：
- 検索結果が少ない場合は confidence を low にしてください
- ステマや偽レビューの可能性がある内容は除外してください
- 実際のユーザー体験に基づいた情報を重視してください
- 日本語で回答してください`;

// OpenAI APIで分析
async function analyzeWithOpenAI(productName, searchResultsText, apiKey) {
  const prompt = ANALYSIS_PROMPT
    .replace('{productName}', productName)
    .replace('{searchResults}', searchResultsText);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは商品レビュー分析の専門家です。正確で客観的な分析を提供してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}

// Gemini APIで分析
async function analyzeWithGemini(productName, searchResultsText, apiKey) {
  const prompt = ANALYSIS_PROMPT
    .replace('{productName}', productName)
    .replace('{searchResults}', searchResultsText);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}

// AI分析を実行（プロバイダー自動選択）
async function analyzeReviews(productName, searchResultsText, apiKeys) {
  const { openaiApiKey, geminiApiKey, aiProvider } = apiKeys;

  // 優先プロバイダーで分析
  if (aiProvider === 'openai' && openaiApiKey) {
    return analyzeWithOpenAI(productName, searchResultsText, openaiApiKey);
  }

  if (aiProvider === 'gemini' && geminiApiKey) {
    return analyzeWithGemini(productName, searchResultsText, geminiApiKey);
  }

  // フォールバック
  if (openaiApiKey) {
    return analyzeWithOpenAI(productName, searchResultsText, openaiApiKey);
  }

  if (geminiApiKey) {
    return analyzeWithGemini(productName, searchResultsText, geminiApiKey);
  }

  throw new Error('AIのAPIキーが設定されていません');
}

// スコアを星表示に変換
function scoreToStars(score) {
  const fullStars = Math.floor(score);
  const halfStar = score - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
}

// デフォルトの分析結果（AIが使えない場合）
function getDefaultAnalysis() {
  return {
    score: null,
    summary: 'AI分析を利用するにはAPIキーを設定してください',
    positives: [],
    negatives: [],
    warnings: [],
    confidence: 'none'
  };
}

export {
  analyzeWithOpenAI,
  analyzeWithGemini,
  analyzeReviews,
  scoreToStars,
  getDefaultAnalysis
};
