/**
 * Perceptual Image Hashing Utilities
 * クライアントサイドで画像の類似性を検出するためのハッシュ生成
 */

export interface ImageHashResult {
  hash: string;
  width: number;
  height: number;
}

/**
 * dHash (Difference Hash) - 画像の水平方向の明暗差をエンコード
 * 高速で回転・リサイズに強い
 */
export function dHash(img: HTMLImageElement, hashSize = 8): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // hashSize+1 x hashSize にリサイズ（隣接ピクセル比較用）
  canvas.width = hashSize + 1;
  canvas.height = hashSize;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let hash = '';

  for (let y = 0; y < hashSize; y++) {
    for (let x = 0; x < hashSize; x++) {
      const leftIdx = (y * (hashSize + 1) + x) * 4;
      const rightIdx = (y * (hashSize + 1) + x + 1) * 4;

      // グレースケール化（輝度計算）
      const leftBrightness = (imageData[leftIdx] ?? 0) * 0.299 + (imageData[leftIdx + 1] ?? 0) * 0.587 + (imageData[leftIdx + 2] ?? 0) * 0.114;
      const rightBrightness = (imageData[rightIdx] ?? 0) * 0.299 + (imageData[rightIdx + 1] ?? 0) * 0.587 + (imageData[rightIdx + 2] ?? 0) * 0.114;

      hash += leftBrightness > rightBrightness ? '1' : '0';
    }
  }

  return hash;
}

/**
 * aHash (Average Hash) - 平均輝度との比較でハッシュ生成
 * シンプルで高速
 */
export function aHash(img: HTMLImageElement, hashSize = 8): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  canvas.width = hashSize;
  canvas.height = hashSize;
  ctx.drawImage(img, 0, 0, hashSize, hashSize);

  const imageData = ctx.getImageData(0, 0, hashSize, hashSize).data;
  const pixels: number[] = [];

  // グレースケール値を収集
  for (let i = 0; i < imageData.length; i += 4) {
    const gray = (imageData[i] ?? 0) * 0.299 + (imageData[i + 1] ?? 0) * 0.587 + (imageData[i + 2] ?? 0) * 0.114;
    pixels.push(gray);
  }

  // 平均を計算
  const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;

  // 平均との比較でハッシュ生成
  return pixels.map(p => p > avg ? '1' : '0').join('');
}

/**
 * pHash (Perceptual Hash) - DCT（離散コサイン変換）ベース
 * より堅牢だが計算コストが高い
 */
export function pHash(img: HTMLImageElement, hashSize = 8): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // 32x32にリサイズしてDCT計算
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(img, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size).data;
  const grayPixels: number[][] = [];

  // グレースケール2D配列を作成
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const gray = (imageData[idx] ?? 0) * 0.299 + (imageData[idx + 1] ?? 0) * 0.587 + (imageData[idx + 2] ?? 0) * 0.114;
      row.push(gray);
    }
    grayPixels.push(row);
  }

  // 簡易DCT計算（低周波成分のみ）
  const dctResult = simpleDCT(grayPixels, hashSize);

  // DC成分を除外した平均を計算
  const flatDct = dctResult.flat().slice(1); // DC成分(0,0)を除外
  const avg = flatDct.reduce((a, b) => a + b, 0) / flatDct.length;

  // ハッシュ生成
  let hash = '';
  for (let y = 0; y < hashSize; y++) {
    for (let x = 0; x < hashSize; x++) {
      if (y === 0 && x === 0) continue; // DC成分スキップ
      hash += (dctResult[y]?.[x] ?? 0) > avg ? '1' : '0';
    }
  }

  // 64ビットになるようパディング
  while (hash.length < hashSize * hashSize) {
    hash += '0';
  }

  return hash.substring(0, hashSize * hashSize);
}

/**
 * 簡易DCT（離散コサイン変換）
 */
function simpleDCT(pixels: number[][], outputSize: number): number[][] {
  const N = pixels.length;
  const result: number[][] = [];

  for (let u = 0; u < outputSize; u++) {
    const row: number[] = [];
    for (let v = 0; v < outputSize; v++) {
      let sum = 0;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          sum += (pixels[i]?.[j] ?? 0) *
            Math.cos((Math.PI / N) * (i + 0.5) * u) *
            Math.cos((Math.PI / N) * (j + 0.5) * v);
        }
      }
      row.push(sum);
    }
    result.push(row);
  }

  return result;
}

/**
 * ハミング距離を計算（ビット列の差異数）
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    // 長さが異なる場合は短い方に合わせる
    const minLen = Math.min(hash1.length, hash2.length);
    hash1 = hash1.substring(0, minLen);
    hash2 = hash2.substring(0, minLen);
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * 類似度を計算（0-100%）
 */
export function similarity(hash1: string, hash2: string): number {
  const distance = hammingDistance(hash1, hash2);
  const maxDistance = Math.max(hash1.length, hash2.length);
  return Math.round((1 - distance / maxDistance) * 100);
}

/**
 * CORS対応で画像を読み込み
 */
export function loadImageWithCORS(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => {
      console.error('[ImageHash] Failed to load image:', imageUrl, error);
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    img.src = imageUrl;
  });
}

/**
 * URL から直接ハッシュを計算
 */
export async function hashFromUrl(imageUrl: string, method: 'dHash' | 'aHash' | 'pHash' = 'dHash'): Promise<ImageHashResult> {
  const img = await loadImageWithCORS(imageUrl);

  let hash: string;
  switch (method) {
    case 'aHash':
      hash = aHash(img);
      break;
    case 'pHash':
      hash = pHash(img);
      break;
    case 'dHash':
    default:
      hash = dHash(img);
      break;
  }

  return {
    hash,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

/**
 * 複数のハッシュと比較して最も類似したものを返す
 */
export function findBestMatch(
  targetHash: string,
  candidates: Array<{ hash: string; id: string; metadata?: unknown }>
): { match: typeof candidates[0] | null; similarity: number; distance: number } {
  let bestMatch: typeof candidates[0] | null = null;
  let bestSimilarity = 0;
  let bestDistance = targetHash.length;

  for (const candidate of candidates) {
    const distance = hammingDistance(targetHash, candidate.hash);
    const sim = similarity(targetHash, candidate.hash);

    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return {
    match: bestMatch,
    similarity: bestSimilarity,
    distance: bestDistance,
  };
}
