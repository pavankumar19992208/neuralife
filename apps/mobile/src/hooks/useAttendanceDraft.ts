import {useCallback} from 'react';
import {Q} from '@nozbe/watermelondb';
import {getDatabase} from '@db/index';
import {AttendanceDraft, type StudentDraft} from '@db/models/AttendanceDraft';

export interface DraftKey {
  schoolId: string;
  classYear: number;
  section: string;
  attendanceDate: string; // 'YYYY-MM-DD'
}

export function useAttendanceDraft() {

  const findDraft = useCallback(async (key: DraftKey) => {
    const col = getDatabase().collections.get<AttendanceDraft>('attendance_drafts');
    const rows = await col.query(
      Q.where('school_id',       key.schoolId),
      Q.where('class_year',      key.classYear),
      Q.where('section',         key.section),
      Q.where('attendance_date', key.attendanceDate),
    ).fetch();
    return rows[0] ?? null;
  }, []);

  /** Call on every student status toggle — WatermelonDB write is ~1ms. */
  const saveDraft = useCallback(async (
    key: DraftKey,
    students: StudentDraft[],
  ): Promise<void> => {
    const col = getDatabase().collections.get<AttendanceDraft>('attendance_drafts');
    const existing = await findDraft(key);
    const jsonStr = JSON.stringify(students);
    const now = Date.now();

    await getDatabase().write(async () => {
      if (existing) {
        await existing.update(d => {
          d.draftJson   = jsonStr;
          d.updatedAt   = now;
          d.isSubmitted = false;
        });
      } else {
        await col.create(d => {
          d.schoolId        = key.schoolId;
          d.classYear       = key.classYear;
          d.section         = key.section;
          d.attendanceDate  = key.attendanceDate;
          d.draftJson       = jsonStr;
          d.isSubmitted     = false;
          d.submittedAt     = null;
          d.updatedAt       = now;
        });
      }
    });
  }, [findDraft]);

  const loadDraft = useCallback(async (
    key: DraftKey,
  ): Promise<StudentDraft[] | null> => {
    const row = await findDraft(key);
    if (!row || row.isSubmitted) return null;
    const students = row.students;
    return students.length > 0 ? students : null;
  }, [findDraft]);

  const markSubmitted = useCallback(async (
    key: DraftKey,
    submittedAt: string,
  ): Promise<void> => {
    const row = await findDraft(key);
    if (!row) return;
    await getDatabase().write(async () => {
      await row.update(d => {
        d.isSubmitted = true;
        d.submittedAt = submittedAt;
        d.updatedAt   = Date.now();
      });
    });
  }, [findDraft]);

  return {saveDraft, loadDraft, markSubmitted};
}
