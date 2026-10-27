-- CoverKit D1 schema.
-- Create the database, then run this file once:
--   wrangler d1 create coverkit
--   wrangler d1 execute coverkit --remote --file=schema.sql
-- Safe to re-run: every statement is IF NOT EXISTS.
-- The feedback table below is Parvez's original, kept verbatim;
-- the downloads table is deliberately lean: design + (verified) first student only.

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  rating INTEGER,
  message TEXT NOT NULL,
  contact TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_ip ON feedback(ip_hash, created_at);

-- One row per completed PDF download. Only the first submitted-by person is
-- kept, and only when the name and a valid 10-digit NSU ID look real
-- (verified = 1). Otherwise name/ID stay NULL and verified = 0 (blank or junk).
CREATE TABLE IF NOT EXISTS downloads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  template     TEXT    NOT NULL,                 -- classic, minimal, formal, academic, frame, arch
  theme        TEXT,                             -- mono, nsu, forest, maroon, teal
  student_name TEXT,
  student_id   TEXT,
  verified     INTEGER NOT NULL DEFAULT 0,
  ip_hash      TEXT    NOT NULL DEFAULT '',
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_downloads_created ON downloads (created_at);
CREATE INDEX IF NOT EXISTS idx_downloads_ip_time ON downloads (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_downloads_rank ON downloads (template, verified, student_id);
