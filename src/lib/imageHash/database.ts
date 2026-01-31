/**
 * IndexedDB Database for Stock Photo Hashes
 * 既知のストック画像ハッシュを保存・検索するためのデータベース
 */

export interface StockPhotoHash {
  hash: string;
  source: string; // 'aliexpress' | 'taobao' | 'stock' | 'official' | 'user'
  category?: string; // 商品カテゴリ
  keywords?: string[]; // 関連キーワード
  originalUrl?: string; // 元画像のURL
  addedAt: number; // 追加日時
  matchCount?: number; // マッチした回数
}

const DB_NAME = 'SakuraDetectorDB';
const DB_VERSION = 1;
const STORE_NAME = 'stockHashes';

let db: IDBDatabase | null = null;

/**
 * データベースを開く
 */
export async function openDatabase(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[HashDB] Database error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[HashDB] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'hash' });
        store.createIndex('source', 'source', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('addedAt', 'addedAt', { unique: false });
        console.log('[HashDB] Object store created');
      }
    };
  });
}

/**
 * ハッシュを追加
 */
export async function addHash(hashData: StockPhotoHash): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(hashData); // put はキーが存在すれば更新

    request.onsuccess = () => {
      console.log('[HashDB] Hash added:', hashData.hash.substring(0, 16) + '...');
      resolve();
    };

    request.onerror = () => {
      console.error('[HashDB] Failed to add hash:', request.error);
      reject(request.error);
    };
  });
}

/**
 * 複数のハッシュを一括追加
 */
export async function addHashes(hashes: StockPhotoHash[]): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    let completed = 0;
    let errors = 0;

    for (const hashData of hashes) {
      const request = store.put(hashData);
      request.onsuccess = () => {
        completed++;
        if (completed + errors === hashes.length) {
          console.log(`[HashDB] Bulk add complete: ${completed} success, ${errors} errors`);
          resolve();
        }
      };
      request.onerror = () => {
        errors++;
        if (completed + errors === hashes.length) {
          resolve();
        }
      };
    }

    if (hashes.length === 0) resolve();
  });
}

/**
 * 全てのハッシュを取得
 */
export async function getAllHashes(): Promise<StockPhotoHash[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      console.error('[HashDB] Failed to get all hashes:', request.error);
      reject(request.error);
    };
  });
}

/**
 * ソースでフィルタしてハッシュを取得
 */
export async function getHashesBySource(source: string): Promise<StockPhotoHash[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('source');
    const request = index.getAll(source);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * ハッシュを削除
 */
export async function deleteHash(hash: string): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(hash);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * データベースをクリア
 */
export async function clearDatabase(): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      console.log('[HashDB] Database cleared');
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * ハッシュの数を取得
 */
export async function getHashCount(): Promise<number> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * マッチカウントを増やす
 */
export async function incrementMatchCount(hash: string): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(hash);

    getRequest.onsuccess = () => {
      const data = getRequest.result;
      if (data) {
        data.matchCount = (data.matchCount || 0) + 1;
        store.put(data);
      }
      resolve();
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * 初期シードデータを投入（よく知られたストック画像のハッシュ）
 * これらは代表的なパターンのプレースホルダー
 */
export async function seedInitialData(): Promise<void> {
  const count = await getHashCount();
  if (count > 0) {
    console.log('[HashDB] Database already has data, skipping seed');
    return;
  }

  console.log('[HashDB] Seeding initial data...');

  // 初期シードデータ（実際の運用では、より多くのハッシュを追加）
  const seedHashes: StockPhotoHash[] = [
    // プレースホルダー - 実際のストック画像ハッシュに置き換え
    // これらは例示目的
  ];

  if (seedHashes.length > 0) {
    await addHashes(seedHashes);
  }

  console.log('[HashDB] Seed complete');
}

/**
 * データベース統計を取得
 */
export async function getDatabaseStats(): Promise<{
  totalHashes: number;
  bySource: Record<string, number>;
}> {
  const hashes = await getAllHashes();
  const bySource: Record<string, number> = {};

  for (const hash of hashes) {
    bySource[hash.source] = (bySource[hash.source] || 0) + 1;
  }

  return {
    totalHashes: hashes.length,
    bySource,
  };
}
