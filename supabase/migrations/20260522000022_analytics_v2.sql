-- Migration 022: Analytics Intelligence v2
-- Tables: school_health_scores, school_analytics_narratives, teacher_performance_snapshots,
--         board_exam_results, neuralife_benchmark_stats, user_bookmarks,
--         analytics_share_tokens, school_groups, school_group_memberships
-- ALTER:  student_yearly_progress (is_rte_student, admission_category)

-- ─── Drop (idempotent) ────────────────────────────────────────────────────────
DROP TABLE IF EXISTS school_group_memberships CASCADE;
DROP TABLE IF EXISTS school_groups           CASCADE;
DROP TABLE IF EXISTS analytics_share_tokens  CASCADE;
DROP TABLE IF EXISTS user_bookmarks          CASCADE;
DROP TABLE IF EXISTS neuralife_benchmark_stats CASCADE;
DROP TABLE IF EXISTS board_exam_results      CASCADE;
DROP TABLE IF EXISTS teacher_performance_snapshots CASCADE;
DROP TABLE IF EXISTS school_analytics_narratives   CASCADE;
DROP TABLE IF EXISTS school_health_scores    CASCADE;

-- ─── school_health_scores ────────────────────────────────────────────────────
CREATE TABLE school_health_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  computed_date     DATE NOT NULL,
  overall_score     NUMERIC(5,2) NOT NULL,
  mastery_score     NUMERIC(5,2),
  attendance_score  NUMERIC(5,2),
  engagement_score  NUMERIC(5,2),
  at_risk_resolution NUMERIC(5,2),
  operational_score NUMERIC(5,2),
  score_delta_30d   NUMERIC(6,2),
  band              TEXT NOT NULL CHECK (band IN ('EXCELLENT','GOOD','NEEDS_ATTENTION','CRITICAL')),
  driver_positives  TEXT[] NOT NULL DEFAULT '{}',
  driver_negatives  TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, computed_date)
);
CREATE INDEX idx_health_scores_school ON school_health_scores(school_id, computed_date DESC);

-- ─── school_analytics_narratives ─────────────────────────────────────────────
CREATE TABLE school_analytics_narratives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  month_year      TEXT NOT NULL,   -- '2026-05'
  neura_id        TEXT REFERENCES students(neura_id) ON DELETE CASCADE,
  narrative_text  TEXT NOT NULL,
  key_insights    TEXT[] NOT NULL DEFAULT '{}',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refresh_count   INT  NOT NULL DEFAULT 0
);
-- School-level narrative: one per month (neura_id IS NULL)
CREATE UNIQUE INDEX idx_narratives_school_month
  ON school_analytics_narratives(school_id, month_year)
  WHERE neura_id IS NULL;
-- Student narrative: one per student per month
CREATE UNIQUE INDEX idx_narratives_student_month
  ON school_analytics_narratives(school_id, month_year, neura_id)
  WHERE neura_id IS NOT NULL;

-- ─── teacher_performance_snapshots ───────────────────────────────────────────
CREATE TABLE teacher_performance_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  school_id         TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  snapshot_month    TEXT NOT NULL,   -- '2026-05'
  subject           TEXT NOT NULL,
  classes_taught    TEXT[] NOT NULL DEFAULT '{}',
  student_count     INT  NOT NULL DEFAULT 0,
  avg_mastery_score NUMERIC(5,2),
  vs_school_avg     NUMERIC(6,2),
  mastery_velocity  NUMERIC(6,2),
  engagement_rate   NUMERIC(5,2),
  at_risk_count     INT  NOT NULL DEFAULT 0,
  intervention_rate NUMERIC(5,2),
  context_flags     TEXT[] NOT NULL DEFAULT '{}',
  ai_insight        TEXT,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, snapshot_month, subject)
);
CREATE INDEX idx_teacher_perf_school_month ON teacher_performance_snapshots(school_id, snapshot_month);

-- ─── board_exam_results ──────────────────────────────────────────────────────
CREATE TABLE board_exam_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  neura_id         TEXT NOT NULL REFERENCES students(neura_id) ON DELETE CASCADE,
  subject          TEXT NOT NULL,
  marks            NUMERIC(5,2) NOT NULL,
  max_marks        NUMERIC(5,2) NOT NULL DEFAULT 100,
  grade            TEXT,
  exam_year        INT  NOT NULL,
  uploaded_by      UUID REFERENCES auth.users(id),
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, neura_id, subject, exam_year)
);
CREATE INDEX idx_board_results_school_year ON board_exam_results(school_id, exam_year);

-- ─── neuralife_benchmark_stats ───────────────────────────────────────────────
CREATE TABLE neuralife_benchmark_stats (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board        TEXT NOT NULL,
  state        TEXT NOT NULL,
  size_bucket  TEXT NOT NULL CHECK (size_bucket IN ('SMALL','MEDIUM','LARGE')),
  period       TEXT NOT NULL,   -- '2026-05'
  metric       TEXT NOT NULL,
  p25          NUMERIC(8,2) NOT NULL,
  p50          NUMERIC(8,2) NOT NULL,
  p75          NUMERIC(8,2) NOT NULL,
  school_count INT  NOT NULL DEFAULT 0,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(board, state, size_bucket, period, metric)
);

-- ─── user_bookmarks ──────────────────────────────────────────────────────────
CREATE TABLE user_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  title       TEXT NOT NULL,
  icon        TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, url)
);
CREATE INDEX idx_bookmarks_teacher ON user_bookmarks(teacher_id, sort_order);

-- ─── analytics_share_tokens ──────────────────────────────────────────────────
CREATE TABLE analytics_share_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  url_path     TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_by   UUID REFERENCES auth.users(id),
  access_count INT  NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_share_tokens_token ON analytics_share_tokens(token);

-- ─── school_groups ────────────────────────────────────────────────────────────
CREATE TABLE school_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE school_group_memberships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES school_groups(id) ON DELETE CASCADE,
  school_id  TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, school_id)
);

-- ─── student_yearly_progress extensions ──────────────────────────────────────
ALTER TABLE student_yearly_progress
  ADD COLUMN IF NOT EXISTS is_rte_student    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admission_category TEXT;

-- ─── RLS (service_role full access on all new tables) ────────────────────────
ALTER TABLE school_health_scores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_analytics_narratives   ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_exam_results            ENABLE ROW LEVEL SECURITY;
ALTER TABLE neuralife_benchmark_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_share_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_groups                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_group_memberships      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_school_health_scores"
  ON school_health_scores FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_school_analytics_narratives"
  ON school_analytics_narratives FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_teacher_performance_snapshots"
  ON teacher_performance_snapshots FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_board_exam_results"
  ON board_exam_results FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_neuralife_benchmark_stats"
  ON neuralife_benchmark_stats FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_user_bookmarks"
  ON user_bookmarks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_analytics_share_tokens"
  ON analytics_share_tokens FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_school_groups"
  ON school_groups FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_school_group_memberships"
  ON school_group_memberships FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─── Seed: 12-month health score history ─────────────────────────────────────
DO $$
DECLARE
  v_school TEXT := 'SCH-AP-DEMO-0001';
  i        INT;
  v_score  NUMERIC;
  v_date   DATE;
BEGIN
  FOR i IN REVERSE 11..0 LOOP
    v_date  := (CURRENT_DATE - (i * 30)::INT)::DATE;
    v_score := ROUND((65 + (11 - i) * 1.4 + (RANDOM() * 3 - 1.5))::NUMERIC, 2);
    INSERT INTO school_health_scores (
      school_id, computed_date, overall_score,
      mastery_score, attendance_score, engagement_score,
      at_risk_resolution, operational_score, score_delta_30d, band,
      driver_positives, driver_negatives
    ) VALUES (
      v_school, v_date, v_score,
      ROUND((58 + (11-i)*1.8)::NUMERIC, 2),
      ROUND((84 + RANDOM()*6)::NUMERIC, 2),
      ROUND((68 + (11-i)*1.0)::NUMERIC, 2),
      ROUND((52 + (11-i)*2.1)::NUMERIC, 2),
      ROUND((71 + RANDOM()*4)::NUMERIC, 2),
      CASE WHEN i < 11 THEN ROUND((1.2 + RANDOM()*2)::NUMERIC, 2) ELSE 0 END,
      CASE
        WHEN v_score >= 85 THEN 'EXCELLENT'
        WHEN v_score >= 70 THEN 'GOOD'
        WHEN v_score >= 55 THEN 'NEEDS_ATTENTION'
        ELSE 'CRITICAL'
      END,
      ARRAY['Attendance holding above 85%','SmartPad sync improving'],
      ARRAY['Fee collection below 80%','7 AT_RISK students unintervened']
    ) ON CONFLICT (school_id, computed_date) DO NOTHING;
  END LOOP;
END $$;

-- ─── Seed: Teacher performance snapshots ─────────────────────────────────────
DO $$
DECLARE
  v_month  TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  v_school TEXT := 'SCH-AP-DEMO-0001';
BEGIN
  -- K. Suresh Kumar — Mathematics
  INSERT INTO teacher_performance_snapshots (
    teacher_id, school_id, snapshot_month, subject,
    classes_taught, student_count, avg_mastery_score, vs_school_avg,
    mastery_velocity, engagement_rate, at_risk_count, intervention_rate,
    context_flags, ai_insight
  ) VALUES (
    '11000000-0000-0000-0000-000000000001', v_school, v_month, 'MATHEMATICS',
    ARRAY['10-A','10-B','9-A','9-B'], 168, 71.5, 9.8,
    3.2, 4.2, 7, 71.4,
    ARRAY[]::TEXT[],
    'Students show above-average mastery in Algebra and Geometry but consistently below average in Trigonometry across all 4 classes — suggests pacing rather than student factors.'
  ) ON CONFLICT (teacher_id, snapshot_month, subject) DO NOTHING;

  -- P. Venkat Rao — Physical Science
  INSERT INTO teacher_performance_snapshots (
    teacher_id, school_id, snapshot_month, subject,
    classes_taught, student_count, avg_mastery_score, vs_school_avg,
    mastery_velocity, engagement_rate, at_risk_count, intervention_rate,
    context_flags, ai_insight
  ) VALUES (
    '11000000-0000-0000-0000-000000000002', v_school, v_month, 'PHYSICAL_SCIENCE',
    ARRAY['9-A','9-B','10-C'], 126, 58.2, -3.5,
    1.1, 2.8, 12, 41.7,
    ARRAY[]::TEXT[],
    'Students struggle with numerical problems but perform well on conceptual questions — formula application methodology may need review across all three classes.'
  ) ON CONFLICT (teacher_id, snapshot_month, subject) DO NOTHING;
END $$;

-- ─── Seed: Benchmark stats (4 metrics, SCERT_AP / AP / MEDIUM) ───────────────
DO $$
DECLARE
  v_month TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
BEGIN
  INSERT INTO neuralife_benchmark_stats (board, state, size_bucket, period, metric, p25, p50, p75, school_count)
  VALUES
    ('SCERT_AP','AP','MEDIUM', v_month, 'mastery_avg',    58.0, 64.0, 71.0, 12),
    ('SCERT_AP','AP','MEDIUM', v_month, 'attendance_avg', 82.0, 87.0, 92.0, 12),
    ('SCERT_AP','AP','MEDIUM', v_month, 'fee_collection', 68.0, 76.0, 85.0, 12),
    ('SCERT_AP','AP','MEDIUM', v_month, 'health_score',   62.0, 70.0, 78.0, 12)
  ON CONFLICT (board, state, size_bucket, period, metric) DO NOTHING;
END $$;
