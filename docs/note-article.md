# 【Chrome拡張】AIなしでも転売品を検出！画像ハッシュで「サクラ＆転売探知機」を作った話

## はじめに

Amazonやメルカリで買い物をしていて、こんな経験ありませんか？

- 「レビューが不自然に高評価ばかり...」
- 「この商品、AliExpressで見たやつの転売では？」
- 「商品画像がどこかで見たストック写真っぽい」

そんな疑問を解決するChrome拡張機能「**サクラ＆転売 探知機**」を開発しました。

今回は特に、**APIを使わずにクライアントサイドだけで画像の類似度を判定する「Perceptual Hashing」**という技術について紹介します。

---

## Perceptual Hashing（知覚ハッシュ）とは？

通常のハッシュ（MD5やSHA256など）は、1ビットでも違えば全く異なる値になります。

しかし**Perceptual Hash**は、「人間が見て似ている画像」に対して似たハッシュ値を生成します。

つまり：
- リサイズされた画像
- 圧縮率が変わった画像
- 軽く色調補正された画像

これらを**「同じ画像」として検出**できるのです。

---

## 3つのハッシュアルゴリズム

今回実装した3つの方式を紹介します。

### 1. dHash（Difference Hash）

**仕組み**: 画像を9x8ピクセルに縮小し、隣り合うピクセルの明暗差をビット列にエンコード

```
左のピクセルが右より明るい → 1
左のピクセルが右より暗い → 0
```

**特徴**: 高速で、回転やリサイズに強い。今回のデフォルトはこれ。

### 2. aHash（Average Hash）

**仕組み**: 画像を8x8に縮小し、各ピクセルが平均輝度より明るいか暗いかでビット列を生成

**特徴**: 最もシンプルで高速。ただし精度はやや劣る。

### 3. pHash（Perceptual Hash）

**仕組み**: 画像を32x32に縮小し、**DCT（離散コサイン変換）**を適用。低周波成分だけを使ってハッシュ生成

**特徴**: 最も堅牢だが計算コストが高い。JPEGの圧縮にも使われている技術。

---

## 類似度の計算

2つのハッシュ間の類似度は**ハミング距離**で計算します。

```typescript
function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}
```

64ビットハッシュの場合：
- 距離0 = 100%一致（同一画像）
- 距離6以下 = 約90%一致（ほぼ同じ）
- 距離16以下 = 約75%一致（類似）

---

## なぜAPIを使わないのか？

画像認識といえばGoogle Cloud VisionやAWS Rekognitionを思い浮かべますが、今回あえて**クライアントサイド完結**にしました。

**理由**:
1. **プライバシー**: ユーザーの閲覧履歴を外部に送信しない
2. **コスト**: API課金なしで無制限に使える
3. **速度**: ネットワーク遅延なし、ローカルで即座に計算
4. **オフライン対応**: 一度DBを構築すればネット不要

---

## 実装のポイント

### Canvas APIで画像処理

ブラウザのCanvas APIを使えば、JavaScriptだけで画像のリサイズと輝度計算ができます。

```typescript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 9;
canvas.height = 8;
ctx.drawImage(img, 0, 0, 9, 8);
const imageData = ctx.getImageData(0, 0, 9, 8).data;
```

### IndexedDBでハッシュを保存

既知のストック画像のハッシュはIndexedDBに保存。ブラウザを閉じてもデータが残ります。

```typescript
const db = await openDB('ImageHashDB', 1, {
  upgrade(db) {
    db.createObjectStore('hashes', { keyPath: 'hash' });
  }
});
```

### CORS対策

外部サイトの画像を読み込むには`crossOrigin`属性が必要です。

```typescript
const img = new Image();
img.crossOrigin = 'anonymous';
img.src = imageUrl;
```

---

## 検出精度

実際にテストした結果：

| シナリオ | dHash | pHash |
|---------|-------|-------|
| 同一画像（リサイズ） | 98% | 99% |
| JPEG再圧縮 | 92% | 96% |
| 軽い色調補正 | 85% | 91% |
| 別アングルの類似商品 | 60% | 65% |

**90%以上で「転売の疑いあり」と判定**しています。

---

## 今後の展望

- **ハッシュDBの拡充**: AliExpress/Taobaoの人気商品画像を収集
- **OCR連携**: 画像内のテキスト（ブランド名など）も検出
- **コミュニティ共有**: ユーザーが発見した転売画像のハッシュを共有

---

## まとめ

Perceptual Hashingを使えば、**APIなし・無料・プライバシー保護**で画像の類似度判定ができます。

転売検出だけでなく、重複画像の検出やコンテンツモデレーションなど、様々な用途に応用できる技術です。

拡張機能のソースコードはGitHubで公開予定です。興味があればぜひ試してみてください！

---

## 参考リンク

- [Perceptual Hashing - Wikipedia](https://en.wikipedia.org/wiki/Perceptual_hashing)
- [ImageHash - Python実装](https://github.com/JohannesBuchner/imagehash)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)

---

**タグ**: #Chrome拡張 #JavaScript #画像処理 #転売対策 #プログラミング
