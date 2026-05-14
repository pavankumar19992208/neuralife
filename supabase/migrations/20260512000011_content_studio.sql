-- Content Studio tables
-- Stores textbook structure (chapters + topics) and generated AI content
-- Avoids re-parsing the same textbook index PDF every time

-- ── Textbooks ──────────────────────────────────────────────────────
-- One row per unique (board, grade, subject) combination
CREATE TABLE IF NOT EXISTS cs_textbooks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board      TEXT NOT NULL,           -- SCERT_AP | SCERT_TS | NCERT | CBSE | ICSE
  grade      INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
  subject    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board, grade, subject)
);

-- ── Chapters ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cs_chapters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id    UUID NOT NULL REFERENCES cs_textbooks(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title_en       TEXT NOT NULL,
  title_te       TEXT,                -- Telugu title, nullable
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(textbook_id, chapter_number)
);

-- ── Topics ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cs_topics (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id     UUID NOT NULL REFERENCES cs_chapters(id) ON DELETE CASCADE,
  topic_number   INTEGER NOT NULL,
  title_en       TEXT NOT NULL,
  title_te       TEXT,                -- Telugu title, nullable
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chapter_id, topic_number)
);

-- ── Generated Content ──────────────────────────────────────────────
-- One row per (topic, medium). segments is the full 11-segment JSON blob.
CREATE TABLE IF NOT EXISTS cs_generated_content (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id         UUID NOT NULL REFERENCES cs_topics(id) ON DELETE CASCADE,
  medium           TEXT NOT NULL CHECK (medium IN ('ENGLISH', 'TELUGU')),
  segments         JSONB NOT NULL DEFAULT '{}',
  generated_at     TIMESTAMPTZ DEFAULT NOW(),
  last_modified_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by     TEXT DEFAULT 'CONTENT_AGENT',
  audit_status     TEXT NOT NULL DEFAULT 'PENDING'
                   CHECK (audit_status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
  UNIQUE(topic_id, medium)
);

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cs_chapters_textbook ON cs_chapters(textbook_id);
CREATE INDEX IF NOT EXISTS idx_cs_topics_chapter    ON cs_topics(chapter_id);
CREATE INDEX IF NOT EXISTS idx_cs_content_topic     ON cs_generated_content(topic_id);
CREATE INDEX IF NOT EXISTS idx_cs_content_status    ON cs_generated_content(audit_status);

-- ── RLS: allow anon read (internal tool, no auth enforced at DB layer)
ALTER TABLE cs_textbooks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_chapters           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_topics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_generated_content  ENABLE ROW LEVEL SECURITY;

-- Service role has full access (Content Studio API uses service role key)
CREATE POLICY "service_role_all_cs_textbooks"         ON cs_textbooks         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_cs_chapters"          ON cs_chapters          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_cs_topics"            ON cs_topics            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_cs_generated_content" ON cs_generated_content FOR ALL TO service_role USING (true) WITH CHECK (true);
