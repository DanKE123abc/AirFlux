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
  r2_key TEXT,
  files TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pickup_codes_code ON pickup_codes(code);
CREATE INDEX IF NOT EXISTS idx_pickup_codes_expires_at ON pickup_codes(expires_at);
