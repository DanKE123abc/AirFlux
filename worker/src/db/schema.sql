CREATE TABLE IF NOT EXISTS pickup_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK(mode IN ('p2p', '1h', '5h', '12h', '24h', '72h')),
  peer_id TEXT,
  note TEXT,
  text_content TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  files TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pickup_codes_code ON pickup_codes(code);
CREATE INDEX IF NOT EXISTS idx_pickup_codes_expires_at ON pickup_codes(expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
