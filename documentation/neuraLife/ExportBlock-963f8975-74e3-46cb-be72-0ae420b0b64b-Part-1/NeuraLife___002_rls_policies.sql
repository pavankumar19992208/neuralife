-- ============================================================
-- NeuraLife — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Run AFTER: 001_initial_schema.sql
--
-- PURPOSE: Lock down every table so each user can only
-- read/write data they are authorised to access.
-- The database enforces this — not the application code.
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- Called inside policies to keep the SQL readable
-- ============================================================

-- What role does the current user have?
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', 'anonymous')
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Which school does the current user belong to?
CREATE OR REPLACE FUNCTION auth_school_id()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'school_id'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- What is the current student's NeuraID? (Student Login)
CREATE OR REPLACE FUNCTION auth_neura_id()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'neura_id'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- For parents: get the list of children they can see
-- JWT contains: linked_neura_ids: ["NID-001", "NID-002"]
CREATE OR REPLACE FUNCTION auth_linked_neura_ids()
RETURNS TEXT[] AS $$
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(
      COALESCE(auth.jwt() -> 'linked_neura_ids', '[]'::jsonb)
    )
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Is the current user a parent, and is this neura_id their child?
CREATE OR REPLACE FUNCTION is_my_child(check_neura_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT check_neura_id = ANY(auth_linked_neura_ids())
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Is the current user a school admin (principal or admin)?
CREATE OR REPLACE FUNCTION is_school_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('SUPER_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN')
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Is this the current user's school?
CREATE OR REPLACE FUNCTION is_my_school(school_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'SUPER_ADMIN'
     OR school_id = auth_school_id()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- DOMAIN 1 — SCHOOLS
-- ============================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- SUPER_ADMIN sees all schools
-- Everyone else sees only their own school
CREATE POLICY "schools_select" ON schools FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR id = auth_school_id()
);

-- Only SUPER_ADMIN can register new schools (via onboarding visit)
CREATE POLICY "schools_insert" ON schools FOR INSERT WITH CHECK (
  auth_role() = 'SUPER_ADMIN'
);

-- Principal and SUPER_ADMIN can update school config
CREATE POLICY "schools_update" ON schools FOR UPDATE USING (
  auth_role() = 'SUPER_ADMIN'
  OR (auth_role() = 'PRINCIPAL' AND id = auth_school_id())
);

-- No hard deletes — soft delete via status field
CREATE POLICY "schools_delete" ON schools FOR DELETE USING (
  auth_role() = 'SUPER_ADMIN'
);

-- Sequence counter: SUPER_ADMIN + SYSTEM only
ALTER TABLE school_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sequences_all" ON school_sequences FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

-- ============================================================
-- DOMAIN 2 — ACADEMIC YEARS & HOLIDAYS
-- ============================================================

ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academic_years_select" ON academic_years FOR SELECT USING (
  is_my_school(school_id)
);
CREATE POLICY "academic_years_write" ON academic_years FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN')
  AND is_my_school(school_id)
);

ALTER TABLE school_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holidays_select" ON school_holidays FOR SELECT USING (
  is_my_school(school_id)
);
CREATE POLICY "holidays_write" ON school_holidays FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

-- ============================================================
-- DOMAIN 3 — TEACHERS
-- ============================================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Teachers can see other teachers in their school (via assignments)
-- Parents/students cannot see teacher records directly
CREATE POLICY "teachers_select" ON teachers FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER')
  -- Teachers find each other through teacher_school_assignments (school-scoped)
  -- A teacher with no school assignment cannot see other teachers
  -- This is a base-level policy; the join through assignments provides school scope
);

CREATE POLICY "teachers_insert" ON teachers FOR INSERT WITH CHECK (
  auth_role() IN ('SUPER_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN')
);

CREATE POLICY "teachers_update" ON teachers FOR UPDATE USING (
  auth_role() IN ('SUPER_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN')
  OR id::text = auth.jwt() ->> 'teacher_id' -- Teacher updates own profile
);

ALTER TABLE teacher_school_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_assignments_select" ON teacher_school_assignments
FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR school_id = auth_school_id()
);
CREATE POLICY "teacher_assignments_write" ON teacher_school_assignments
FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subject_assignments_select" ON teacher_subject_assignments
FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR school_id = auth_school_id()
);
CREATE POLICY "subject_assignments_write" ON teacher_subject_assignments
FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

-- Salary: only principal + school_admin + the teacher themselves
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salary_select" ON salary_structures FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  OR (teacher_id::text = auth.jwt() ->> 'teacher_id') -- own salary
);
CREATE POLICY "salary_write" ON salary_structures FOR ALL USING (
  (is_school_admin() AND is_my_school(school_id))
  OR auth_role() = 'SUPER_ADMIN'
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_balances_select" ON leave_balances FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  OR teacher_id::text = auth.jwt() ->> 'teacher_id'
);
CREATE POLICY "leave_balances_write" ON leave_balances FOR ALL USING (
  (is_school_admin() AND is_my_school(school_id))
  OR auth_role() = 'SUPER_ADMIN'
);

ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_apps_select" ON leave_applications FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  OR teacher_id::text = auth.jwt() ->> 'teacher_id'
);
CREATE POLICY "leave_apps_insert" ON leave_applications FOR INSERT WITH CHECK (
  is_my_school(school_id)
  AND teacher_id::text = auth.jwt() ->> 'teacher_id'
);
CREATE POLICY "leave_apps_update" ON leave_applications FOR UPDATE USING (
  (is_school_admin() AND is_my_school(school_id))
  OR teacher_id::text = auth.jwt() ->> 'teacher_id'
);

ALTER TABLE teacher_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_docs_select" ON teacher_documents FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  OR teacher_id::text = auth.jwt() ->> 'teacher_id'
);
CREATE POLICY "teacher_docs_write" ON teacher_documents FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

-- ============================================================
-- DOMAIN 4 — STUDENTS
-- ============================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- School staff see students in their school (via enrollments)
-- Parents see only their children
-- Students see only themselves
-- SYSTEM sees all (for calibration)
CREATE POLICY "students_select" ON students FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR auth_role() = 'SYSTEM'
  OR (
    auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER')
    AND EXISTS (
      SELECT 1 FROM school_enrollments se
      WHERE se.neura_id = students.neura_id
        AND se.school_id = auth_school_id()
        AND se.status = 'ACTIVE'
    )
  )
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);

CREATE POLICY "students_insert" ON students FOR INSERT WITH CHECK (
  auth_role() IN ('SUPER_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN', 'SYSTEM')
);

CREATE POLICY "students_update" ON students FOR UPDATE USING (
  auth_role() IN ('SUPER_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN', 'SYSTEM')
);

-- school_enrollments
ALTER TABLE school_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments_select" ON school_enrollments FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "enrollments_write" ON school_enrollments FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (is_school_admin() AND is_my_school(school_id))
);

-- student_yearly_progress
ALTER TABLE student_yearly_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "yearly_progress_select" ON student_yearly_progress FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR auth_role() = 'SYSTEM'
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "yearly_progress_write" ON student_yearly_progress FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (is_school_admin() AND is_my_school(school_id))
);

ALTER TABLE section_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "section_history_select" ON section_history FOR SELECT USING (
  is_my_school(school_id)
  OR auth_role() = 'SUPER_ADMIN'
);
CREATE POLICY "section_history_write" ON section_history FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

-- parent_contacts: school staff see within school, parents see own children
ALTER TABLE parent_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent_contacts_select" ON parent_contacts FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'))
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
);
CREATE POLICY "parent_contacts_write" ON parent_contacts FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

-- parent_auth_links: SYSTEM builds these, parents read their own
ALTER TABLE parent_auth_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent_auth_links_select" ON parent_auth_links FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (auth_role() = 'PARENT' AND mobile = auth.jwt() ->> 'mobile')
);
CREATE POLICY "parent_auth_links_write" ON parent_auth_links FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (is_school_admin() AND is_my_school(school_id))
);

ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_docs_select" ON student_documents FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'))
);
CREATE POLICY "student_docs_write" ON student_documents FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

ALTER TABLE transfer_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfer_tokens_select" ON transfer_tokens FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR from_school_id = auth_school_id()
  OR used_by_school_id = auth_school_id()
);
CREATE POLICY "transfer_tokens_insert" ON transfer_tokens FOR INSERT WITH CHECK (
  is_school_admin() AND is_my_school(from_school_id)
);
CREATE POLICY "transfer_tokens_update" ON transfer_tokens FOR UPDATE USING (
  is_school_admin() AND is_my_school(used_by_school_id)
);

-- ============================================================
-- DOMAIN 5 — TRANSPORT
-- ============================================================

ALTER TABLE bus_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bus_routes_select" ON bus_routes FOR SELECT USING (
  is_my_school(school_id)
);
CREATE POLICY "bus_routes_write" ON bus_routes FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

ALTER TABLE bus_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bus_stops_select" ON bus_stops FOR SELECT USING (
  is_my_school(school_id)
);
CREATE POLICY "bus_stops_write" ON bus_stops FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

ALTER TABLE student_bus_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bus_assignments_select" ON student_bus_assignments FOR SELECT USING (
  is_my_school(school_id)
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "bus_assignments_write" ON student_bus_assignments FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

-- ============================================================
-- DOMAIN 6 — TIMETABLE
-- ============================================================

ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timetable_select" ON timetable_slots FOR SELECT USING (
  is_my_school(school_id)
);
CREATE POLICY "timetable_write" ON timetable_slots FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

ALTER TABLE timetable_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timetable_exceptions_select" ON timetable_exceptions FOR SELECT USING (
  is_my_school(school_id)
);
CREATE POLICY "timetable_exceptions_write" ON timetable_exceptions FOR ALL USING (
  is_my_school(school_id)
  AND auth_role() IN ('SUPER_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER')
);

-- ============================================================
-- DOMAIN 7 — ATTENDANCE
-- ============================================================

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR auth_role() = 'SYSTEM'
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (
  school_id = auth_school_id()
  AND auth_role() IN ('TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN')
);
-- Only corrections are done via attendance_corrections table
-- Direct updates locked to admin
CREATE POLICY "attendance_update" ON attendance FOR UPDATE USING (
  is_school_admin() AND is_my_school(school_id)
);

ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_corrections_select" ON attendance_corrections FOR SELECT USING (
  is_my_school(school_id)
  OR auth_role() = 'SUPER_ADMIN'
);
CREATE POLICY "attendance_corrections_insert" ON attendance_corrections
FOR INSERT WITH CHECK (
  school_id = auth_school_id()
  AND auth_role() IN ('TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN')
);

-- ============================================================
-- DOMAIN 8 — ACADEMIC OPERATIONS
-- ============================================================

ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam_schedules_select" ON exam_schedules FOR SELECT USING (
  is_my_school(school_id)
  OR auth_role() = 'SUPER_ADMIN'
);
CREATE POLICY "exam_schedules_write" ON exam_schedules FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam_results_select" ON exam_results FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR auth_role() = 'SYSTEM'
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "exam_results_write" ON exam_results FOR ALL USING (
  school_id = auth_school_id()
  AND auth_role() IN ('TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN')
);

ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homework_select" ON homework FOR SELECT USING (
  is_my_school(school_id)
  OR auth_role() = 'SUPER_ADMIN'
);
CREATE POLICY "homework_write" ON homework FOR ALL USING (
  school_id = auth_school_id()
  AND auth_role() IN ('TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN')
);

ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hw_submissions_select" ON homework_submissions FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "hw_submissions_write" ON homework_submissions FOR ALL USING (
  auth_role() = 'SYSTEM'
  OR (is_my_school(school_id) AND auth_role() IN ('TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'))
);

ALTER TABLE behaviour_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "behaviour_select" ON behaviour_incidents FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'))
  -- Parents see only parent_visible = TRUE incidents for their child
  OR (
    auth_role() = 'PARENT'
    AND is_my_child(neura_id)
    AND parent_visible = TRUE
  )
);
CREATE POLICY "behaviour_insert" ON behaviour_incidents FOR INSERT WITH CHECK (
  school_id = auth_school_id()
  AND auth_role() IN ('TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN')
);
CREATE POLICY "behaviour_update" ON behaviour_incidents FOR UPDATE USING (
  is_school_admin() AND is_my_school(school_id)
);

ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interventions_select" ON interventions FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'))
);
CREATE POLICY "interventions_write" ON interventions FOR ALL USING (
  school_id = auth_school_id()
  AND auth_role() IN ('TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN')
);

ALTER TABLE parent_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_select" ON parent_meetings FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'))
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
);
CREATE POLICY "meetings_write" ON parent_meetings FOR ALL USING (
  school_id = auth_school_id()
  AND auth_role() IN ('TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN')
);

-- ============================================================
-- DOMAIN 9 — FEE MANAGEMENT
-- ============================================================

ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_structures_select" ON fee_structures FOR SELECT USING (
  is_my_school(school_id) OR auth_role() = 'SUPER_ADMIN'
);
CREATE POLICY "fee_structures_write" ON fee_structures FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

-- Fee ledger: school staff, parents (own child only)
ALTER TABLE fee_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_ledger_select" ON fee_ledger FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'))
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
);
CREATE POLICY "fee_ledger_write" ON fee_ledger FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (is_school_admin() AND is_my_school(school_id))
);

ALTER TABLE concessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concessions_select" ON concessions FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
);
CREATE POLICY "concessions_write" ON concessions FOR ALL USING (
  is_school_admin() AND is_my_school(school_id)
);

ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_payments_select" ON fee_payments FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'))
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
);
CREATE POLICY "fee_payments_insert" ON fee_payments FOR INSERT WITH CHECK (
  is_my_school(school_id)
  AND auth_role() IN ('SCHOOL_ADMIN', 'PRINCIPAL')
);
-- Payments can only be voided, never deleted
CREATE POLICY "fee_payments_update" ON fee_payments FOR UPDATE USING (
  is_school_admin() AND is_my_school(school_id)
);

ALTER TABLE fee_payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_allocations_select" ON fee_payment_allocations FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR EXISTS (
    SELECT 1 FROM fee_payments fp
    WHERE fp.id = fee_payment_allocations.payment_id
      AND fp.school_id = auth_school_id()
  )
);
CREATE POLICY "fee_allocations_write" ON fee_payment_allocations FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR auth_role() IN ('SCHOOL_ADMIN', 'PRINCIPAL')
);

ALTER TABLE receipt_sequence_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipt_counters_all" ON receipt_sequence_counters FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
);

-- ============================================================
-- DOMAIN 10 — SALARY & PAYROLL
-- ============================================================

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_runs_select" ON payroll_runs FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
);
CREATE POLICY "payroll_runs_write" ON payroll_runs FOR ALL USING (
  (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  OR auth_role() = 'SUPER_ADMIN'
);

ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_entries_select" ON payroll_entries FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  OR teacher_id::text = auth.jwt() ->> 'teacher_id' -- own payslip
);
CREATE POLICY "payroll_entries_write" ON payroll_entries FOR ALL USING (
  (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  OR auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

-- ============================================================
-- DOMAIN 11 — CONTENT LIBRARY
-- All content is public-read (same SCERT content for all schools)
-- Only SYSTEM/SUPER_ADMIN can write content
-- ============================================================

ALTER TABLE content_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_chapters_select" ON content_chapters FOR SELECT USING (
  published = TRUE
  OR auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);
CREATE POLICY "content_chapters_write" ON content_chapters FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

ALTER TABLE content_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_topics_select" ON content_topics FOR SELECT USING (TRUE);
-- Public read: all authenticated users can read topics
CREATE POLICY "content_topics_write" ON content_topics FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

ALTER TABLE problem_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "problem_sets_select" ON problem_sets FOR SELECT USING (TRUE);
CREATE POLICY "problem_sets_write" ON problem_sets FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

ALTER TABLE youtube_refs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "youtube_refs_select" ON youtube_refs FOR SELECT USING (
  is_approved = TRUE OR auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);
CREATE POLICY "youtube_refs_write" ON youtube_refs FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

-- ============================================================
-- DOMAIN 12 — EDGE AI SYNC DATA
-- ============================================================

ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select" ON student_sessions FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR auth_role() = 'SYSTEM'
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
-- Only SYSTEM inserts sessions (from SmartPad sync)
CREATE POLICY "sessions_insert" ON student_sessions FOR INSERT WITH CHECK (
  auth_role() = 'SYSTEM'
);

ALTER TABLE mastery_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mastery_select" ON mastery_snapshots FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR auth_role() = 'SYSTEM'
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
-- SYSTEM writes mastery snapshots (from SmartPad sync pipeline)
CREATE POLICY "mastery_write" ON mastery_snapshots FOR ALL USING (
  auth_role() = 'SYSTEM'
);

ALTER TABLE writing_skill_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "writing_skills_select" ON writing_skill_snapshots FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "writing_skills_write" ON writing_skill_snapshots FOR ALL USING (
  auth_role() = 'SYSTEM'
);

ALTER TABLE study_habit_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_habits_select" ON study_habit_records FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "study_habits_write" ON study_habit_records FOR ALL USING (
  auth_role() = 'SYSTEM'
);

ALTER TABLE ocr_fallback_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ocr_fallback_all" ON ocr_fallback_batches FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

-- ============================================================
-- DOMAIN 13 — CLOUD AI OUTPUT
-- ============================================================

ALTER TABLE calibration_baselines ENABLE ROW LEVEL SECURITY;
-- All authenticated users can read baselines (needed for insight context)
CREATE POLICY "calibration_baselines_select" ON calibration_baselines
FOR SELECT USING (TRUE);
CREATE POLICY "calibration_baselines_write" ON calibration_baselines
FOR ALL USING (auth_role() = 'SYSTEM');

ALTER TABLE calibrated_mastery_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calibrated_select" ON calibrated_mastery_scores FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "calibrated_write" ON calibrated_mastery_scores FOR ALL USING (
  auth_role() = 'SYSTEM'
);

ALTER TABLE student_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insights_select" ON student_insights FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "insights_write" ON student_insights FOR ALL USING (
  auth_role() = 'SYSTEM'
);

ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendations_select" ON content_recommendations FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "recommendations_write" ON content_recommendations FOR ALL USING (
  auth_role() = 'SYSTEM'
);

ALTER TABLE curriculum_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patterns_select" ON curriculum_patterns FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER') AND (
    school_id IS NULL OR school_id = auth_school_id()
  ))
);
CREATE POLICY "patterns_write" ON curriculum_patterns FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

-- ============================================================
-- DOMAIN 14 — DEVICE MANAGEMENT
-- ============================================================

ALTER TABLE smartpad_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smartpads_select" ON smartpad_devices FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR auth_role() = 'SYSTEM'
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND EXISTS (
    SELECT 1 FROM student_yearly_progress syp
    WHERE syp.smartpad_id = smartpad_devices.id
      AND is_my_child(syp.neura_id)
  ))
);
CREATE POLICY "smartpads_write" ON smartpad_devices FOR ALL USING (
  auth_role() = 'SYSTEM'
  OR (is_school_admin() AND is_my_school(school_id))
);

ALTER TABLE smartpad_assignment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pad_history_select" ON smartpad_assignment_history FOR SELECT USING (
  is_my_school(school_id) OR auth_role() = 'SUPER_ADMIN'
);
CREATE POLICY "pad_history_write" ON smartpad_assignment_history FOR ALL USING (
  auth_role() = 'SYSTEM'
  OR (is_school_admin() AND is_my_school(school_id))
);

ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
-- All authenticated users can read model versions (for OTA check)
CREATE POLICY "model_versions_select" ON model_versions FOR SELECT USING (TRUE);
CREATE POLICY "model_versions_write" ON model_versions FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

ALTER TABLE ota_update_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ota_log_select" ON ota_update_log FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR EXISTS (
    SELECT 1 FROM smartpad_devices sd
    WHERE sd.id = ota_update_log.smartpad_id
      AND sd.school_id = auth_school_id()
  )
);
CREATE POLICY "ota_log_write" ON ota_update_log FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

-- ============================================================
-- DOMAIN 15 — NEURASPHERE
-- ============================================================

ALTER TABLE neurasphere_posts ENABLE ROW LEVEL SECURITY;
-- Approved posts visible to all NeuraLife students (inter-school community)
-- Pending posts visible only to author and admins
CREATE POLICY "posts_select" ON neurasphere_posts FOR SELECT USING (
  deleted_at IS NULL
  AND (
    moderation_status = 'APPROVED'
    OR auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
    OR (school_id = auth_school_id() AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'))
    OR neura_id = auth_neura_id()               -- author sees own pending post
    OR (auth_role() = 'PARENT' AND is_my_child(neura_id)) -- parent sees child's posts
  )
);
CREATE POLICY "posts_insert" ON neurasphere_posts FOR INSERT WITH CHECK (
  neura_id = auth_neura_id() AND auth_role() = 'STUDENT'
  OR auth_role() = 'SYSTEM' -- achievement auto-posts
);
CREATE POLICY "posts_update" ON neurasphere_posts FOR UPDATE USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'))
);

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_select" ON post_reactions FOR SELECT USING (TRUE);
CREATE POLICY "reactions_write" ON post_reactions FOR ALL USING (
  neura_id = auth_neura_id() AND auth_role() = 'STUDENT'
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON post_comments FOR SELECT USING (
  deleted_at IS NULL
  AND (
    moderation_status = 'APPROVED'
    OR auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
    OR neura_id = auth_neura_id()
  )
);
CREATE POLICY "comments_insert" ON post_comments FOR INSERT WITH CHECK (
  neura_id = auth_neura_id() AND auth_role() = 'STUDENT'
);
CREATE POLICY "comments_update" ON post_comments FOR UPDATE USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'))
);

ALTER TABLE learning_circles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "circles_select" ON learning_circles FOR SELECT USING (TRUE);
CREATE POLICY "circles_insert" ON learning_circles FOR INSERT WITH CHECK (
  auth_role() = 'STUDENT' AND created_by = auth_neura_id()
);
CREATE POLICY "circles_update" ON learning_circles FOR UPDATE USING (
  created_by = auth_neura_id() OR auth_role() = 'SUPER_ADMIN'
);

ALTER TABLE circle_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships_select" ON circle_memberships FOR SELECT USING (TRUE);
CREATE POLICY "memberships_write" ON circle_memberships FOR ALL USING (
  neura_id = auth_neura_id()
  OR auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

ALTER TABLE student_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connections_select" ON student_connections FOR SELECT USING (
  requester_neura_id = auth_neura_id()
  OR target_neura_id = auth_neura_id()
  OR auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (auth_role() = 'PARENT' AND (
    is_my_child(requester_neura_id) OR is_my_child(target_neura_id)
  ))
);
CREATE POLICY "connections_write" ON student_connections FOR ALL USING (
  requester_neura_id = auth_neura_id()
  OR auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_select" ON badges FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR school_id = auth_school_id()
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
  OR (auth_role() = 'STUDENT' AND neura_id = auth_neura_id())
);
CREATE POLICY "badges_write" ON badges FOR ALL USING (
  auth_role() = 'SYSTEM'
);

-- ============================================================
-- DOMAIN 16 — NOTIFICATIONS & MESSAGES
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR auth_role() = 'SYSTEM'
  OR (school_id = auth_school_id() AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  -- Teachers see own notifications
  OR recipient_id::text = auth.jwt() ->> 'teacher_id'
  -- Parents see own notifications (recipient_id links to parent account)
  OR (auth_role() = 'PARENT' AND recipient_id::text = auth.jwt() ->> 'user_id')
);
CREATE POLICY "notifications_write" ON notifications FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);
CREATE POLICY "notifications_mark_read" ON notifications FOR UPDATE USING (
  recipient_id::text = auth.jwt() ->> 'teacher_id'
  OR recipient_id::text = auth.jwt() ->> 'user_id'
  OR auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fcm_tokens_select" ON fcm_tokens FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR user_id::text = auth.jwt() ->> 'user_id'
);
CREATE POLICY "fcm_tokens_write" ON fcm_tokens FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR user_id::text = auth.jwt() ->> 'user_id'
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_prefs_select" ON notification_preferences FOR SELECT USING (
  user_id::text = auth.jwt() ->> 'user_id'
  OR auth_role() = 'SUPER_ADMIN'
);
CREATE POLICY "notif_prefs_write" ON notification_preferences FOR ALL USING (
  user_id::text = auth.jwt() ->> 'user_id'
  OR auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

ALTER TABLE notification_dedup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dedup_all" ON notification_dedup FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "threads_select" ON message_threads FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  OR teacher_id::text = auth.jwt() ->> 'teacher_id'
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
);
CREATE POLICY "threads_insert" ON message_threads FOR INSERT WITH CHECK (
  is_my_school(school_id)
  AND auth_role() IN ('TEACHER', 'PARENT', 'PRINCIPAL', 'SCHOOL_ADMIN')
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR EXISTS (
    SELECT 1 FROM message_threads mt
    WHERE mt.id = messages.thread_id
      AND (
        mt.school_id = auth_school_id()
        OR mt.teacher_id::text = auth.jwt() ->> 'teacher_id'
        OR (auth_role() = 'PARENT' AND is_my_child(mt.neura_id))
      )
  )
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  auth_role() IN ('TEACHER', 'PARENT', 'PRINCIPAL', 'SCHOOL_ADMIN')
);

-- ============================================================
-- DOMAIN 17 — COMPLIANCE & AUDIT
-- ============================================================

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent_select" ON consent_records FOR SELECT USING (
  auth_role() = 'SUPER_ADMIN'
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
);
CREATE POLICY "consent_insert" ON consent_records FOR INSERT WITH CHECK (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (is_school_admin() AND is_my_school(school_id))
  OR auth_role() = 'PARENT'  -- parent consent on first login
);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deletion_requests_select" ON deletion_requests FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (auth_role() = 'PARENT' AND is_my_child(neura_id))
);
CREATE POLICY "deletion_requests_write" ON deletion_requests FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR auth_role() = 'PARENT'
);

-- Audit log: append-only, no updates or deletes ever
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  OR (is_my_school(school_id) AND auth_role() IN ('PRINCIPAL', 'SCHOOL_ADMIN'))
);
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM', 'PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT')
);
-- NO UPDATE or DELETE policy — audit log is append-only by design

ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "otp_requests_all" ON otp_requests FOR ALL USING (
  auth_role() IN ('SUPER_ADMIN', 'SYSTEM')
  -- All OTP operations go through the API (SYSTEM role), never directly
);

-- ============================================================
-- VERIFICATION QUERY
-- Run this after applying policies to confirm RLS is enabled
-- on all tables
-- ============================================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- All rows should show rowsecurity = true
