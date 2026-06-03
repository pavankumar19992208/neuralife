import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

export interface StudentDraft {
  neuraId: string;
  name: string;
  rollNumber?: number;
  photoUrl?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  reason?: string;
}

export class AttendanceDraft extends Model {
  static table = 'attendance_drafts';

  @field('school_id')       schoolId!: string;
  @field('class_year')      classYear!: number;
  @field('section')         section!: string;
  @field('attendance_date') attendanceDate!: string;
  @field('draft_json')      draftJson!: string;
  @field('is_submitted')    isSubmitted!: boolean;
  @field('submitted_at')    submittedAt!: string | null;
  @field('updated_at')      updatedAt!: number;

  get students(): StudentDraft[] {
    try { return JSON.parse(this.draftJson); }
    catch { return []; }
  }
}
