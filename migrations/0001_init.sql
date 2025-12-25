-- 薬の状態管理テーブル
CREATE TABLE IF NOT EXISTS medicine_status (
  remaining INTEGER DEFAULT 28,
  last_taken_at TEXT
);

-- 履歴テーブル
CREATE TABLE IF NOT EXISTS medicine_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taken_at TEXT NOT NULL,
  action TEXT NOT NULL
);

-- 初期データ
INSERT INTO medicine_status (remaining, last_taken_at) VALUES (12, NULL);
