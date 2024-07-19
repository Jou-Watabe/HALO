// Dexieの初期化
const db_his = new Dexie("HALOdb");

// データベースのバージョンとテーブル（ストア）の定義
db_his.version(1).stores({
  searchHistory: "++id, visitTime, event, title, url, tabId, tabTitle, keyword"
});

db_his.version(2).stores({
    notes: '++id,timestamp,action,position,character'
});

db_his.version(3).stores({
  speeches: "++id,timestamp,content"
});
