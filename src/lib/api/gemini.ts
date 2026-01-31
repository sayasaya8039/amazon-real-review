import type { Review, SakuraScore, SakuraFactor } from '@/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

export class GeminiAnalyzer {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeReviews(reviews: Review[]): Promise<Map<string, SakuraScore>> {
    const results = new Map<string, SakuraScore>();

    // バッチ処理（5件ずつ）
    const batchSize = 5;
    for (let i = 0; i < reviews.length; i += batchSize) {
      const batch = reviews.slice(i, i + batchSize);
      const batchResults = await this.analyzeBatch(batch);
      batchResults.forEach((score, id) => results.set(id, score));
    }

    return results;
  }

  private async analyzeBatch(reviews: Review[]): Promise<Map<string, SakuraScore>> {
    const prompt = this.buildPrompt(reviews);
    const response = await this.callGemini(prompt);
    return this.parseResponse(response, reviews);
  }

  private buildPrompt(reviews: Review[]): string {
    const reviewTexts = reviews.map((r, i) =>
      `[レビュー${i + 1}] 評価: ${r.rating}/5, 投稿者: ${r.author}\n${r.content}`
    ).join('\n\n');

    return `あなたは日本語レビューの真偽を判定する専門家です。
以下のレビューを分析し、各レビューの「サクラ度」(0-100)を判定してください。

判定基準:
1. 文法の不自然さ（機械翻訳的表現、助詞の誤用）
2. 定型的なパターン（「とても良い」「おすすめ」の連発）
3. 具体性の欠如（商品特性に言及しない抽象的な褒め言葉）
4. 他レビューとの類似性
5. 投稿者プロフィールの信頼性

${reviewTexts}

各レビューについて、以下のJSON形式で回答してください:
{
  "reviews": [
    {
      "index": 1,
      "sakuraScore": 75,
      "confidence": 0.8,
      "factors": [
        {"type": "grammar", "weight": 0.3, "description": "助詞の使用が不自然"},
        {"type": "pattern", "weight": 0.4, "description": "定型的な褒め言葉のみ"}
      ]
    }
  ]
}
JSONのみを出力してください。`;
  }

  private async callGemini(prompt: string): Promise<GeminiResponse> {
    const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    return response.json() as Promise<GeminiResponse>;
  }

  private parseResponse(response: GeminiResponse, reviews: Review[]): Map<string, SakuraScore> {
    const results = new Map<string, SakuraScore>();

    try {
      const text = response.candidates[0]?.content.parts[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]) as {
        reviews: Array<{
          index: number;
          sakuraScore: number;
          confidence: number;
          factors: SakuraFactor[];
        }>;
      };

      data.reviews.forEach((result) => {
        const review = reviews[result.index - 1];
        if (review) {
          results.set(review.id, {
            score: result.sakuraScore,
            confidence: result.confidence,
            factors: result.factors,
            analyzedAt: Date.now(),
          });
        }
      });
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      // フォールバック: ローカル分析
      reviews.forEach((review) => {
        results.set(review.id, this.localAnalyze(review));
      });
    }

    return results;
  }

  // オフライン/フォールバック用のローカル分析
  localAnalyze(review: Review): SakuraScore {
    const factors: SakuraFactor[] = [];
    let score = 0;

    // パターン1: 短すぎるレビュー
    if (review.content.length < 20) {
      score += 20;
      factors.push({
        type: 'pattern',
        weight: 0.2,
        description: 'レビューが短すぎる',
      });
    }

    // パターン2: 定型的な表現
    const genericPhrases = ['とても良い', 'おすすめ', '満足', '良かった', '気に入り'];
    const matchCount = genericPhrases.filter(p => review.content.includes(p)).length;
    if (matchCount >= 2) {
      score += matchCount * 10;
      factors.push({
        type: 'pattern',
        weight: matchCount * 0.1,
        description: '定型的な表現が多い',
      });
    }

    // パターン3: 星5のみ + 短文
    if (review.rating === 5 && review.content.length < 50) {
      score += 15;
      factors.push({
        type: 'pattern',
        weight: 0.15,
        description: '高評価だが具体性がない',
      });
    }

    // パターン4: 不自然な句読点
    const punctuationRatio = (review.content.match(/[、。！？]/g) || []).length / review.content.length;
    if (punctuationRatio < 0.02 || punctuationRatio > 0.15) {
      score += 10;
      factors.push({
        type: 'grammar',
        weight: 0.1,
        description: '句読点の使用が不自然',
      });
    }

    return {
      score: Math.min(score, 100),
      confidence: 0.5, // ローカル分析は信頼度低め
      factors,
      analyzedAt: Date.now(),
    };
  }
}

export const createGeminiAnalyzer = (apiKey: string): GeminiAnalyzer => {
  return new GeminiAnalyzer(apiKey);
};
