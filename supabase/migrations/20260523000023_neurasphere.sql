-- NeuraLife — NeuraSphere Moderation System
-- Migration 023: Extend neurasphere_posts, add moderation tables, seed demo data

-- Extend moderation_status enum to support AI scoring and removal statuses
ALTER TYPE moderation_status ADD VALUE 'REMOVED_BY_AI';
ALTER TYPE moderation_status ADD VALUE 'REMOVED_BY_PRINCIPAL';

-- Create AI score enum for content classification
CREATE TYPE ai_score AS ENUM ('SAFE', 'REVIEW', 'REMOVE');

-- Create author type enum for post authorship
CREATE TYPE author_type AS ENUM ('STUDENT', 'PRINCIPAL', 'TEACHER', 'SYSTEM');

-- Create post category enum
CREATE TYPE post_category AS ENUM ('GENERAL', 'STUDY_TIP', 'ACHIEVEMENT', 'ANNOUNCEMENT', 'QUESTION', 'PROJECT');

-- Make neura_id nullable for principal/teacher posts
ALTER TABLE neurasphere_posts ALTER COLUMN neura_id DROP NOT NULL;

-- Extend neurasphere_posts table with new columns for moderation system
ALTER TABLE neurasphere_posts
  ADD COLUMN ai_score ai_score,
  ADD COLUMN ai_confidence NUMERIC(3,2),
  ADD COLUMN ai_category TEXT,
  ADD COLUMN ai_reason TEXT,
  ADD COLUMN ai_checked_at TIMESTAMPTZ,
  ADD COLUMN author_type author_type DEFAULT 'STUDENT',
  ADD COLUMN scheduled_at TIMESTAMPTZ,
  ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN is_cross_school BOOLEAN DEFAULT FALSE,
  ADD COLUMN status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SCHEDULED', 'REMOVED_BY_AI', 'REMOVED_BY_PRINCIPAL', 'DRAFT')),
  ADD COLUMN post_category post_category DEFAULT 'GENERAL';

-- Create post_reports table for community reporting
CREATE TABLE post_reports (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id                 UUID NOT NULL REFERENCES neurasphere_posts(id),
  reported_by_neura_id    TEXT NOT NULL REFERENCES students(neura_id),
  reporter_school_id      TEXT NOT NULL REFERENCES schools(id),
  report_reason           TEXT NOT NULL CHECK (report_reason IN ('INAPPROPRIATE', 'SPAM', 'BULLYING', 'PERSONAL_INFO', 'OTHER')),
  report_details          TEXT,
  status                  TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED')),
  reviewed_by_teacher_id  UUID REFERENCES teachers(id),
  reviewed_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Create moderation_actions table for audit trail
CREATE TABLE moderation_actions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id                 UUID NOT NULL REFERENCES neurasphere_posts(id),
  action                  TEXT NOT NULL CHECK (action IN ('REMOVE', 'RESTORE', 'PIN', 'UNPIN', 'WARN', 'BLOCK', 'APPROVE', 'REJECT')),
  taken_by                TEXT NOT NULL, -- 'SYSTEM' for AI, or teacher_id/principal_id
  taken_by_type           TEXT NOT NULL CHECK (taken_by_type IN ('SYSTEM', 'TEACHER', 'PRINCIPAL')),
  reason                  TEXT,
  action_metadata         JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Create neurasphere_settings table for school-specific configuration
CREATE TABLE neurasphere_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               TEXT NOT NULL REFERENCES schools(id) UNIQUE,
  allow_cross_school      BOOLEAN DEFAULT TRUE,
  require_approval        BOOLEAN DEFAULT FALSE,
  max_posts_per_day       INTEGER DEFAULT 5,
  keyword_blocklist       TEXT[] DEFAULT '{}',
  blocked_posters         TEXT[] DEFAULT '{}', -- neura_ids of users blocked from posting
  posting_hours_start     TIME DEFAULT '06:00:00',
  posting_hours_end       TIME DEFAULT '22:00:00',
  enable_achievements     BOOLEAN DEFAULT TRUE,
  enable_manual_posts     BOOLEAN DEFAULT TRUE,
  enable_photo_posts      BOOLEAN DEFAULT TRUE,
  settings_audit_log      JSONB DEFAULT '[]',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_posts_ai_score ON neurasphere_posts(ai_score) WHERE ai_score IN ('REVIEW', 'REMOVE');
CREATE INDEX idx_posts_author_type ON neurasphere_posts(author_type);
CREATE INDEX idx_posts_status ON neurasphere_posts(status);
CREATE INDEX idx_posts_pinned ON neurasphere_posts(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_posts_scheduled ON neurasphere_posts(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_reports_status ON post_reports(status) WHERE status = 'PENDING';
CREATE INDEX idx_reports_post ON post_reports(post_id);
CREATE INDEX idx_moderation_actions_post ON moderation_actions(post_id);
CREATE INDEX idx_moderation_actions_taken_by ON moderation_actions(taken_by, taken_by_type);

-- RLS Policies

-- Enable RLS on new tables
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE neurasphere_settings ENABLE ROW LEVEL SECURITY;

-- post_reports policies (students can report posts, teachers/principals can view reports)
CREATE POLICY "reports_select" ON post_reports FOR SELECT USING (
  auth_role() IN ('PRINCIPAL', 'TEACHER')
  AND auth_school_id() = reporter_school_id
);

CREATE POLICY "reports_insert" ON post_reports FOR INSERT WITH CHECK (
  auth_role() IN ('STUDENT', 'TEACHER', 'PRINCIPAL')
  AND reported_by_neura_id = auth_neura_id()
  AND reporter_school_id = auth_school_id()
);

-- moderation_actions policies (readable by same school teachers/principals)
CREATE POLICY "moderation_actions_select" ON moderation_actions FOR SELECT USING (
  auth_role() IN ('PRINCIPAL', 'TEACHER')
  AND EXISTS (
    SELECT 1 FROM neurasphere_posts p
    WHERE p.id = post_id AND p.school_id = auth_school_id()
  )
);

CREATE POLICY "moderation_actions_insert" ON moderation_actions FOR INSERT WITH CHECK (
  auth_role() IN ('PRINCIPAL', 'TEACHER')
  AND EXISTS (
    SELECT 1 FROM neurasphere_posts p
    WHERE p.id = post_id AND p.school_id = auth_school_id()
  )
);

-- neurasphere_settings policies (school-specific settings)
CREATE POLICY "settings_select" ON neurasphere_settings FOR SELECT USING (
  school_id = auth_school_id()
);

CREATE POLICY "settings_insert" ON neurasphere_settings FOR INSERT WITH CHECK (
  auth_role() = 'PRINCIPAL'
  AND school_id = auth_school_id()
);

CREATE POLICY "settings_update" ON neurasphere_settings FOR UPDATE USING (
  auth_role() = 'PRINCIPAL'
  AND school_id = auth_school_id()
);

-- Service role bypass policies for background AI moderation
CREATE POLICY "posts_service_all" ON neurasphere_posts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "reports_service_all" ON post_reports FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "moderation_actions_service_all" ON moderation_actions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "settings_service_all" ON neurasphere_settings FOR ALL USING (auth.role() = 'service_role');

-- Insert default settings for demo school
INSERT INTO neurasphere_settings (school_id, allow_cross_school, max_posts_per_day)
VALUES ('SCH-AP-DEMO-0001', TRUE, 5);

-- Seed demo posts data
-- Get the demo academic year ID
DO $$
DECLARE
  demo_school_id TEXT := 'SCH-AP-DEMO-0001';
  demo_student_1 TEXT := 'NID-2025-AP-084291'; -- Arjun Reddy (good student)
  demo_student_2 TEXT := 'NID-2025-AP-084303'; -- Arun Sharma (at-risk student)
  demo_principal_id UUID;
  post_1_id UUID := gen_random_uuid();
  post_2_id UUID := gen_random_uuid();
  post_3_id UUID := gen_random_uuid();
  post_4_id UUID := gen_random_uuid();
BEGIN

  -- Get a teacher ID for demo purposes (will represent principal posts)
  SELECT t.id INTO demo_principal_id
  FROM teachers t
  JOIN teacher_school_assignments tsa ON t.id = tsa.teacher_id
  WHERE tsa.school_id = demo_school_id AND tsa.status = 'ACTIVE'
  LIMIT 1;

  -- Post 1: Safe student achievement post (from good student)
  INSERT INTO neurasphere_posts (
    id, neura_id, school_id, post_type, content_text,
    author_type, ai_score, ai_confidence, ai_category, ai_reason, ai_checked_at,
    status, post_category, moderation_status, published_at, created_at
  ) VALUES (
    post_1_id, demo_student_1, demo_school_id, 'ACHIEVEMENT',
    'Just mastered Quadratic Equations! 🎉 Finally feeling confident with algebra. Practice really does make perfect!',
    'STUDENT', 'SAFE', 0.95, 'EDUCATIONAL_ACHIEVEMENT', 'Positive academic content, appropriate language', NOW() - INTERVAL '2 hours',
    'ACTIVE', 'ACHIEVEMENT', 'APPROVED', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'
  );

  -- Post 2: Safe student study tip (from at-risk student)
  INSERT INTO neurasphere_posts (
    id, neura_id, school_id, post_type, content_text,
    author_type, ai_score, ai_confidence, ai_category, ai_reason, ai_checked_at,
    status, post_category, moderation_status, published_at, created_at
  ) VALUES (
    post_2_id, demo_student_2, demo_school_id, 'MANUAL',
    'Pro tip: Drawing diagrams really helps with geometry problems. Visual learning FTW! 📐',
    'STUDENT', 'SAFE', 0.92, 'STUDY_TIP', 'Helpful educational content, appropriate language', NOW() - INTERVAL '1 day',
    'ACTIVE', 'STUDY_TIP', 'APPROVED', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  );

  -- Post 3: AI-removed post (inappropriate content)
  INSERT INTO neurasphere_posts (
    id, neura_id, school_id, post_type, content_text,
    author_type, ai_score, ai_confidence, ai_category, ai_reason, ai_checked_at,
    status, post_category, moderation_status, created_at
  ) VALUES (
    post_3_id, demo_student_2, demo_school_id, 'MANUAL',
    'That test was so stupid, the teacher doesn''t know anything. Waste of time.',
    'STUDENT', 'REMOVE', 0.93, 'INAPPROPRIATE_LANGUAGE', 'Possible inappropriate language towards authority figure', NOW() - INTERVAL '3 hours',
    'REMOVED_BY_AI', 'GENERAL', 'REJECTED', NOW() - INTERVAL '3 hours'
  );

  -- Post 4: Principal announcement (auto-approved)
  INSERT INTO neurasphere_posts (
    id, neura_id, school_id, post_type, content_text,
    author_type, ai_score, ai_confidence, ai_category, ai_reason, ai_checked_at,
    status, post_category, moderation_status, published_at, created_at, is_pinned
  ) VALUES (
    post_4_id, NULL, demo_school_id, 'MANUAL',
    'Congratulations to all Class 10 students on excellent board exam preparation! Keep up the great work. 🎓',
    'PRINCIPAL', 'SAFE', 0.99, 'OFFICIAL_ANNOUNCEMENT', 'Official school announcement, appropriate content', NOW() - INTERVAL '6 hours',
    'ACTIVE', 'ANNOUNCEMENT', 'APPROVED', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', TRUE
  );

  -- Add some reactions to make posts more realistic
  INSERT INTO post_reactions (post_id, neura_id, reaction_type) VALUES
    (post_1_id, demo_student_2, 'CELEBRATE'),
    (post_2_id, demo_student_1, 'HELPFUL'),
    (post_4_id, demo_student_1, 'LIKE'),
    (post_4_id, demo_student_2, 'LIKE');

  -- Add moderation action for the auto-removed post
  INSERT INTO moderation_actions (post_id, action, taken_by, taken_by_type, reason) VALUES
    (post_3_id, 'REMOVE', 'SYSTEM', 'SYSTEM', 'Auto-removed for inappropriate language towards authority figure');

  -- Add moderation action for principal pin
  INSERT INTO moderation_actions (post_id, action, taken_by, taken_by_type, reason) VALUES
    (post_4_id, 'PIN', demo_principal_id::TEXT, 'PRINCIPAL', 'Pinned important school announcement');

END $$;

-- Update trigger for neurasphere_settings updated_at
CREATE OR REPLACE FUNCTION update_neurasphere_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_neurasphere_settings_updated_at
    BEFORE UPDATE ON neurasphere_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_neurasphere_settings_updated_at();